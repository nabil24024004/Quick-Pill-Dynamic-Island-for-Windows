use crate::launcher::{activate_window_by_query, launch_app_internal};
use crate::state::{atomic_write_bytes, to_wide, SharedState};
use chrono::Utc;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

#[cfg(windows)]
use windows::{
    core::PCWSTR,
    UI::{
        Notifications::{KnownNotificationBindings, NotificationKinds},
        Notifications::Management::{UserNotificationListener, UserNotificationListenerAccessStatus},
    },
    Win32::{
        Foundation::HWND,
        System::Com::{CoInitializeEx, COINIT_MULTITHREADED},
        UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL},
    },
};

const MAX_HISTORY: usize = 100;
const EPOCH_DIFF_100NS: i64 = 116_444_736_000_000_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationAction {
    #[serde(rename = "type")]
    pub action_type: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationItem {
    pub id: String,
    pub win_id: Option<u32>,
    pub app_id: String,
    pub app_name: String,
    pub sender: String,
    pub title: String,
    pub body: String,
    pub display_title: String,
    pub display_body: String,
    pub timestamp: i64,
    pub priority: String,
    pub is_call: bool,
    pub reviewed: bool,
    pub dismissed: bool,
    pub snooze_until: Option<i64>,
    pub group_id: Option<String>,
    pub actions: Vec<NotificationAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationGroup {
    pub id: String,
    pub app_name: String,
    pub count: usize,
    pub items: Vec<NotificationItem>,
    pub latest_timestamp: i64,
    pub priority: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettings {
    #[serde(default)]
    pub hide_previews: bool,
    #[serde(default)]
    pub excluded_apps: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationStats {
    pub total_active: usize,
    pub unreviewed_count: usize,
    pub snoozed_count: usize,
    pub critical_count: usize,
    pub history_count: usize,
    pub has_undo: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LowPrioritySummary {
    pub count: usize,
    pub items: Vec<NotificationItem>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSnapshot {
    pub active: Vec<NotificationItem>,
    pub standalone: Vec<NotificationItem>,
    pub groups: Vec<NotificationGroup>,
    pub snoozed: Vec<NotificationItem>,
    pub history: Vec<NotificationItem>,
    pub recent_dismissals: Vec<NotificationItem>,
    pub low_priority_summary: LowPrioritySummary,
    pub incoming_call: Option<NotificationItem>,
    pub settings: NotificationSettings,
    pub stats: NotificationStats,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PersistedNotifStore {
    #[serde(default)]
    history: Vec<NotificationItem>,
    #[serde(default)]
    snoozed: Vec<NotificationItem>,
    #[serde(default)]
    dismissed_ids: Vec<String>,
    #[serde(default)]
    settings: NotificationSettings,
}

#[derive(Default)]
struct RegistryInner {
    active: Vec<NotificationItem>,
    snoozed: Vec<NotificationItem>,
    history: Vec<NotificationItem>,
    recent_dismissals: Vec<NotificationItem>,
    dismissed_ids: HashSet<String>,
    settings: NotificationSettings,
    last_snapshot_sig: String,
}

static REGISTRY: Lazy<Mutex<RegistryInner>> = Lazy::new(|| Mutex::new(RegistryInner::default()));

fn store_path(state: &SharedState) -> PathBuf {
    state.data_dir.join("notifications-store.json")
}

pub fn init_notifications(app: &AppHandle, state: &SharedState) {
    if let Ok(raw) = fs::read_to_string(store_path(state)) {
        if let Ok(persisted) = serde_json::from_str::<PersistedNotifStore>(&raw) {
            if let Ok(mut reg) = REGISTRY.lock() {
                reg.history = persisted.history.into_iter().take(MAX_HISTORY).collect();
                reg.snoozed = persisted.snoozed;
                reg.dismissed_ids = persisted.dismissed_ids.into_iter().collect();
                reg.settings = persisted.settings;
            }
        }
    }

    let app_bg = app.clone();
    thread::spawn(move || {
        // Brief startup delay so WebView finishes mounting listeners
        thread::sleep(Duration::from_millis(1200));
        loop {
            let st = app_bg.state::<SharedState>();
            let _ = sync_internal(&app_bg, &st, false);
            thread::sleep(Duration::from_secs(4));
        }
    });
}

fn persist_store(state: &SharedState, reg: &RegistryInner) {
    let data = PersistedNotifStore {
        history: reg.history.iter().take(MAX_HISTORY).cloned().collect(),
        snoozed: reg.snoozed.clone(),
        dismissed_ids: reg.dismissed_ids.iter().take(500).cloned().collect(),
        settings: reg.settings.clone(),
    };
    if let Ok(bytes) = serde_json::to_vec_pretty(&data) {
        let _ = atomic_write_bytes(&store_path(state), &bytes);
    }
}

fn classify_notification(app_name: &str, title: &str, body: &str) -> (String, bool, Vec<NotificationAction>) {
    let app_l = app_name.to_lowercase();
    let combined = format!("{title} {body}").to_lowercase();

    let is_call = combined.contains("incoming call")
        || combined.contains("video call")
        || combined.contains("voice call")
        || combined.contains("is calling");

    let is_messaging = app_l.contains("whatsapp")
        || app_l.contains("telegram")
        || app_l.contains("discord")
        || app_l.contains("messenger")
        || app_l.contains("slack")
        || app_l.contains("teams")
        || app_l.contains("signal");

    let priority = if is_call {
        "critical".to_string()
    } else if is_messaging
        || combined.contains("otp")
        || combined.contains("verification code")
        || combined.contains("security alert")
        || combined.contains("mentioned you")
    {
        "high".to_string()
    } else if app_l.contains("microsoft store")
        || app_l.contains("windows security")
        || app_l.contains("tips")
        || app_l.contains("weather")
    {
        "low".to_string()
    } else {
        "normal".to_string()
    };

    let mut actions = Vec::new();
    if is_call {
        actions.push(NotificationAction { action_type: "answer".into(), label: "Answer".into() });
        actions.push(NotificationAction { action_type: "decline".into(), label: "Decline".into() });
    } else {
        if is_messaging {
            actions.push(NotificationAction { action_type: "reply".into(), label: "Reply".into() });
        }
        actions.push(NotificationAction { action_type: "open".into(), label: "Open".into() });
        actions.push(NotificationAction { action_type: "snooze".into(), label: "Snooze".into() });
        actions.push(NotificationAction { action_type: "dismiss".into(), label: "Dismiss".into() });
    }

    (priority, is_call, actions)
}

fn apply_privacy_mask(item: &mut NotificationItem, hide_previews: bool) {
    if hide_previews && !item.is_call {
        item.display_title = item.app_name.clone();
        item.display_body = "Notification preview hidden".to_string();
    } else {
        item.display_title = item.title.clone();
        item.display_body = item.body.clone();
    }
}

fn build_snapshot(reg: &mut RegistryInner) -> NotificationSnapshot {
    let hide_previews = reg.settings.hide_previews;

    let mut active_items = Vec::new();
    for item in &mut reg.active {
        if reg
            .settings
            .excluded_apps
            .iter()
            .any(|e| e.eq_ignore_ascii_case(&item.app_name))
        {
            continue;
        }
        apply_privacy_mask(item, hide_previews);
        active_items.push(item.clone());
    }
    active_items.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    let mut snoozed = reg.snoozed.clone();
    for item in &mut snoozed {
        apply_privacy_mask(item, hide_previews);
    }

    let mut history = reg.history.clone();
    for item in &mut history {
        apply_privacy_mask(item, hide_previews);
    }

    // Group non-call items by appName when >= 2 items exist for the same app
    let mut by_app: HashMap<String, Vec<NotificationItem>> = HashMap::new();
    for item in &active_items {
        by_app
            .entry(item.app_name.to_lowercase())
            .or_default()
            .push(item.clone());
    }

    let mut groups: Vec<NotificationGroup> = Vec::new();
    let mut standalone: Vec<NotificationItem> = Vec::new();
    let mut low_items: Vec<NotificationItem> = Vec::new();

    for (app_key, mut items) in by_app {
        items.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        if items.len() >= 2 && !items.iter().any(|i| i.is_call) {
            let group_id = format!("group_{app_key}");
            let app_name = items[0].app_name.clone();
            let latest = items[0].timestamp;
            let prio = if items.iter().any(|i| i.priority == "high" || i.priority == "critical") {
                "high".to_string()
            } else {
                items[0].priority.clone()
            };
            for it in &mut items {
                it.group_id = Some(group_id.clone());
            }
            groups.push(NotificationGroup {
                id: group_id,
                app_name,
                count: items.len(),
                items,
                latest_timestamp: latest,
                priority: prio,
            });
        } else {
            for it in items {
                if it.priority == "low" {
                    low_items.push(it.clone());
                }
                standalone.push(it);
            }
        }
    }

    groups.sort_by(|a, b| b.latest_timestamp.cmp(&a.latest_timestamp));
    standalone.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    let incoming_call = active_items.iter().find(|i| i.is_call).cloned();
    let unreviewed_count = active_items.iter().filter(|i| !i.reviewed).count();
    let critical_count = active_items
        .iter()
        .filter(|i| i.priority == "critical" || i.priority == "high")
        .count();

    NotificationSnapshot {
        stats: NotificationStats {
            total_active: active_items.len(),
            unreviewed_count,
            snoozed_count: snoozed.len(),
            critical_count,
            history_count: history.len(),
            has_undo: !reg.recent_dismissals.is_empty(),
        },
        active: active_items,
        standalone,
        groups,
        snoozed,
        history,
        recent_dismissals: reg.recent_dismissals.clone(),
        low_priority_summary: LowPrioritySummary {
            count: low_items.len(),
            items: low_items,
        },
        incoming_call,
        settings: reg.settings.clone(),
    }
}

#[cfg(windows)]
fn fetch_windows_toasts() -> Option<Vec<NotificationItem>> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
    let listener = UserNotificationListener::Current().ok()?;
    let status = listener.GetAccessStatus().ok()?;
    if status != UserNotificationListenerAccessStatus::Allowed {
        // Request access once cleanly; on desktop without capability this may stay Denied/Unspecified
        if let Ok(op) = listener.RequestAccessAsync() {
            if op.get().ok() != Some(UserNotificationListenerAccessStatus::Allowed) {
                return None;
            }
        } else {
            return None;
        }
    }

    let toasts = listener
        .GetNotificationsAsync(NotificationKinds::Toast)
        .ok()?
        .get()
        .ok()?;
    let binding_id = KnownNotificationBindings::ToastGeneric().ok()?;

    let mut out = Vec::new();
    for un in toasts {
        let Ok(win_id) = un.Id() else { continue };
        let app_info = un.AppInfo().ok();
        let app_id = app_info
            .as_ref()
            .and_then(|a| a.AppUserModelId().ok())
            .map(|s| s.to_string())
            .unwrap_or_default();
        let app_name = app_info
            .as_ref()
            .and_then(|a| a.DisplayInfo().ok())
            .and_then(|d| d.DisplayName().ok())
            .map(|s| s.to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| {
                if app_id.is_empty() {
                    "Windows".to_string()
                } else {
                    app_id.clone()
                }
            });

        let mut title = String::new();
        let mut body_parts = Vec::new();
        if let Ok(notif) = un.Notification() {
            if let Ok(vis) = notif.Visual() {
                if let Ok(binding) = vis.GetBinding(&binding_id) {
                    if let Ok(elems) = binding.GetTextElements() {
                        for (idx, el) in elems.into_iter().enumerate() {
                            if let Ok(txt) = el.Text() {
                                let s = txt.to_string().trim().to_string();
                                if s.is_empty() {
                                    continue;
                                }
                                if idx == 0 {
                                    title = s;
                                } else {
                                    body_parts.push(s);
                                }
                            }
                        }
                    }
                }
            }
        }

        let body = body_parts.join(" • ");
        if title.is_empty() && body.is_empty() {
            continue;
        }
        if title.is_empty() {
            title = app_name.clone();
        }

        let ft = un
            .CreationTime()
            .map(|dt| dt.UniversalTime)
            .unwrap_or(0);
        let timestamp = if ft > EPOCH_DIFF_100NS {
            (ft - EPOCH_DIFF_100NS) / 10_000
        } else {
            Utc::now().timestamp_millis()
        };

        let (priority, is_call, actions) = classify_notification(&app_name, &title, &body);
        out.push(NotificationItem {
            id: format!("win_{win_id}"),
            win_id: Some(win_id),
            app_id,
            app_name,
            sender: title.clone(),
            title: title.clone(),
            body: body.clone(),
            display_title: title,
            display_body: body,
            timestamp,
            priority,
            is_call,
            reviewed: false,
            dismissed: false,
            snooze_until: None,
            group_id: None,
            actions,
        });
    }

    Some(out)
}

#[cfg(windows)]
fn remove_windows_toast(win_id: u32) {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
    if let Ok(listener) = UserNotificationListener::Current() {
        let _ = listener.RemoveNotification(win_id);
    }
}

fn sync_internal(app: &AppHandle, state: &SharedState, force_emit: bool) -> NotificationSnapshot {
    #[cfg(windows)]
    let fetched = fetch_windows_toasts();
    #[cfg(not(windows))]
    let fetched: Option<Vec<NotificationItem>> = None;

    let now = Utc::now().timestamp_millis();

    let (snapshot, changed) = {
        let Ok(mut reg) = REGISTRY.lock() else {
            return build_snapshot(&mut RegistryInner::default());
        };

        // Restore expired snoozes
        let mut remaining_snoozed = Vec::new();
        for mut item in std::mem::take(&mut reg.snoozed) {
            if item.snooze_until.map(|t| t <= now).unwrap_or(false) {
                item.snooze_until = None;
                item.reviewed = false;
                if !reg.active.iter().any(|a| a.id == item.id) {
                    reg.active.insert(0, item);
                }
            } else {
                remaining_snoozed.push(item);
            }
        }
        reg.snoozed = remaining_snoozed;

        if let Some(items) = fetched {
            let reviewed_map: HashMap<String, bool> = reg
                .active
                .iter()
                .map(|i| (i.id.clone(), i.reviewed))
                .collect();

            let mut next_active = Vec::new();
            for mut item in items {
                if reg.dismissed_ids.contains(&item.id)
                    || reg.snoozed.iter().any(|s| s.id == item.id)
                {
                    continue;
                }
                if let Some(&was_reviewed) = reviewed_map.get(&item.id) {
                    item.reviewed = was_reviewed;
                }
                if !reg.history.iter().any(|h| h.id == item.id) {
                    reg.history.insert(0, item.clone());
                    reg.history.truncate(MAX_HISTORY);
                }
                next_active.push(item);
            }
            reg.active = next_active;
        }

        let snap = build_snapshot(&mut reg);
        let sig = format!(
            "{}|{}|{}|{}|{}",
            snap.active
                .iter()
                .map(|i| format!("{}:{}", i.id, i.reviewed))
                .collect::<Vec<_>>()
                .join(","),
            snap.snoozed.len(),
            snap.history.len(),
            snap.settings.hide_previews,
            snap.settings.excluded_apps.join(",")
        );
        let changed = force_emit || sig != reg.last_snapshot_sig;
        if changed {
            reg.last_snapshot_sig = sig;
            persist_store(state, &reg);
        }
        (snap, changed)
    };

    if changed {
        let _ = app.emit("notification:update", &snapshot);
    }
    snapshot
}

#[tauri::command]
pub fn get_notifications(state: tauri::State<'_, SharedState>, app: AppHandle) -> Vec<NotificationItem> {
    sync_internal(&app, &state, false).active
}

#[tauri::command]
pub fn dismiss_notification(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    id: String,
) -> bool {
    let _ = notifications_dismiss(app, state, id);
    true
}

#[tauri::command]
pub fn focus_notification_app(app_id: String) -> bool {
    let clean = app_id.trim();
    if clean.is_empty() {
        return false;
    }
    if activate_window_by_query(clean) {
        return true;
    }
    launch_app_internal(clean).is_ok()
}

#[tauri::command]
pub fn notifications_get_snapshot(app: AppHandle, state: tauri::State<'_, SharedState>) -> NotificationSnapshot {
    sync_internal(&app, &state, false)
}

#[tauri::command]
pub fn notifications_sync_now(app: AppHandle, state: tauri::State<'_, SharedState>) -> NotificationSnapshot {
    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_dismiss(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    notification_id: String,
) -> NotificationSnapshot {
    let win_id_opt = {
        let Ok(mut reg) = REGISTRY.lock() else {
            return build_snapshot(&mut RegistryInner::default());
        };
        let mut found_win = None;
        if let Some(pos) = reg.active.iter().position(|n| n.id == notification_id) {
            let mut removed = reg.active.remove(pos);
            found_win = removed.win_id;
            removed.dismissed = true;
            reg.dismissed_ids.insert(removed.id.clone());
            reg.recent_dismissals.insert(0, removed);
            reg.recent_dismissals.truncate(15);
        }
        reg.snoozed.retain(|n| n.id != notification_id);
        found_win
    };

    #[cfg(windows)]
    if let Some(wid) = win_id_opt {
        remove_windows_toast(wid);
    }

    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_dismiss_group(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    group_id: String,
) -> NotificationSnapshot {
    let app_key = group_id.strip_prefix("group_").unwrap_or(&group_id).to_lowercase();
    let win_ids: Vec<u32> = {
        let Ok(mut reg) = REGISTRY.lock() else {
            return build_snapshot(&mut RegistryInner::default());
        };
        let mut removed_wins = Vec::new();
        let mut remaining = Vec::new();
        for mut item in std::mem::take(&mut reg.active) {
            if item.app_name.eq_ignore_ascii_case(&app_key) {
                if let Some(wid) = item.win_id {
                    removed_wins.push(wid);
                }
                item.dismissed = true;
                reg.dismissed_ids.insert(item.id.clone());
                reg.recent_dismissals.insert(0, item);
            } else {
                remaining.push(item);
            }
        }
        reg.recent_dismissals.truncate(15);
        reg.active = remaining;
        removed_wins
    };

    #[cfg(windows)]
    for wid in win_ids {
        remove_windows_toast(wid);
    }

    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_clear_all(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
) -> NotificationSnapshot {
    let win_ids: Vec<u32> = {
        let Ok(mut reg) = REGISTRY.lock() else {
            return build_snapshot(&mut RegistryInner::default());
        };
        let mut removed_wins = Vec::new();
        for mut item in std::mem::take(&mut reg.active) {
            if let Some(wid) = item.win_id {
                removed_wins.push(wid);
            }
            item.dismissed = true;
            reg.dismissed_ids.insert(item.id.clone());
            reg.recent_dismissals.insert(0, item);
        }
        reg.recent_dismissals.truncate(15);
        removed_wins
    };

    #[cfg(windows)]
    for wid in win_ids {
        remove_windows_toast(wid);
    }

    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_undo_dismiss(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    notification_id: Option<String>,
) -> NotificationSnapshot {
    {
        let Ok(mut reg) = REGISTRY.lock() else {
            return build_snapshot(&mut RegistryInner::default());
        };
        let pos = match notification_id {
            Some(ref target) => reg.recent_dismissals.iter().position(|i| &i.id == target),
            None => (!reg.recent_dismissals.is_empty()).then_some(0),
        };
        if let Some(idx) = pos {
            let mut item = reg.recent_dismissals.remove(idx);
            item.dismissed = false;
            reg.dismissed_ids.remove(&item.id);
            if !reg.active.iter().any(|a| a.id == item.id) {
                reg.active.insert(0, item);
            }
        }
    }
    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_snooze(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    notification_id: String,
    duration_ms: Option<i64>,
    until_timestamp: Option<i64>,
) -> NotificationSnapshot {
    let until = until_timestamp.unwrap_or_else(|| {
        Utc::now().timestamp_millis() + duration_ms.unwrap_or(15 * 60 * 1000).max(10_000)
    });

    {
        let Ok(mut reg) = REGISTRY.lock() else {
            return build_snapshot(&mut RegistryInner::default());
        };
        if let Some(pos) = reg.active.iter().position(|n| n.id == notification_id) {
            let mut item = reg.active.remove(pos);
            item.snooze_until = Some(until);
            reg.snoozed.retain(|s| s.id != item.id);
            reg.snoozed.push(item);
        }
    }

    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_cancel_snooze(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    notification_id: String,
) -> NotificationSnapshot {
    {
        let Ok(mut reg) = REGISTRY.lock() else {
            return build_snapshot(&mut RegistryInner::default());
        };
        if let Some(pos) = reg.snoozed.iter().position(|n| n.id == notification_id) {
            let mut item = reg.snoozed.remove(pos);
            item.snooze_until = None;
            if !reg.active.iter().any(|a| a.id == item.id) {
                reg.active.insert(0, item);
            }
        }
    }

    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_mark_reviewed(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    notification_id: String,
) -> NotificationSnapshot {
    if let Ok(mut reg) = REGISTRY.lock() {
        if let Some(n) = reg.active.iter_mut().find(|n| n.id == notification_id) {
            n.reviewed = true;
        }
    }
    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_mark_all_reviewed(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
) -> NotificationSnapshot {
    if let Ok(mut reg) = REGISTRY.lock() {
        for n in &mut reg.active {
            n.reviewed = true;
        }
    }
    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_set_hide_previews(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    hide: bool,
) -> NotificationSnapshot {
    if let Ok(mut reg) = REGISTRY.lock() {
        reg.settings.hide_previews = hide;
    }
    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_set_app_excluded(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    app_name: String,
    excluded: bool,
) -> NotificationSnapshot {
    if let Ok(mut reg) = REGISTRY.lock() {
        reg.settings
            .excluded_apps
            .retain(|a| !a.eq_ignore_ascii_case(&app_name));
        if excluded && !app_name.trim().is_empty() {
            reg.settings.excluded_apps.push(app_name.trim().to_string());
        }
    }
    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_clear_history(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
) -> NotificationSnapshot {
    if let Ok(mut reg) = REGISTRY.lock() {
        reg.history.clear();
    }
    sync_internal(&app, &state, true)
}

#[tauri::command]
pub fn notifications_execute_action(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    notification_id: String,
    action_type: String,
    params: Option<Value>,
) -> Value {
    let item_opt = REGISTRY.lock().ok().and_then(|reg| {
        reg.active
            .iter()
            .chain(reg.history.iter())
            .find(|n| n.id == notification_id)
            .cloned()
    });

    let app_name = item_opt
        .as_ref()
        .map(|i| i.app_name.clone())
        .unwrap_or_default();
    let app_id = item_opt
        .as_ref()
        .map(|i| i.app_id.clone())
        .or_else(|| {
            params
                .as_ref()
                .and_then(|p| p.get("appId"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_default();

    match action_type.as_str() {
        "dismiss" | "decline" => {
            let snap = notifications_dismiss(app, state, notification_id);
            json!({ "success": true, "snapshot": snap })
        }
        "snooze" => {
            let mins = params
                .as_ref()
                .and_then(|p| p.get("minutes"))
                .and_then(|v| v.as_i64())
                .unwrap_or(15);
            let snap = notifications_snooze(app, state, notification_id, Some(mins * 60_000), None);
            json!({ "success": true, "snapshot": snap })
        }
        "open" | "answer" => {
            let ok = if !app_name.is_empty() && activate_window_by_query(&app_name) {
                true
            } else if !app_id.is_empty() {
                focus_notification_app(app_id)
            } else if !app_name.is_empty() {
                launch_app_internal(&app_name).is_ok()
            } else {
                false
            };
            let snap = notifications_mark_reviewed(app, state, notification_id);
            json!({ "success": ok, "snapshot": snap })
        }
        "reply" => {
            let text = params
                .as_ref()
                .and_then(|p| p.get("text"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if app_name.to_lowercase().contains("whatsapp") {
                #[cfg(windows)]
                unsafe {
                    let uri = if text.is_empty() {
                        "whatsapp://".to_string()
                    } else {
                        format!("whatsapp://send?text={}", urlencoding::encode(&text))
                    };
                    let op = to_wide("open");
                    let target = to_wide(&uri);
                    let _ = ShellExecuteW(
                        HWND::default(),
                        PCWSTR(op.as_ptr()),
                        PCWSTR(target.as_ptr()),
                        PCWSTR::null(),
                        PCWSTR::null(),
                        SW_SHOWNORMAL,
                    );
                }
            } else {
                let _ = activate_window_by_query(&app_name);
            }
            let snap = notifications_mark_reviewed(app, state, notification_id);
            json!({ "success": true, "snapshot": snap })
        }
        _ => {
            let snap = sync_internal(&app, &state, false);
            json!({ "success": false, "snapshot": snap })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn privacy_mask_hides_non_call_previews() {
        let (prio, is_call, _) = classify_notification("WhatsApp", "John", "Meeting at 5pm");
        assert_eq!(prio, "high");
        assert!(!is_call);

        let mut item = NotificationItem {
            id: "1".into(),
            win_id: None,
            app_id: "WhatsApp".into(),
            app_name: "WhatsApp".into(),
            sender: "John".into(),
            title: "John".into(),
            body: "Secret OTP 9999".into(),
            display_title: String::new(),
            display_body: String::new(),
            timestamp: 100,
            priority: prio,
            is_call,
            reviewed: false,
            dismissed: false,
            snooze_until: None,
            group_id: None,
            actions: vec![],
        };
        apply_privacy_mask(&mut item, true);
        assert_eq!(item.display_title, "WhatsApp");
        assert_eq!(item.display_body, "Notification preview hidden");
    }
}
