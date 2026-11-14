#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio_mixer;
mod launcher;
mod media;
mod notes;
mod notifications;
mod prayer;
mod shelf;
mod shortcuts;
mod state;
mod system_stats;
mod updater;
mod window_overlay;

use state::SharedState;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let state = app.state::<SharedState>();
    let aot = state
        .settings
        .read()
        .map(|s| s.always_on_top)
        .unwrap_or(true);

    let toggle_item = MenuItem::with_id(app, "toggle", "Open Quick Pill", true, None::<&str>)?;
    let aot_item =
        CheckMenuItem::with_id(app, "always_on_top", "Always on Top", true, aot, None::<&str>)?;
    let updates_item =
        MenuItem::with_id(app, "updates", "Check for Updates", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Quick Pill", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&toggle_item, &aot_item, &updates_item, &sep, &quit_item])?;

    let aot_menu_clone = aot_item.clone();
    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Quick Pill")
        .show_menu_on_left_click(false)
        .on_menu_event(move |app_handle, event| match event.id.as_ref() {
            "toggle" => {
                let st = app_handle.state::<SharedState>();
                let hwnd_raw = {
                    if let Ok(mut ov) = st.overlay.lock() {
                        ov.ignore_mouse = false;
                        ov.main_hwnd
                    } else {
                        0
                    }
                };
                #[cfg(windows)]
                if hwnd_raw != 0 {
                    window_overlay::apply_overlay_styles(hwnd_raw, false);
                }
                if let Some(w) = app_handle.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                    let _ = app_handle.emit("open-tab-instant", 2);
                }
            }
            "always_on_top" => {
                let next = {
                    let st = app_handle.state::<SharedState>();
                    let cur = st.settings.read().map(|s| s.always_on_top).unwrap_or(true);
                    !cur
                };
                let _ = aot_menu_clone.set_checked(next);
                let st = app_handle.state::<SharedState>();
                let _ = window_overlay::set_always_on_top(app_handle.clone(), st, next);
            }
            "updates" => {
                let handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = updater::check_for_updates(handle).await;
                });
            }
            "quit" => {
                app_handle.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app_handle = tray.app_handle();
                let st = app_handle.state::<SharedState>();
                let hwnd_raw = {
                    if let Ok(mut ov) = st.overlay.lock() {
                        ov.ignore_mouse = false;
                        ov.main_hwnd
                    } else {
                        0
                    }
                };
                #[cfg(windows)]
                if hwnd_raw != 0 {
                    window_overlay::apply_overlay_styles(hwnd_raw, false);
                }
                if let Some(w) = app_handle.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                    let _ = app_handle.emit("open-tab-instant", 2);
                }
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    shortcuts::handle_shortcut_event(app, shortcut, event.state());
                })
                .build(),
        )
        .setup(|app| {
            let shared = SharedState::new(app.handle());
            shared.log("INFO", "Quick Pill starting up (Rust/Tauri v2)", None);

            shelf::init_shelf(&shared);
            app.manage(shared);

            {
                let st = app.state::<SharedState>();
                launcher::init_launcher(app.handle(), &st);
                notifications::init_notifications(app.handle(), &st);
            }

            if let Some(main_win) = app.get_webview_window("main") {
                #[cfg(windows)]
                window_overlay::init_overlay_window(app.handle(), &main_win);
            } else {
                app.state::<SharedState>().log("ERROR", "[Setup] Main webview window not found!", None);
            }

            if let Err(e) = build_tray(app) {
                app.state::<SharedState>().log("WARN", &format!("[Setup] Tray setup failed: {e}"), None);
            }
            if let Err(e) = shortcuts::register_all_shortcuts(app.handle()) {
                app.state::<SharedState>().log("WARN", &format!("[Setup] Shortcut registration warning: {e}"), None);
            }
            system_stats::start_system_watchers(app.handle().clone());
            app.state::<SharedState>().log("INFO", "[Setup] Complete", None);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Overlay & window controls
            window_overlay::set_ignore_mouse_events,
            window_overlay::update_island_bounds,
            window_overlay::get_displays,
            window_overlay::set_display,
            window_overlay::update_window_position,
            window_overlay::set_auto_launch,
            window_overlay::get_always_on_top,
            window_overlay::set_always_on_top,
            window_overlay::focus_window,
            window_overlay::open_external,
            // Logging & app info
            state::log_message,
            state::log_renderer_error,
            state::get_app_version,
            state::is_store_build,
            // Media controls
            media::get_system_media,
            media::control_system_media,
            // System telemetry & devices
            system_stats::get_system_metrics,
            system_stats::get_camera_status,
            system_stats::get_microphone_status,
            system_stats::get_bluetooth_status,
            system_stats::get_clipboard_text,
            system_stats::write_clipboard_text,
            system_stats::clear_clipboard,
            system_stats::control_system_volume,
            // Audio Mixer (WASAPI)
            audio_mixer::audio_mixer_get_devices,
            audio_mixer::audio_mixer_get_sessions,
            audio_mixer::audio_mixer_set_volume,
            audio_mixer::audio_mixer_set_mute,
            audio_mixer::audio_mixer_set_master_volume,
            audio_mixer::audio_mixer_set_master_mute,
            // Notifications
            notifications::get_notifications,
            notifications::dismiss_notification,
            notifications::focus_notification_app,
            notifications::notifications_get_snapshot,
            notifications::notifications_sync_now,
            notifications::notifications_execute_action,
            notifications::notifications_snooze,
            notifications::notifications_cancel_snooze,
            notifications::notifications_dismiss,
            notifications::notifications_dismiss_group,
            notifications::notifications_clear_all,
            notifications::notifications_undo_dismiss,
            notifications::notifications_mark_reviewed,
            notifications::notifications_mark_all_reviewed,
            notifications::notifications_set_hide_previews,
            notifications::notifications_set_app_excluded,
            notifications::notifications_clear_history,
            // App Launcher & Workspaces
            launcher::launcher_get_catalog,
            launcher::launcher_reindex_catalog,
            launcher::launcher_search_apps,
            launcher::launcher_launch_app,
            launcher::launcher_get_running_windows,
            launcher::launcher_activate_window,
            launcher::launcher_get_favorites,
            launcher::launcher_set_favorites,
            launcher::workspaces_get_all,
            launcher::workspaces_save,
            launcher::workspaces_delete,
            launcher::workspaces_launch,
            // Quick Notes
            notes::notes_get_all,
            notes::notes_save,
            notes::notes_delete,
            notes::notes_undo_delete,
            notes::notes_toggle_pin,
            notes::notes_toggle_archive,
            notes::notes_save_draft,
            notes::notes_get_draft,
            notes::notes_clear_draft,
            notes::notes_get_context,
            notes::notes_search,
            notes::notes_get_tags,
            notes::notes_convert_to_task,
            // File Shelf
            shelf::shelf_get_items,
            shelf::shelf_add_files,
            shelf::shelf_remove_item,
            shelf::shelf_clear,
            shelf::shelf_open_file,
            shelf::shelf_show_in_folder,
            shelf::shelf_start_drag,
            // Prayer timings
            prayer::prayer_get_timings,
            // Updater
            updater::check_for_updates,
            updater::start_update_download,
            updater::cancel_update_download,
            updater::install_update,
            updater::get_auto_download_install,
            updater::set_auto_download_install,
            // Global shortcuts
            shortcuts::shortcuts_get_tabs,
            shortcuts::shortcuts_set_tabs,
            shortcuts::shortcuts_reset_tabs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Quick Pill");
}
