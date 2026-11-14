use crate::state::{atomic_write_bytes, from_wide_slice, read_file_description, SharedState};
use crate::system_stats::get_clipboard_text;
use chrono::{Duration as ChronoDuration, Utc};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

#[cfg(windows)]
use windows::Win32::{
    Foundation::{CloseHandle, MAX_PATH},
    System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT, PROCESS_QUERY_LIMITED_INFORMATION},
    UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId},
};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SourceMetadata {
    pub app_name: Option<String>,
    pub window_title: Option<String>,
    pub url: Option<String>,
    pub process_name: Option<String>,
    pub pid: u32,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteItem {
    pub id: String,
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub is_pinned: bool,
    #[serde(default)]
    pub is_archived: bool,
    #[serde(default)]
    pub source_metadata: Option<SourceMetadata>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NoteDraft {
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub note_id: Option<String>,
    #[serde(default)]
    pub saved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagCount {
    pub tag: String,
    pub count: usize,
}

static NOTES_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));
static UNDO_BUFFER: Lazy<Mutex<Option<(usize, NoteItem)>>> = Lazy::new(|| Mutex::new(None));

fn notes_path(state: &SharedState) -> PathBuf {
    state.data_dir.join("notes.json")
}

fn notes_bak_path(state: &SharedState) -> PathBuf {
    state.data_dir.join("notes.json.bak")
}

fn draft_path(state: &SharedState) -> PathBuf {
    state.data_dir.join("draft-recovery.json")
}

fn load_notes_from_disk(state: &SharedState) -> Vec<NoteItem> {
    let primary = notes_path(state);
    if let Ok(raw) = fs::read_to_string(&primary) {
        if let Ok(items) = serde_json::from_str::<Vec<NoteItem>>(&raw) {
            return items;
        }
    }

    let backup = notes_bak_path(state);
    if let Ok(raw) = fs::read_to_string(&backup) {
        if let Ok(items) = serde_json::from_str::<Vec<NoteItem>>(&raw) {
            let _ = fs::copy(&backup, &primary);
            return items;
        }
    }

    Vec::new()
}

fn persist_notes_to_disk(state: &SharedState, notes: &[NoteItem]) -> Result<(), String> {
    let primary = notes_path(state);
    let backup = notes_bak_path(state);
    if primary.exists() {
        let _ = fs::copy(&primary, &backup);
    }
    let bytes = serde_json::to_vec_pretty(notes).map_err(|e| format!("Serialize notes: {e}"))?;
    atomic_write_bytes(&primary, &bytes)
}

fn sort_notes(notes: &mut [NoteItem]) {
    notes.sort_by(|a, b| {
        b.is_pinned
            .cmp(&a.is_pinned)
            .then_with(|| b.updated_at.cmp(&a.updated_at))
    });
}

/// Extract valid `#hashtags` while filtering out code blocks, URLs, pure digits, and hex color codes.
pub fn extract_hashtags(content: &str) -> Vec<String> {
    const HEX_WORDS: &[&str] = &["cafe", "beef", "dead", "deaf", "fade", "babe", "face", "bead"];

    // Strip fenced code blocks and inline code spans
    let mut cleaned = String::with_capacity(content.len());
    let mut in_fence = false;
    for line in content.lines() {
        let t = line.trim_start();
        if t.starts_with("```") {
            in_fence = !in_fence;
            cleaned.push('\n');
            continue;
        }
        if !in_fence {
            let mut in_inline = false;
            for ch in line.chars() {
                if ch == '`' {
                    in_inline = !in_inline;
                    cleaned.push(' ');
                } else if !in_inline {
                    cleaned.push(ch);
                }
            }
            cleaned.push('\n');
        }
    }

    let mut seen = HashSet::new();
    let mut tags = Vec::new();

    for token in cleaned.split_whitespace() {
        if token.contains("://") || token.starts_with("www.") {
            continue;
        }
        if let Some(rest) = token.strip_prefix('#') {
            let tag_raw: String = rest
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
                .collect();
            let tag = tag_raw.trim_matches('-').to_lowercase();
            if tag.is_empty() || tag.len() > 40 {
                continue;
            }
            if tag.chars().all(|c| c.is_ascii_digit()) {
                continue;
            }
            // Skip CSS hex colors unless it's a recognized English hex word
            if (tag.len() == 3 || tag.len() == 4 || tag.len() == 6 || tag.len() == 8)
                && tag.chars().all(|c| c.is_ascii_hexdigit())
                && !HEX_WORDS.contains(&tag.as_str())
            {
                continue;
            }
            if seen.insert(tag.clone()) {
                tags.push(tag);
            }
        }
    }

    tags
}

fn derive_title(explicit: Option<&str>, content: &str) -> String {
    if let Some(t) = explicit.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        return t.chars().take(80).collect();
    }
    for line in content.lines() {
        let cleaned = line
            .trim()
            .trim_start_matches(['#', '-', '*', '>', ' '])
            .trim();
        if !cleaned.is_empty() {
            return cleaned.chars().take(50).collect();
        }
    }
    "Untitled Note".to_string()
}

