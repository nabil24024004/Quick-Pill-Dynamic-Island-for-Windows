use crate::state::{atomic_write_bytes, extract_file_icon_data_url, to_wide, IslandBounds, SharedState};
use crate::window_overlay::apply_overlay_styles;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use image::{codecs::png::PngEncoder, ColorType, ImageEncoder};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

#[cfg(windows)]
use windows::{
    core::PCWSTR,
    Win32::{
        Foundation::HWND,
        System::Com::IDataObject,
        System::Ole::{OleInitialize, OleUninitialize, DROPEFFECT_COPY, DROPEFFECT_LINK, DROPEFFECT_MOVE},
        UI::{
            Shell::{
                Common::ITEMIDLIST, ILClone, ILCreateFromPathW, ILFree, ILRemoveLastID,
                IShellFolder, SHBindToParent, SHCreateDataObject, SHDoDragDrop, ShellExecuteW,
            },
            WindowsAndMessaging::SW_SHOWNORMAL,
        },
    },
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShelfItem {
    pub id: String,
    pub name: String,
    pub original_path: String,
    pub staged_path: String,
    pub size: u64,
    pub size_formatted: String,
    pub ext: String,
    pub is_folder: bool,
    pub icon_data_url: Option<String>,
    pub thumbnail_data_url: Option<String>,
    pub added_at: i64,
}

static SHELF_ITEMS: Lazy<Mutex<Vec<ShelfItem>>> = Lazy::new(|| Mutex::new(Vec::new()));

pub fn shelf_staging_dir() -> PathBuf {
    std::env::temp_dir().join("quick-pill-shelf")
}

fn shelf_manifest_path(state: &SharedState) -> PathBuf {
    state.data_dir.join("shelf-items.json")
}

pub fn init_shelf(state: &SharedState) {
    let dir = shelf_staging_dir();
    let _ = fs::create_dir_all(&dir);

    let path = shelf_manifest_path(state);
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(items) = serde_json::from_str::<Vec<ShelfItem>>(&raw) {
            let valid: Vec<ShelfItem> = items
                .into_iter()
                .filter(|it| Path::new(&it.staged_path).exists())
                .collect();
            if let Ok(mut guard) = SHELF_ITEMS.lock() {
                *guard = valid;
            }
        }
    }
}

fn persist_shelf(state: &SharedState, items: &[ShelfItem]) {
    if let Ok(bytes) = serde_json::to_vec_pretty(items) {
        let _ = atomic_write_bytes(&shelf_manifest_path(state), &bytes);
    }
}

pub fn format_bytes(bytes: u64) -> String {
    if bytes < 1024 {
        return format!("{bytes} B");
    }
    let kb = bytes as f64 / 1024.0;
    if kb < 1024.0 {
        return format!("{kb:.1} KB");
    }
    let mb = kb / 1024.0;
    if mb < 1024.0 {
        return format!("{mb:.1} MB");
    }
    let gb = mb / 1024.0;
    format!("{gb:.2} GB")
}

fn copy_dir_recursive(src: &Path, dst: &Path, depth: usize) -> Result<u64, String> {
    if depth > 20 {
        return Ok(0);
    }
    fs::create_dir_all(dst).map_err(|e| format!("Create dir failed: {e}"))?;
    let mut total = 0u64;
    let entries = fs::read_dir(src).map_err(|e| format!("Read dir failed: {e}"))?;
    for entry in entries.flatten() {
        let entry_path = entry.path();
        let target_path = dst.join(entry.file_name());
        if let Ok(meta) = fs::symlink_metadata(&entry_path) {
            if meta.is_dir() {
                total += copy_dir_recursive(&entry_path, &target_path, depth + 1)?;
            } else if meta.is_file() {
                let _ = fs::copy(&entry_path, &target_path);
                total += meta.len();
            }
        }
    }
    Ok(total)
}

fn generate_thumbnail(path: &Path, ext: &str) -> Option<String> {
    if ext == ".svg" {
        if let Ok(meta) = fs::metadata(path) {
            if meta.len() <= 256 * 1024 {
                if let Ok(bytes) = fs::read(path) {
                    return Some(format!(
                        "data:image/svg+xml;base64,{}",
                        BASE64.encode(bytes)
                    ));
                }
            }
        }
        return None;
    }

    let is_raster = matches!(
        ext,
        ".png" | ".jpg" | ".jpeg" | ".webp" | ".gif" | ".bmp" | ".ico"
    );
    if !is_raster {
        return None;
    }

    let meta = fs::metadata(path).ok()?;
    if meta.len() > 25 * 1024 * 1024 {
        return None;
    }

    let img = image::ImageReader::open(path).ok()?.decode().ok()?;
    let thumb = img.thumbnail(160, 160).to_rgba8();
    let mut out = Cursor::new(Vec::new());
    PngEncoder::new(&mut out)
        .write_image(
            thumb.as_raw(),
            thumb.width(),
            thumb.height(),
            ColorType::Rgba8.into(),
        )
        .ok()?;
    Some(format!(
        "data:image/png;base64,{}",
        BASE64.encode(out.into_inner())
    ))
}

