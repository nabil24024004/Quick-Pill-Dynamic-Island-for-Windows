use crate::state::{SharedState, DEFAULT_TAB_SHORTCUTS};
use crate::window_overlay::apply_overlay_styles;
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

static REGISTERED_MAP: Lazy<Mutex<HashMap<u32, i32>>> = Lazy::new(|| Mutex::new(HashMap::new()));

pub fn contains_forbidden_ctrl(accelerator: &str) -> bool {
    let lower = accelerator.to_lowercase();
    lower.contains("ctrl")
        || lower.contains("control")
        || lower.contains("commandorcontrol")
        || lower.contains("cmdorctrl")
}

pub fn normalize_shortcut_str(raw: &str) -> String {
    raw.split('+')
        .map(|part| {
            if part == " " {
                return "Space".to_string();
            }
            let trimmed = part.trim();
            if trimmed.is_empty() {
                return String::new();
            }
            match trimmed.to_lowercase().as_str() {
                "arrowup" | "up" => "Up".to_string(),
                "arrowdown" | "down" => "Down".to_string(),
                "arrowleft" | "left" => "Left".to_string(),
                "arrowright" | "right" => "Right".to_string(),
                "spacebar" | "space" => "Space".to_string(),
                "esc" => "Escape".to_string(),
                "del" => "Delete".to_string(),
                "ins" => "Insert".to_string(),
                _ => trimmed.to_string(),
            }
        })
        .collect::<Vec<_>>()
        .join("+")
}

pub fn handle_shortcut_event(app: &AppHandle, shortcut: &Shortcut, state_event: ShortcutState) {
    if state_event != ShortcutState::Pressed {
        return;
    }

    let tab_id_opt = REGISTERED_MAP
        .lock()
        .ok()
        .and_then(|map| map.get(&shortcut.id()).copied());

    if let Some(tab_id) = tab_id_opt {
        let state = app.state::<SharedState>();
        let hwnd_raw = {
            if let Ok(mut ov) = state.overlay.lock() {
                ov.ignore_mouse = false;
                ov.main_hwnd
            } else {
                0
            }
        };
        #[cfg(windows)]
        if hwnd_raw != 0 {
            apply_overlay_styles(hwnd_raw, false);
        }
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.set_focus();
        }
        let _ = app.emit("open-tab-instant", tab_id);
        if tab_id == 15 {
            let _ = app.emit("notes:quick-capture-triggered", json!({ "source": "shortcut" }));
        }
    }
}

pub fn register_all_shortcuts(app: &AppHandle) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();

    let state = app.state::<SharedState>();
    let shortcuts = state
        .settings
        .read()
        .map(|s| s.tab_shortcuts.clone())
        .unwrap_or_else(|_| DEFAULT_TAB_SHORTCUTS.clone());

    let mut new_map: HashMap<u32, i32> = HashMap::new();

    for (tab_str, raw_accel) in shortcuts {
        let accel = normalize_shortcut_str(&raw_accel);
        if accel.trim().is_empty() {
            continue;
        }
        if contains_forbidden_ctrl(&accel) {
            state.log(
                "WARN",
                "[Shortcuts] Blocked forbidden Ctrl shortcut",
                Some(&json!({ "tab": tab_str, "shortcut": raw_accel })),
            );
            continue;
        }
        let Ok(tab_id) = tab_str.parse::<i32>() else {
            continue;
        };
        match accel.parse::<Shortcut>() {
            Ok(sc) => {
                if let Err(err) = gs.register(sc) {
                    state.log(
                        "WARN",
                        "[Shortcuts] Failed to register global shortcut",
                        Some(&json!({ "tab": tab_id, "shortcut": accel, "error": format!("{err}") })),
                    );
                } else {
                    new_map.insert(sc.id(), tab_id);
                }
            }
            Err(err) => {
                state.log(
                    "WARN",
                    "[Shortcuts] Invalid shortcut format",
                    Some(&json!({ "tab": tab_id, "shortcut": accel, "error": format!("{err}") })),
                );
            }
        }
    }

    if let Ok(mut guard) = REGISTERED_MAP.lock() {
        *guard = new_map;
    }

    Ok(())
}

#[tauri::command]
pub fn shortcuts_get_tabs(state: tauri::State<'_, SharedState>) -> HashMap<String, String> {
    state
        .settings
        .read()
        .map(|s| s.tab_shortcuts.clone())
        .unwrap_or_else(|_| DEFAULT_TAB_SHORTCUTS.clone())
}

#[tauri::command]
pub fn shortcuts_set_tabs(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    shortcuts: Value,
) -> Result<HashMap<String, String>, String> {
    let obj = shortcuts
        .as_object()
        .ok_or_else(|| "Shortcuts must be an object".to_string())?;

    let mut validated: HashMap<String, String> = HashMap::new();
    for (k, v) in obj {
        if let Some(s) = v.as_str() {
            if contains_forbidden_ctrl(s) {
                return Err(format!(
                    "Shortcut '{s}' cannot use Ctrl (reserved for click-through mode)"
                ));
            }
            validated.insert(k.clone(), s.to_string());
        }
    }

    {
        let mut settings = state.settings.write().map_err(|e| format!("{e}"))?;
        settings.tab_shortcuts = validated.clone();
    }
    state.save_settings()?;
    register_all_shortcuts(&app)?;

    Ok(validated)
}

#[tauri::command]
pub fn shortcuts_reset_tabs(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
) -> Result<HashMap<String, String>, String> {
    let defaults = DEFAULT_TAB_SHORTCUTS.clone();
    {
        let mut settings = state.settings.write().map_err(|e| format!("{e}"))?;
        settings.tab_shortcuts = defaults.clone();
    }
    state.save_settings()?;
    register_all_shortcuts(&app)?;
    Ok(defaults)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ctrl_detection_blocks_variants() {
        assert!(contains_forbidden_ctrl("Ctrl+B"));
        assert!(contains_forbidden_ctrl("Control+Alt+Q"));
        assert!(contains_forbidden_ctrl("CommandOrControl+Shift+A"));
        assert!(!contains_forbidden_ctrl("Alt+B"));
        assert!(!contains_forbidden_ctrl("Alt+Shift+Q"));
    }

    #[test]
    fn shortcut_normalization_works() {
        assert_eq!(normalize_shortcut_str("Alt+ArrowUp"), "Alt+Up");
        assert_eq!(normalize_shortcut_str("Alt+ "), "Alt+Space");
    }
}