fn filter_notes(notes: Vec<NoteItem>, filter: Option<&str>, options: Option<&Value>) -> Vec<NoteItem> {
    let filter_mode = filter.unwrap_or("all").trim().to_lowercase();
    let tag_filter = options
        .and_then(|o| o.get("tag"))
        .and_then(|v| v.as_str())
        .map(|s| s.trim().trim_start_matches('#').to_lowercase())
        .filter(|s| !s.is_empty());

    let mut out: Vec<NoteItem> = notes
        .into_iter()
        .filter(|n| match filter_mode.as_str() {
            "everything" => true,
            "archived" => n.is_archived,
            "pinned" => n.is_pinned && !n.is_archived,
            _ => !n.is_archived,
        })
        .filter(|n| {
            if let Some(ref tf) = tag_filter {
                n.tags.iter().any(|t| t.eq_ignore_ascii_case(tf))
            } else {
                true
            }
        })
        .collect();

    sort_notes(&mut out);
    out
}

#[tauri::command]
pub fn notes_get_all(
    state: tauri::State<'_, SharedState>,
    filter: Option<String>,
    options: Option<Value>,
) -> Vec<NoteItem> {
    let _lock = NOTES_LOCK.lock();
    let notes = load_notes_from_disk(&state);
    filter_notes(notes, filter.as_deref(), options.as_ref())
}

#[tauri::command]
pub fn notes_save(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    note: Value,
) -> Result<NoteItem, String> {
    let content = note
        .get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let explicit_title = note.get("title").and_then(|v| v.as_str());
    let id_opt = note
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let mut manual_tags: Vec<String> = note
        .get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|t| t.as_str())
                .map(|s| s.trim().trim_start_matches('#').to_lowercase())
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_default();

    let extracted = extract_hashtags(&content);
    let mut seen: HashSet<String> = manual_tags.iter().cloned().collect();
    for tag in extracted {
        if seen.insert(tag.clone()) {
            manual_tags.push(tag);
        }
    }

    let source_metadata = note
        .get("sourceMetadata")
        .and_then(|v| serde_json::from_value::<SourceMetadata>(v.clone()).ok());

    let now = Utc::now().to_rfc3339();
    let _lock = NOTES_LOCK.lock();
    let mut notes = load_notes_from_disk(&state);

    let saved = if let Some(ref existing_id) = id_opt {
        if let Some(existing) = notes.iter_mut().find(|n| &n.id == existing_id) {
            existing.title = derive_title(explicit_title, &content);
            existing.content = content;
            existing.tags = manual_tags;
            if let Some(p) = note.get("isPinned").and_then(|v| v.as_bool()) {
                existing.is_pinned = p;
            }
            if let Some(a) = note.get("isArchived").and_then(|v| v.as_bool()) {
                existing.is_archived = a;
            }
            if source_metadata.is_some() {
                existing.source_metadata = source_metadata;
            }
            existing.updated_at = now;
            existing.clone()
        } else {
            let item = NoteItem {
                id: existing_id.clone(),
                title: derive_title(explicit_title, &content),
                content,
                tags: manual_tags,
                is_pinned: note.get("isPinned").and_then(|v| v.as_bool()).unwrap_or(false),
                is_archived: note.get("isArchived").and_then(|v| v.as_bool()).unwrap_or(false),
                source_metadata,
                created_at: now.clone(),
                updated_at: now,
            };
            notes.insert(0, item.clone());
            item
        }
    } else {
        let item = NoteItem {
            id: uuid::Uuid::new_v4().to_string(),
            title: derive_title(explicit_title, &content),
            content,
            tags: manual_tags,
            is_pinned: note.get("isPinned").and_then(|v| v.as_bool()).unwrap_or(false),
            is_archived: note.get("isArchived").and_then(|v| v.as_bool()).unwrap_or(false),
            source_metadata,
            created_at: now.clone(),
            updated_at: now,
        };
        notes.insert(0, item.clone());
        item
    };

    persist_notes_to_disk(&state, &notes)?;
    let _ = app.emit("notes:updated", &saved);
    Ok(saved)
}