#[tauri::command]
pub fn shelf_get_items() -> Vec<ShelfItem> {
    SHELF_ITEMS
        .lock()
        .map(|g| g.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn shelf_add_files(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    file_paths: Vec<String>,
) -> Result<Vec<ShelfItem>, String> {
    let stage_root = shelf_staging_dir();
    fs::create_dir_all(&stage_root).map_err(|e| format!("Shelf mkdir failed: {e}"))?;

    let mut new_items = Vec::new();
    for raw_path in file_paths {
        let src = Path::new(raw_path.trim());
        if !src.exists() {
            continue;
        }
        let Ok(meta) = fs::metadata(src) else {
            continue;
        };
        let is_folder = meta.is_dir();
        let name = src
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("item")
            .to_string();
        let ext = if is_folder {
            String::new()
        } else {
            src.extension()
                .and_then(|e| e.to_str())
                .map(|e| format!(".{}", e.to_lowercase()))
                .unwrap_or_default()
        };

        let id = uuid::Uuid::new_v4().to_string();
        let staged_path = stage_root.join(format!("{}_{}", &id[..8], name));

        let size = if is_folder {
            copy_dir_recursive(src, &staged_path, 0).unwrap_or(0)
        } else {
            fs::copy(src, &staged_path)
                .map(|b| b)
                .unwrap_or_else(|_| meta.len())
        };

        let staged_str = staged_path.to_string_lossy().to_string();
        let thumbnail_data_url = if is_folder {
            None
        } else {
            generate_thumbnail(&staged_path, &ext)
        };
        #[cfg(windows)]
        let icon_data_url = extract_file_icon_data_url(&staged_str, 48, is_folder);
        #[cfg(not(windows))]
        let icon_data_url = None;

        new_items.push(ShelfItem {
            id,
            name,
            original_path: src.to_string_lossy().to_string(),
            staged_path: staged_str,
            size,
            size_formatted: format_bytes(size),
            ext,
            is_folder,
            icon_data_url,
            thumbnail_data_url,
            added_at: Utc::now().timestamp_millis(),
        });
    }

    let snapshot = {
        let mut guard = SHELF_ITEMS.lock().map_err(|e| format!("{e}"))?;
        for item in new_items {
            if !guard.iter().any(|existing| existing.original_path == item.original_path && existing.size == item.size) {
                guard.insert(0, item);
            } else {
                let _ = if item.is_folder {
                    fs::remove_dir_all(&item.staged_path)
                } else {
                    fs::remove_file(&item.staged_path)
                };
            }
        }
        guard.clone()
    };

    persist_shelf(&state, &snapshot);
    let _ = app.emit("shelf:update", &snapshot);
    Ok(snapshot)
}

#[tauri::command]
pub fn shelf_remove_item(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    id: String,
) -> Result<Vec<ShelfItem>, String> {
    let mut removed_paths = Vec::new();
    let snapshot = {
        let mut guard = SHELF_ITEMS.lock().map_err(|e| format!("{e}"))?;
        guard.retain(|item| {
            if item.id == id || item.staged_path == id {
                removed_paths.push((item.staged_path.clone(), item.is_folder));
                false
            } else {
                true
            }
        });
        guard.clone()
    };

    for (path, is_folder) in removed_paths {
        let p = Path::new(&path);
        if p.exists() {
            if is_folder {
                let _ = fs::remove_dir_all(p);
            } else {
                let _ = fs::remove_file(p);
            }
        }
    }

    persist_shelf(&state, &snapshot);
    let _ = app.emit("shelf:update", &snapshot);
    Ok(snapshot)
}

#[tauri::command]
pub fn shelf_clear(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
) -> Result<Vec<ShelfItem>, String> {
    let items_to_delete = {
        let mut guard = SHELF_ITEMS.lock().map_err(|e| format!("{e}"))?;
        let old = guard.clone();
        guard.clear();
        old
    };

    for item in items_to_delete {
        let p = Path::new(&item.staged_path);
        if p.exists() {
            if item.is_folder {
                let _ = fs::remove_dir_all(p);
            } else {
                let _ = fs::remove_file(p);
            }
        }
    }

    let empty: Vec<ShelfItem> = Vec::new();
    persist_shelf(&state, &empty);
    let _ = app.emit("shelf:update", &empty);
    Ok(empty)
}

fn resolve_shelf_path(file_path_or_id: &str) -> Option<String> {
    let trimmed = file_path_or_id.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(guard) = SHELF_ITEMS.lock() {
        if let Some(found) = guard
            .iter()
            .find(|it| it.id == trimmed || it.staged_path == trimmed || it.original_path == trimmed)
        {
            if Path::new(&found.staged_path).exists() {
                return Some(found.staged_path.clone());
            }
            if Path::new(&found.original_path).exists() {
                return Some(found.original_path.clone());
            }
        }
    }
    if Path::new(trimmed).exists() {
        Some(trimmed.to_string())
    } else {
        None
    }
}

#[tauri::command]
pub fn shelf_open_file(file_path_or_id: String) -> Result<bool, String> {
    let path = resolve_shelf_path(&file_path_or_id)
        .ok_or_else(|| "Shelf item not found on disk".to_string())?;
    #[cfg(windows)]
    unsafe {
        let op = to_wide("open");
        let target = to_wide(&path);
        let res = ShellExecuteW(
            HWND::default(),
            PCWSTR(op.as_ptr()),
            PCWSTR(target.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        );
        if (res.0 as isize) <= 32 {
            return Err(format!("Failed to open file: {}", res.0 as isize));
        }
    }
    Ok(true)
}

#[tauri::command]
pub fn shelf_show_in_folder(file_path_or_id: String) -> Result<bool, String> {
    let path = resolve_shelf_path(&file_path_or_id)
        .ok_or_else(|| "Shelf item not found on disk".to_string())?;
    #[cfg(windows)]
    {
        std::process::Command::new("explorer.exe")
            .args([format!("/select,{}", path)])
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {e}"))?;
    }
    Ok(true)
}

#[tauri::command]
pub async fn shelf_start_drag(
    app: AppHandle,
    file_path_or_id: String,
    _island_bounds: Option<IslandBounds>,
) -> Result<bool, String> {
    let path = resolve_shelf_path(&file_path_or_id)
        .ok_or_else(|| "File not found for drag".to_string())?;

    let hwnd_raw = {
        let state = app.state::<SharedState>();
        let mut ov = state.overlay.lock().map_err(|e| format!("{e}"))?;
        ov.is_shelf_drag_out = true;
        ov.ignore_mouse = true;
        ov.cursor_inside_island = false;
        ov.main_hwnd
    };

    #[cfg(windows)]
    apply_overlay_styles(hwnd_raw, true);

    let app_clone = app.clone();
    let result = tokio::task::spawn_blocking(move || {
        #[cfg(windows)]
        let drop_ok = perform_native_ole_drag(&path);
        #[cfg(not(windows))]
        let drop_ok = false;

        let state = app_clone.state::<SharedState>();
        if let Ok(mut ov) = state.overlay.lock() {
            ov.is_shelf_drag_out = false;
            ov.cursor_inside_island = false;
            ov.ignore_mouse = true;
        }
        let _ = app_clone.emit("shelf:drag-ended", json!({ "success": drop_ok }));
        drop_ok
    })
    .await
    .map_err(|e| format!("Drag task join error: {e}"))?;

    Ok(result)
}

#[cfg(windows)]
fn perform_native_ole_drag(file_path: &str) -> bool {
    unsafe {
        if OleInitialize(None).is_err() {
            return false;
        }

        let wide = to_wide(file_path);
        let pidl_full: *mut ITEMIDLIST = ILCreateFromPathW(PCWSTR(wide.as_ptr()));
        if pidl_full.is_null() {
            OleUninitialize();
            return false;
        }

        let mut child_pidl: *mut ITEMIDLIST = std::ptr::null_mut();
        let folder_res: windows::core::Result<IShellFolder> =
            SHBindToParent(pidl_full as *const ITEMIDLIST, Some(&mut child_pidl));

        let ok = if let Ok(_folder) = folder_res {
            let parent_pidl = ILClone(pidl_full as *const ITEMIDLIST);
            let _ = ILRemoveLastID(Some(parent_pidl));
            let child_const = child_pidl as *const ITEMIDLIST;
            let slice = [child_const];
            let res = if !parent_pidl.is_null() {
                if let Ok(data_obj) = SHCreateDataObject::<Option<&IDataObject>, IDataObject>(
                    Some(parent_pidl as *const ITEMIDLIST),
                    Some(&slice),
                    None,
                ) {
                    let allowed = DROPEFFECT_COPY | DROPEFFECT_MOVE | DROPEFFECT_LINK;
                    SHDoDragDrop(HWND::default(), &data_obj, None, allowed).is_ok()
                } else {
                    false
                }
            } else {
                false
            };
            if !parent_pidl.is_null() {
                ILFree(Some(parent_pidl as *const ITEMIDLIST));
            }
            res
        } else {
            false
        };

        ILFree(Some(pidl_full as *const ITEMIDLIST));
        OleUninitialize();
        ok
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn byte_formatting_matches_units() {
        assert_eq!(format_bytes(512), "512 B");
        assert_eq!(format_bytes(1536), "1.5 KB");
        assert_eq!(format_bytes(2 * 1024 * 1024), "2.0 MB");
    }
}