#[tauri::command]
pub fn notes_delete(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    id: String,
) -> Result<bool, String> {
    let _lock = NOTES_LOCK.lock();
    let mut notes = load_notes_from_disk(&state);
    if let Some(idx) = notes.iter().position(|n| n.id == id) {
        let removed = notes.remove(idx);
        if let Ok(mut undo) = UNDO_BUFFER.lock() {
            *undo = Some((idx, removed));
        }
        persist_notes_to_disk(&state, &notes)?;
        let _ = app.emit("notes:updated", json!({ "deleted": id }));
        return Ok(true);
    }
    Ok(false)
}

#[tauri::command]
pub fn notes_undo_delete(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
) -> Result<Option<NoteItem>, String> {
    let entry = UNDO_BUFFER.lock().ok().and_then(|mut g| g.take());
    let Some((idx, item)) = entry else {
        return Ok(None);
    };

    let _lock = NOTES_LOCK.lock();
    let mut notes = load_notes_from_disk(&state);
    if !notes.iter().any(|n| n.id == item.id) {
        let pos = idx.min(notes.len());
        notes.insert(pos, item.clone());
        persist_notes_to_disk(&state, &notes)?;
        let _ = app.emit("notes:updated", &item);
    }
    Ok(Some(item))
}

#[tauri::command]
pub fn notes_toggle_pin(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    id: String,
) -> Result<Option<NoteItem>, String> {
    let _lock = NOTES_LOCK.lock();
    let mut notes = load_notes_from_disk(&state);
    if let Some(n) = notes.iter_mut().find(|n| n.id == id) {
        n.is_pinned = !n.is_pinned;
        n.updated_at = Utc::now().to_rfc3339();
        let clone = n.clone();
        persist_notes_to_disk(&state, &notes)?;
        let _ = app.emit("notes:updated", &clone);
        return Ok(Some(clone));
    }
    Ok(None)
}

#[tauri::command]
pub fn notes_toggle_archive(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    id: String,
) -> Result<Option<NoteItem>, String> {
    let _lock = NOTES_LOCK.lock();
    let mut notes = load_notes_from_disk(&state);
    if let Some(n) = notes.iter_mut().find(|n| n.id == id) {
        n.is_archived = !n.is_archived;
        n.updated_at = Utc::now().to_rfc3339();
        let clone = n.clone();
        persist_notes_to_disk(&state, &notes)?;
        let _ = app.emit("notes:updated", &clone);
        return Ok(Some(clone));
    }
    Ok(None)
}

#[tauri::command]
pub fn notes_save_draft(
    state: tauri::State<'_, SharedState>,
    draft: Value,
) -> Result<bool, String> {
    let content = draft
        .get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let title = draft
        .get("title")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let note_id = draft
        .get("noteId")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    if content.trim().is_empty() && title.as_deref().unwrap_or("").trim().is_empty() {
        return notes_clear_draft(state);
    }

    let obj = NoteDraft {
        content,
        title,
        note_id,
        saved_at: Some(Utc::now().to_rfc3339()),
    };
    let bytes = serde_json::to_vec_pretty(&obj).map_err(|e| format!("Serialize draft: {e}"))?;
    atomic_write_bytes(&draft_path(&state), &bytes)?;
    Ok(true)
}

#[tauri::command]
pub fn notes_get_draft(state: tauri::State<'_, SharedState>) -> Option<NoteDraft> {
    let raw = fs::read_to_string(draft_path(&state)).ok()?;
    serde_json::from_str::<NoteDraft>(&raw).ok()
}

#[tauri::command]
pub fn notes_clear_draft(state: tauri::State<'_, SharedState>) -> Result<bool, String> {
    let p = draft_path(&state);
    if p.exists() {
        let _ = fs::remove_file(p);
    }
    Ok(true)
}

#[cfg(windows)]
fn capture_foreground_metadata() -> SourceMetadata {
    let ts = Utc::now().to_rfc3339();
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return SourceMetadata {
                timestamp: ts,
                ..Default::default()
            };
        }
        let mut title_buf = [0u16; 512];
        let t_len = GetWindowTextW(hwnd, &mut title_buf);
        let window_title = if t_len > 0 {
            Some(from_wide_slice(&title_buf[..t_len as usize]))
        } else {
            None
        };

        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        let mut exe_path = String::new();
        if pid > 0 {
            if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                let mut buf = vec![0u16; MAX_PATH as usize * 2];
                let mut len = buf.len() as u32;
                if QueryFullProcessImageNameW(
                    handle,
                    PROCESS_NAME_FORMAT(0),
                    windows::core::PWSTR(buf.as_mut_ptr()),
                    &mut len,
                )
                .is_ok()
                {
                    exe_path = from_wide_slice(&buf[..len as usize]);
                }
                let _ = CloseHandle(handle);
            }
        }

        let process_name = Path::new(&exe_path)
            .file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string());
        let app_name = if !exe_path.is_empty() {
            read_file_description(&exe_path).or_else(|| {
                process_name
                    .as_deref()
                    .map(|p| p.strip_suffix(".exe").unwrap_or(p).to_string())
            })
        } else {
            None
        };

        SourceMetadata {
            app_name,
            window_title,
            url: None,
            process_name,
            pid,
            timestamp: ts,
        }
    }
}

#[tauri::command]
pub fn notes_get_context(_options: Option<Value>) -> Value {
    let mut clip = get_clipboard_text();
    let max_bytes = 5 * 1024 * 1024;
    let mut truncated = false;
    if clip.len() > max_bytes {
        clip = clip.chars().take(500_000).collect();
        truncated = true;
    }

    let is_large = clip.chars().count() > 300 || clip.len() > 1024;
    #[cfg(windows)]
    let source_metadata = capture_foreground_metadata();
    #[cfg(not(windows))]
    let source_metadata = SourceMetadata {
        timestamp: Utc::now().to_rfc3339(),
        ..Default::default()
    };

    let has_content = !clip.trim().is_empty();
    json!({
        "success": has_content,
        "content": clip,
        "sourceMetadata": source_metadata,
        "isLarge": is_large,
        "truncated": truncated
    })
}

#[tauri::command]
pub fn notes_search(
    state: tauri::State<'_, SharedState>,
    query: String,
    options: Option<Value>,
) -> Vec<NoteItem> {
    let _lock = NOTES_LOCK.lock();
    let notes = load_notes_from_disk(&state);
    let q = query.trim().to_lowercase();
    if q.is_empty() {
        return filter_notes(notes, Some("all"), options.as_ref());
    }

    let include_archived = options
        .as_ref()
        .and_then(|o| o.get("includeArchived"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let terms: Vec<&str> = q.split_whitespace().collect();
    let mut scored: Vec<(i64, NoteItem)> = notes
        .into_iter()
        .filter(|n| include_archived || !n.is_archived)
        .filter_map(|n| {
            let title_l = n.title.to_lowercase();
            let content_l = n.content.to_lowercase();
            let tags_l: Vec<String> = n.tags.iter().map(|t| t.to_lowercase()).collect();
            let app_l = n
                .source_metadata
                .as_ref()
                .and_then(|m| m.app_name.as_deref())
                .unwrap_or("")
                .to_lowercase();

            let mut total_score = 0i64;
            for term in &terms {
                if let Some(tag_q) = term.strip_prefix('#') {
                    if !tags_l.iter().any(|t| t.contains(tag_q)) {
                        return None;
                    }
                    total_score += 80;
                    continue;
                }
                if let Some(app_q) = term.strip_prefix("app:") {
                    if !app_l.contains(app_q) {
                        return None;
                    }
                    total_score += 60;
                    continue;
                }

                let mut term_score = 0i64;
                if title_l.contains(term) {
                    term_score += if title_l.starts_with(term) { 100 } else { 70 };
                }
                if tags_l.iter().any(|t| t.contains(term)) {
                    term_score += 55;
                }
                if content_l.contains(term) {
                    term_score += 30;
                }
                if app_l.contains(term) {
                    term_score += 20;
                }
                if term_score == 0 {
                    return None;
                }
                total_score += term_score;
            }

            if n.is_pinned {
                total_score += 25;
            }
            Some((total_score, n))
        })
        .collect();

    scored.sort_by(|a, b| {
        b.0.cmp(&a.0)
            .then_with(|| b.1.updated_at.cmp(&a.1.updated_at))
    });
    scored.into_iter().map(|(_, n)| n).collect()
}

#[tauri::command]
pub fn notes_get_tags(state: tauri::State<'_, SharedState>) -> Vec<TagCount> {
    let _lock = NOTES_LOCK.lock();
    let notes = load_notes_from_disk(&state);
    let mut counts: HashMap<String, usize> = HashMap::new();
    for note in notes {
        for tag in note.tags {
            let clean = tag.trim().to_lowercase();
            if !clean.is_empty() {
                *counts.entry(clean).or_insert(0) += 1;
            }
        }
    }
    let mut result: Vec<TagCount> = counts
        .into_iter()
        .map(|(tag, count)| TagCount { tag, count })
        .collect();
    result.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.tag.cmp(&b.tag)));
    result
}

#[tauri::command]
pub fn notes_convert_to_task(
    state: tauri::State<'_, SharedState>,
    note_or_id: Value,
) -> Result<Value, String> {
    let note_opt: Option<NoteItem> = if let Some(id) = note_or_id.as_str() {
        let _lock = NOTES_LOCK.lock();
        load_notes_from_disk(&state)
            .into_iter()
            .find(|n| n.id == id)
    } else {
        serde_json::from_value::<NoteItem>(note_or_id.clone()).ok()
    };

    let (source_id, raw_title, raw_content, tags) = match note_opt {
        Some(n) => (Some(n.id), n.title, n.content, n.tags),
        None => {
            let content = note_or_id
                .get("content")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let title = note_or_id
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let id = note_or_id
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            (id, title, content, Vec::new())
        }
    };

    let candidate = if !raw_title.trim().is_empty() {
        raw_title.trim().to_string()
    } else {
        raw_content
            .lines()
            .map(|l| l.trim().trim_start_matches(['#', '-', '*', '[', ']', ' ']))
            .find(|l| !l.is_empty())
            .unwrap_or("New Task")
            .to_string()
    };
    let clean_title: String = candidate.chars().take(80).collect();

    let combined_lower = format!("{raw_title} {raw_content}").to_lowercase();
    let due_date = if combined_lower.contains("tomorrow") {
        Some((Utc::now() + ChronoDuration::days(1)).format("%Y-%m-%d").to_string())
    } else if combined_lower.contains("today") {
        Some(Utc::now().format("%Y-%m-%d").to_string())
    } else {
        None
    };

    Ok(json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "title": clean_title,
        "completed": false,
        "sourceNoteId": source_id,
        "tags": tags,
        "dueDate": due_date,
        "createdAt": Utc::now().to_rfc3339()
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashtag_extractor_filters_noise_and_keeps_words() {
        let input = "Check #Work and #todo_2026 in #ff5500 but #cafe stays, ignore `#inline` and https://a.b/#frag and #1234";
        let tags = extract_hashtags(input);
        assert!(tags.contains(&"work".to_string()));
        assert!(tags.contains(&"todo_2026".to_string()));
        assert!(tags.contains(&"cafe".to_string()));
        assert!(!tags.contains(&"ff5500".to_string()));
        assert!(!tags.contains(&"inline".to_string()));
        assert!(!tags.contains(&"frag".to_string()));
        assert!(!tags.contains(&"1234".to_string()));
    }
}
