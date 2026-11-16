use crate::state::{atomic_write_bytes, IslandBounds, SharedState};
#[cfg(windows)]
use crate::state::{extract_file_icon_data_url, to_wide};
#[cfg(windows)]
use crate::window_overlay::{apply_overlay_styles, is_cursor_inside_island_bounds};
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
    core::{implement, HRESULT, PCWSTR},
    Win32::{
        Foundation::{
            BOOL, DRAGDROP_S_CANCEL, DRAGDROP_S_DROP, DRAGDROP_S_USEDEFAULTCURSORS, HWND, LPARAM,
            POINT, S_OK, WPARAM,
        },
        System::Com::IDataObject,
        System::Ole::{
            IDropSource, IDropSource_Impl, OleInitialize, OleUninitialize, DROPEFFECT,
            DROPEFFECT_COPY, DROPEFFECT_LINK, DROPEFFECT_MOVE,
        },
        System::SystemServices::MODIFIERKEYS_FLAGS,
        System::Threading::{AttachThreadInput, GetCurrentThreadId},
        UI::{
            Input::KeyboardAndMouse::{
                GetAsyncKeyState, ReleaseCapture, VK_ESCAPE, VK_LBUTTON, VK_RBUTTON,
            },
            Shell::{
                Common::ITEMIDLIST, ILClone, ILCreateFromPathW, ILFree, ILRemoveLastID,
                IShellFolder, SHBindToParent, SHCreateDataObject, SHDoDragDrop, ShellExecuteW,
            },
            WindowsAndMessaging::{
                FindWindowExW, GetCursorPos, GetForegroundWindow, GetGUIThreadInfo,
                GetWindowThreadProcessId, PostMessageW, PostThreadMessageW, WindowFromPoint,
                GUITHREADINFO, SW_SHOWNORMAL, WM_KEYDOWN, WM_LBUTTONUP, WM_MOUSEMOVE,
                WM_RBUTTONDOWN,
            },
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

pub fn normalize_shelf_input_path(raw: &str) -> Option<String> {
    let trimmed = raw.trim().trim_matches('"');
    if trimmed.is_empty() || trimmed.starts_with('#') {
        return None;
    }
    if let Some(rest) = trimmed
        .strip_prefix("file://localhost")
        .or_else(|| trimmed.strip_prefix("FILE://LOCALHOST"))
        .or_else(|| trimmed.strip_prefix("file://"))
        .or_else(|| trimmed.strip_prefix("FILE://"))
    {
        let mut bytes = Vec::with_capacity(rest.len());
        let raw_bytes = rest.as_bytes();
        let mut i = 0;
        while i < raw_bytes.len() {
            if raw_bytes[i] == b'%' && i + 2 < raw_bytes.len() {
                if let Ok(hex_str) = std::str::from_utf8(&raw_bytes[i + 1..i + 3]) {
                    if let Ok(val) = u8::from_str_radix(hex_str, 16) {
                        bytes.push(val);
                        i += 3;
                        continue;
                    }
                }
            }
            bytes.push(raw_bytes[i]);
            i += 1;
        }
        let decoded = String::from_utf8_lossy(&bytes).to_string();
        #[cfg(windows)]
        {
            if decoded.len() >= 3
                && decoded.as_bytes()[0] == b'/'
                && decoded.as_bytes()[2] == b':'
            {
                return Some(decoded[1..].replace('/', "\\"));
            }
        }
        return Some(decoded);
    }
    Some(trimmed.to_string())
}

pub fn shelf_add_files_sync(
    app: &AppHandle,
    state: &SharedState,
    file_paths: Vec<String>,
) -> Result<Vec<ShelfItem>, String> {
    let stage_root = shelf_staging_dir();
    fs::create_dir_all(&stage_root).map_err(|e| format!("Shelf mkdir failed: {e}"))?;

    let mut new_items = Vec::new();
    for raw_path in file_paths {
        let Some(normalized) = normalize_shelf_input_path(&raw_path) else {
            continue;
        };
        let src = Path::new(&normalized);
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
        #[cfg(target_os = "linux")]
        let icon_data_url = extract_linux_file_icon_data_url(app, &staged_str, 48, is_folder);
        #[cfg(all(not(windows), not(target_os = "linux")))]
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

    persist_shelf(state, &snapshot);
    let _ = app.emit("shelf:update", &snapshot);
    Ok(snapshot)
}

#[tauri::command]
pub async fn shelf_add_files(
    app: AppHandle,
    file_paths: Vec<String>,
) -> Result<Vec<ShelfItem>, String> {
    tokio::task::spawn_blocking(move || {
        let state = app.state::<SharedState>();
        shelf_add_files_sync(&app, &state, file_paths)
    })
    .await
    .map_err(|e| format!("Shelf add task failed: {e}"))?
}

#[tauri::command]
pub async fn shelf_pick_files(app: AppHandle) -> Result<Vec<ShelfItem>, String> {
    tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "linux")]
        let selected_paths: Vec<String> = {
            use gtk::prelude::*;
            let (tx, rx) = std::sync::mpsc::channel::<Vec<String>>();
            let app_ui = app.clone();
            if app
                .run_on_main_thread(move || {
                    let parent_win = app_ui
                        .get_webview_window("main")
                        .and_then(|w| w.gtk_window().ok());
                    let parent_ref = parent_win
                        .as_ref()
                        .map(|w| gtk::prelude::Cast::upcast_ref::<gtk::Window>(w));
                    let dialog = gtk::FileChooserNative::new(
                        Some("Add Files to Shelf"),
                        parent_ref,
                        gtk::FileChooserAction::Open,
                        Some("Add"),
                        Some("Cancel"),
                    );
                    dialog.set_select_multiple(true);
                    dialog.set_modal(true);
                    let resp = dialog.run();
                    let paths = if resp == gtk::ResponseType::Accept {
                        dialog
                            .filenames()
                            .into_iter()
                            .map(|p| p.to_string_lossy().to_string())
                            .collect()
                    } else {
                        Vec::new()
                    };
                    dialog.destroy();
                    let _ = tx.send(paths);
                })
                .is_ok()
            {
                rx.recv_timeout(std::time::Duration::from_secs(120))
                    .unwrap_or_default()
            } else {
                Vec::new()
            }
        };

        #[cfg(windows)]
        let selected_paths: Vec<String> = {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            let script = "Add-Type -AssemblyName System.Windows.Forms; $dlg = New-Object System.Windows.Forms.OpenFileDialog; $dlg.Multiselect = $true; $dlg.Title = 'Add Files to Shelf'; if ($dlg.ShowDialog() -eq 'OK') { $dlg.FileNames }";
            std::process::Command::new("powershell")
                .args(["-NoProfile", "-STA", "-Command", script])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
                .ok()
                .filter(|o| o.status.success())
                .map(|o| {
                    String::from_utf8_lossy(&o.stdout)
                        .lines()
                        .map(|l| l.trim().to_string())
                        .filter(|l| !l.is_empty())
                        .collect()
                })
                .unwrap_or_default()
        };

        #[cfg(not(any(windows, target_os = "linux")))]
        let selected_paths: Vec<String> = Vec::new();

        if selected_paths.is_empty() {
            return Ok(SHELF_ITEMS.lock().map(|g| g.clone()).unwrap_or_default());
        }
        let state = app.state::<SharedState>();
        shelf_add_files_sync(&app, &state, selected_paths)
    })
    .await
    .map_err(|e| format!("Shelf picker task failed: {e}"))?
}

#[tauri::command]
pub async fn shelf_remove_item(
    app: AppHandle,
    id: String,
) -> Result<Vec<ShelfItem>, String> {
    tokio::task::spawn_blocking(move || {
        let state = app.state::<SharedState>();
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
    })
    .await
    .map_err(|e| format!("Shelf remove task failed: {e}"))?
}

#[tauri::command]
pub async fn shelf_clear(app: AppHandle) -> Result<Vec<ShelfItem>, String> {
    tokio::task::spawn_blocking(move || {
        let state = app.state::<SharedState>();
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
    })
    .await
    .map_err(|e| format!("Shelf clear task failed: {e}"))?
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
pub async fn shelf_open_file(file_path_or_id: String) -> Result<bool, String> {
    tokio::task::spawn_blocking(move || {
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
        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("xdg-open")
                .arg(&path)
                .stdin(std::process::Stdio::null())
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .spawn()
                .map_err(|e| format!("Failed to open file with xdg-open: {e}"))?;
        }
        Ok(true)
    })
    .await
    .map_err(|e| format!("Shelf open task failed: {e}"))?
}

#[tauri::command]
pub async fn shelf_show_in_folder(file_path_or_id: String) -> Result<bool, String> {
    tokio::task::spawn_blocking(move || {
        let path = resolve_shelf_path(&file_path_or_id)
            .ok_or_else(|| "Shelf item not found on disk".to_string())?;
        #[cfg(windows)]
        {
            std::process::Command::new("explorer.exe")
                .args([format!("/select,{}", path)])
                .spawn()
                .map_err(|e| format!("Failed to open Explorer: {e}"))?;
        }
        #[cfg(target_os = "linux")]
        {
            let uri = linux_path_to_file_uri(&path);
            let dbus_ok = zbus::blocking::Connection::session()
                .ok()
                .and_then(|conn| {
                    zbus::blocking::Proxy::new(
                        &conn,
                        "org.freedesktop.FileManager1",
                        "/org/freedesktop/FileManager1",
                        "org.freedesktop.FileManager1",
                    )
                    .ok()
                    .map(|p| p.call::<_, _, ()>("ShowItems", &(vec![uri], "")).is_ok())
                })
                .unwrap_or(false);

            if !dbus_ok {
                let folder = Path::new(&path)
                    .parent()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|| path.clone());
                std::process::Command::new("xdg-open")
                    .arg(&folder)
                    .stdin(std::process::Stdio::null())
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null())
                    .spawn()
                    .map_err(|e| format!("Failed to open folder: {e}"))?;
            }
        }
        Ok(true)
    })
    .await
    .map_err(|e| format!("Shelf reveal task failed: {e}"))?
}

struct DragOutResetGuard {
    app: AppHandle,
    hwnd_raw: isize,
    fallback_bounds: Option<IslandBounds>,
    completed: bool,
}

impl Drop for DragOutResetGuard {
    fn drop(&mut self) {
        if !self.completed {
            finalize_shelf_drag_state(&self.app, self.hwnd_raw, false, self.fallback_bounds.as_ref());
        }
    }
}

fn finalize_shelf_drag_state(
    app: &AppHandle,
    hwnd_raw: isize,
    drop_ok: bool,
    fallback_bounds: Option<&IslandBounds>,
) {
    #[cfg(windows)]
    {
        let state = app.state::<SharedState>();
        let (bounds_opt, disp_x, disp_y) = if let Ok(ov) = state.overlay.lock() {
            (
                ov.bounds.clone(),
                ov.display_x_px,
                ov.display_y_px,
            )
        } else {
            (None, 0, 0)
        };
        let active_bounds = bounds_opt.as_ref().or(fallback_bounds);
        let inside_now =
            is_cursor_inside_island_bounds(app, hwnd_raw, disp_x, disp_y, active_bounds);
        let is_ctrl = crate::window_overlay::is_windows_ctrl_down();
        let effective_ignore = !inside_now || is_ctrl;

        if let Ok(mut ov) = state.overlay.lock() {
            ov.is_shelf_drag_out = false;
            ov.is_ctrl_held = is_ctrl;
            ov.cursor_inside_island = inside_now;
            ov.ignore_mouse = effective_ignore;
        }

        apply_overlay_styles(hwnd_raw, effective_ignore);
        let _ = app.emit("shelf:drag-ended", json!({ "success": drop_ok }));
        if inside_now && is_ctrl {
            let _ = app.emit(
                "island:ctrl-hover",
                json!({ "active": true, "inside": true, "ctrl": true }),
            );
        } else if inside_now {
            let _ = app.emit("island:cursor-entered", ());
        } else {
            let _ = app.emit("island:cursor-outside", ());
        }
    }

    #[cfg(target_os = "linux")]
    {
        let _ = hwnd_raw;
        let state = app.state::<SharedState>();
        let bounds_opt = state
            .overlay
            .lock()
            .ok()
            .and_then(|ov| ov.bounds.clone());
        let active_bounds = bounds_opt.as_ref().or(fallback_bounds);
        let (inside_now, is_ctrl) =
            crate::window_overlay::is_linux_cursor_inside_island_bounds(app, active_bounds);
        let effective_ignore = !inside_now || is_ctrl;

        if let Ok(mut ov) = state.overlay.lock() {
            ov.is_shelf_drag_out = false;
            ov.is_ctrl_held = is_ctrl;
            ov.cursor_inside_island = inside_now;
            ov.ignore_mouse = effective_ignore;
        }

        crate::window_overlay::apply_linux_overlay_state(app);
        let _ = app.emit("shelf:drag-ended", json!({ "success": drop_ok }));
        if inside_now && is_ctrl {
            let _ = app.emit(
                "island:ctrl-hover",
                json!({ "active": true, "inside": true, "ctrl": true }),
            );
        } else if inside_now {
            let _ = app.emit("island:cursor-entered", ());
        } else {
            let _ = app.emit("island:cursor-outside", ());
        }
    }

    #[cfg(not(any(windows, target_os = "linux")))]
    {
        let _ = (hwnd_raw, fallback_bounds);
        let state = app.state::<SharedState>();
        if let Ok(mut ov) = state.overlay.lock() {
            ov.is_shelf_drag_out = false;
            ov.cursor_inside_island = false;
            ov.ignore_mouse = true;
        }
        let _ = app.emit("shelf:drag-ended", json!({ "success": drop_ok }));
    }
}

#[tauri::command]
pub async fn shelf_start_drag(
    app: AppHandle,
    file_path_or_id: String,
    island_bounds: Option<IslandBounds>,
) -> Result<bool, String> {
    let path = resolve_shelf_path(&file_path_or_id)
        .ok_or_else(|| "File not found for drag".to_string())?;

    app.state::<SharedState>().log(
        "INFO",
        &format!("[Shelf] shelf_start_drag starting for {path}"),
        None,
    );

    let hwnd_raw = {
        let state = app.state::<SharedState>();
        let mut ov = state.overlay.lock().map_err(|e| format!("{e}"))?;
        ov.is_shelf_drag_out = true;
        ov.ignore_mouse = false;
        ov.cursor_inside_island = false;
        ov.main_hwnd
    };

    let mut guard = DragOutResetGuard {
        app: app.clone(),
        hwnd_raw,
        fallback_bounds: island_bounds.clone(),
        completed: false,
    };

    // Keep window non-transparent until SHDoDragDrop has acquired capture (~50ms);
    // the OLE feeder thread applies WS_EX_TRANSPARENT right after capture settles.
    #[cfg(windows)]
    apply_overlay_styles(hwnd_raw, false);

    #[cfg(windows)]
    let drop_ok = {
        let (tx, rx) = tokio::sync::oneshot::channel::<bool>();
        let path_owned = path.clone();
        match std::thread::Builder::new()
            .name("quick-pill-ole-drag".to_string())
            .spawn(move || {
                let res = perform_native_ole_drag(&path_owned, hwnd_raw);
                let _ = tx.send(res);
            }) {
            Ok(_) => rx.await.unwrap_or(false),
            Err(e) => {
                app.state::<SharedState>().log(
                    "ERROR",
                    &format!("[Shelf] Failed to spawn OLE drag thread: {e}"),
                    None,
                );
                false
            }
        }
    };

    #[cfg(not(windows))]
    let drop_ok = {
        let app_clone = app.clone();
        let fallback_bounds = island_bounds.clone();
        tokio::task::spawn_blocking(move || {
            #[cfg(target_os = "linux")]
            {
                perform_linux_drag(&app_clone, &path, fallback_bounds.as_ref())
            }
            #[cfg(not(target_os = "linux"))]
            {
                let _ = (app_clone, path, fallback_bounds);
                false
            }
        })
        .await
        .map_err(|e| format!("Drag task join error: {e}"))?
    };

    guard.completed = true;
    finalize_shelf_drag_state(&app, hwnd_raw, drop_ok, island_bounds.as_ref());

    app.state::<SharedState>().log(
        "INFO",
        &format!("[Shelf] shelf_start_drag finished (drop_ok={drop_ok})"),
        None,
    );

    Ok(drop_ok)
}

#[cfg(windows)]
#[implement(IDropSource)]
struct ShelfDropSource {
    started_at: std::time::Instant,
}

#[cfg(windows)]
impl IDropSource_Impl for ShelfDropSource_Impl {
    fn QueryContinueDrag(
        &self,
        fescapepressed: BOOL,
        _grfkeystate: MODIFIERKEYS_FLAGS,
    ) -> HRESULT {
        unsafe {
            let esc = fescapepressed.as_bool()
                || (GetAsyncKeyState(VK_ESCAPE.0 as i32) as u16 & 0x8000) != 0;
            let rmb = (GetAsyncKeyState(VK_RBUTTON.0 as i32) as u16 & 0x8000) != 0;
            let lmb = (GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000) != 0;

            if esc
                || rmb
                || self.started_at.elapsed() > std::time::Duration::from_secs(45)
            {
                DRAGDROP_S_CANCEL
            } else if !lmb {
                DRAGDROP_S_DROP
            } else {
                S_OK
            }
        }
    }

    fn GiveFeedback(&self, _dweffect: DROPEFFECT) -> HRESULT {
        DRAGDROP_S_USEDEFAULTCURSORS
    }
}

#[cfg(windows)]
struct OleUninitGuard;

#[cfg(windows)]
impl Drop for OleUninitGuard {
    fn drop(&mut self) {
        unsafe {
            OleUninitialize();
        }
    }
}

#[cfg(windows)]
struct AttachedThreadsGuard {
    drag_tid: u32,
    attached_tids: Vec<u32>,
}

#[cfg(windows)]
impl Drop for AttachedThreadsGuard {
    fn drop(&mut self) {
        unsafe {
            for &tid in &self.attached_tids {
                let _ = AttachThreadInput(self.drag_tid, tid, false);
            }
        }
    }
}

#[cfg(windows)]
fn collect_capture_thread_ids(drag_tid: u32, main_hwnd_raw: isize) -> Vec<u32> {
    unsafe {
        let mut tids = Vec::with_capacity(8);
        let mut push_tid = |tid: u32| {
            if tid != 0 && tid != drag_tid && !tids.contains(&tid) {
                tids.push(tid);
            }
        };

        let fg = GetForegroundWindow();
        if fg != HWND::default() {
            push_tid(GetWindowThreadProcessId(fg, None));
        }

        let mut pt = POINT::default();
        if GetCursorPos(&mut pt).is_ok() {
            let under = WindowFromPoint(pt);
            if under != HWND::default() {
                push_tid(GetWindowThreadProcessId(under, None));
            }
        }

        if main_hwnd_raw != 0 {
            let main_hwnd = HWND(main_hwnd_raw as *mut std::ffi::c_void);
            let mut stack = vec![main_hwnd];
            let mut visited = 0usize;
            while let Some(parent) = stack.pop() {
                push_tid(GetWindowThreadProcessId(parent, None));
                let mut child_after = HWND::default();
                while visited < 64 {
                    let Ok(child) =
                        FindWindowExW(parent, child_after, PCWSTR::null(), PCWSTR::null())
                    else {
                        break;
                    };
                    if child == HWND::default() {
                        break;
                    }
                    visited += 1;
                    stack.push(child);
                    child_after = child;
                }
            }
        }

        let mut gui = GUITHREADINFO {
            cbSize: std::mem::size_of::<GUITHREADINFO>() as u32,
            ..Default::default()
        };
        if GetGUIThreadInfo(0, &mut gui).is_ok() && gui.hwndCapture != HWND::default() {
            push_tid(GetWindowThreadProcessId(gui.hwndCapture, None));
        }

        tids
    }
}

#[cfg(windows)]
fn perform_native_ole_drag(file_path: &str, main_hwnd_raw: isize) -> bool {
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    };

    unsafe {
        let lmb_held = (GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000) != 0;
        if !lmb_held {
            return false;
        }

        if OleInitialize(None).is_err() {
            return false;
        }
        let _ole_guard = OleUninitGuard;

        let wide = to_wide(file_path);
        let pidl_full: *mut ITEMIDLIST = ILCreateFromPathW(PCWSTR(wide.as_ptr()));
        if pidl_full.is_null() {
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
                    let drag_tid = GetCurrentThreadId();
                    let mut attached_tids = Vec::new();
                    for tid in collect_capture_thread_ids(drag_tid, main_hwnd_raw) {
                        if AttachThreadInput(drag_tid, tid, true).as_bool() {
                            attached_tids.push(tid);
                        }
                        let _ = ReleaseCapture();
                    }
                    // Keep input queues attached across SHDoDragDrop so OLE capture owns mouse input
                    let _attach_guard = AttachedThreadsGuard {
                        drag_tid,
                        attached_tids,
                    };

                    let drag_active = Arc::new(AtomicBool::new(true));
                    let feeder_active = Arc::clone(&drag_active);
                    let feeder = std::thread::Builder::new()
                        .name("quick-pill-ole-feeder".to_string())
                        .spawn(move || {
                            let mut tick: u32 = 0;
                            let mut click_through_applied = false;

                            while feeder_active.load(Ordering::SeqCst) {
                                std::thread::sleep(std::time::Duration::from_millis(16));
                                if !feeder_active.load(Ordering::SeqCst) {
                                    break;
                                }
                                tick = tick.saturating_add(1);

                                let mut pt = POINT::default();
                                let _ = GetCursorPos(&mut pt);
                                let lmb =
                                    (GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000) != 0;
                                let rmb =
                                    (GetAsyncKeyState(VK_RBUTTON.0 as i32) as u16 & 0x8000) != 0;
                                let esc =
                                    (GetAsyncKeyState(VK_ESCAPE.0 as i32) as u16 & 0x8000) != 0;

                                let mut gti = GUITHREADINFO {
                                    cbSize: std::mem::size_of::<GUITHREADINFO>() as u32,
                                    ..Default::default()
                                };
                                let capture_hwnd = if GetGUIThreadInfo(drag_tid, &mut gti).is_ok() {
                                    gti.hwndCapture
                                } else {
                                    HWND::default()
                                };

                                if !click_through_applied
                                    && main_hwnd_raw != 0
                                    && (tick >= 3 || capture_hwnd != HWND::default())
                                {
                                    click_through_applied = true;
                                    apply_overlay_styles(main_hwnd_raw, true);
                                }

                                let packed = ((pt.y & 0xFFFF) << 16) | (pt.x & 0xFFFF);
                                let lparam = LPARAM(packed as isize);

                                let dispatch = |msg: u32, wp: WPARAM, lp: LPARAM| {
                                    if capture_hwnd != HWND::default() {
                                        let _ = PostMessageW(capture_hwnd, msg, wp, lp);
                                    }
                                    let _ = PostThreadMessageW(drag_tid, msg, wp, lp);
                                };

                                if esc || rmb {
                                    dispatch(WM_KEYDOWN, WPARAM(VK_ESCAPE.0 as usize), LPARAM(0));
                                    dispatch(WM_RBUTTONDOWN, WPARAM(0), lparam);
                                } else if !lmb {
                                    dispatch(WM_MOUSEMOVE, WPARAM(0), lparam);
                                    dispatch(WM_LBUTTONUP, WPARAM(0), lparam);
                                } else if capture_hwnd != HWND::default() {
                                    let _ = PostMessageW(capture_hwnd, WM_MOUSEMOVE, WPARAM(1), lparam);
                                } else {
                                    let _ = PostThreadMessageW(drag_tid, WM_MOUSEMOVE, WPARAM(1), lparam);
                                }
                            }
                        })
                        .ok();

                    let drop_source: IDropSource = ShelfDropSource {
                        started_at: std::time::Instant::now(),
                    }
                    .into();
                    let allowed = DROPEFFECT_COPY | DROPEFFECT_MOVE | DROPEFFECT_LINK;
                    let drag_res = SHDoDragDrop(HWND::default(), &data_obj, &drop_source, allowed);

                    drag_active.store(false, Ordering::SeqCst);
                    if let Some(handle) = feeder {
                        let _ = handle.join();
                    }

                    matches!(drag_res, Ok(eff) if eff.0 != 0)
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
        ok
    }
}

#[cfg(any(target_os = "linux", test))]
fn linux_path_to_file_uri(path: &str) -> String {
    let mut encoded = String::with_capacity(path.len() + 16);
    encoded.push_str("file://");
    for &b in path.as_bytes() {
        let unreserved = b.is_ascii_alphanumeric()
            || matches!(b, b'/' | b'-' | b'_' | b'.' | b'~');
        if unreserved {
            encoded.push(b as char);
        } else {
            encoded.push('%');
            encoded.push_str(&format!("{b:02X}"));
        }
    }
    encoded
}

#[cfg(target_os = "linux")]
fn extract_linux_file_icon_data_url(
    app: &AppHandle,
    path: &str,
    size: i32,
    is_folder: bool,
) -> Option<String> {
    use gio::prelude::FileExt;
    use gtk::prelude::IconThemeExt;

    let path_owned = path.to_string();
    let load_sync = move || -> Option<String> {
        let file = gio::File::for_path(Path::new(&path_owned));
        let info = file
            .query_info(
                "standard::icon",
                gio::FileQueryInfoFlags::NONE,
                gio::Cancellable::NONE,
            )
            .ok()?;
        let gicon = info.icon()?;
        let theme = gtk::IconTheme::default()?;
        let icon_info =
            theme.lookup_by_gicon(&gicon, size, gtk::IconLookupFlags::FORCE_SIZE)?;
        let pixbuf = icon_info.load_icon().ok()?;
        let png_bytes = pixbuf.save_to_bufferv("png", &[]).ok()?;
        if png_bytes.is_empty() {
            return None;
        }
        Some(format!("data:image/png;base64,{}", BASE64.encode(&png_bytes)))
    };

    let gtk_icon = if gtk::is_initialized_main_thread() {
        load_sync()
    } else {
        let (tx, rx) = std::sync::mpsc::channel();
        if app
            .run_on_main_thread(move || {
                let _ = tx.send(load_sync());
            })
            .is_ok()
        {
            rx.recv_timeout(std::time::Duration::from_millis(600))
                .ok()
                .flatten()
        } else {
            None
        }
    };

    gtk_icon.or_else(|| {
        let hint = if is_folder { "folder" } else { "text-x-generic" };
        crate::launcher::resolve_linux_app_icon(hint, hint)
    })
}

#[cfg(any(target_os = "linux", test))]
fn strip_shelf_stage_prefix(file_name: &str) -> &str {
    let bytes = file_name.as_bytes();
    if bytes.len() > 9 && bytes[8] == b'_' && bytes[..8].iter().all(|b| b.is_ascii_hexdigit()) {
        &file_name[9..]
    } else {
        file_name
    }
}

#[cfg(target_os = "linux")]
fn resolve_clean_export_name(staged_path: &str) -> String {
    if let Ok(items) = SHELF_ITEMS.lock() {
        if let Some(found) = items.iter().find(|it| it.staged_path == staged_path) {
            if let Some(name) = Path::new(&found.name).file_name().and_then(|n| n.to_str()) {
                if !name.is_empty() && name != "." && name != ".." {
                    return name.to_string();
                }
            }
        }
    }
    let raw = Path::new(staged_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");
    let stripped = strip_shelf_stage_prefix(raw);
    if stripped.is_empty() {
        raw.to_string()
    } else {
        stripped.to_string()
    }
}

#[cfg(target_os = "linux")]
fn prune_stale_drag_exports(export_root: &Path) {
    let Ok(entries) = fs::read_dir(export_root) else {
        return;
    };
    let max_age = std::time::Duration::from_secs(300);
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(meta) = entry.metadata() else {
            continue;
        };
        let is_stale = meta
            .modified()
            .ok()
            .and_then(|m| m.elapsed().ok())
            .map(|age| age > max_age)
            .unwrap_or(false);
        if is_stale {
            if meta.is_dir() {
                let _ = fs::remove_dir_all(&path);
            } else {
                let _ = fs::remove_file(&path);
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn prepare_linux_drag_export(file_path: &str) -> (String, bool) {
    let src = Path::new(file_path);
    if !src.is_file() {
        return (file_path.to_string(), false);
    }
    let export_root = shelf_staging_dir().join(".drag_export");
    prune_stale_drag_exports(&export_root);
    let drag_id = &uuid::Uuid::new_v4().to_string()[..12];
    let clean_name = resolve_clean_export_name(file_path);
    let drag_dir = export_root.join(drag_id);
    if fs::create_dir_all(&drag_dir).is_err() {
        return (file_path.to_string(), false);
    }
    let export_path = drag_dir.join(clean_name);
    let linked = fs::hard_link(src, &export_path).is_ok() || fs::copy(src, &export_path).is_ok();
    if linked {
        (export_path.to_string_lossy().to_string(), true)
    } else {
        let _ = fs::remove_dir_all(&drag_dir);
        (file_path.to_string(), false)
    }
}

#[cfg(target_os = "linux")]
fn start_linux_portal_file_transfer(export_path: &str) -> Result<String, String> {
    use std::collections::HashMap;
    use zbus::zvariant::{Fd, Value};

    let conn = zbus::blocking::Connection::session().map_err(|e| format!("session: {e}"))?;
    let proxy = zbus::blocking::Proxy::new(
        &conn,
        "org.freedesktop.portal.Documents",
        "/org/freedesktop/portal/documents",
        "org.freedesktop.portal.FileTransfer",
    )
    .map_err(|e| format!("proxy: {e}"))?;

    let mut start_opts: HashMap<&str, Value<'_>> = HashMap::new();
    start_opts.insert("writable", Value::from(false));
    start_opts.insert("autostop", Value::from(true));

    let key: String = proxy
        .call("StartTransfer", &start_opts)
        .map_err(|e| format!("StartTransfer: {e}"))?;

    let file = fs::File::open(export_path).map_err(|e| format!("open: {e}"))?;
    let fds: Vec<Fd<'_>> = vec![Fd::from(&file)];
    let add_opts: HashMap<&str, Value<'_>> = HashMap::new();

    let call_res: zbus::Result<()> = proxy.call("AddFiles", &(key.as_str(), fds, add_opts));
    if let Err(e) = call_res {
        let _: zbus::Result<()> = proxy.call("StopTransfer", &key);
        return Err(format!("AddFiles: {e}"));
    }

    Ok(key)
}

#[cfg(target_os = "linux")]
fn stop_linux_portal_file_transfer(key: &str) {
    let Ok(conn) = zbus::blocking::Connection::session() else {
        return;
    };
    let Ok(proxy) = zbus::blocking::Proxy::new(
        &conn,
        "org.freedesktop.portal.Documents",
        "/org/freedesktop/portal/documents",
        "org.freedesktop.portal.FileTransfer",
    ) else {
        return;
    };
    let _: zbus::Result<()> = proxy.call("StopTransfer", &key);
}

#[cfg(target_os = "linux")]
fn perform_linux_drag(
    app: &AppHandle,
    file_path: &str,
    _fallback_bounds: Option<&IslandBounds>,
) -> bool {
    use gdk::prelude::{SeatExt, WindowExtManual};
    use glib::prelude::ObjectExt;
    use gtk::prelude::{DragContextExtManual, GtkWindowExt, WidgetExt};
    use std::cell::{Cell, RefCell};
    use std::rc::Rc;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;

    let (export_path, is_isolated_export) = prepare_linux_drag_export(file_path);
    let (portal_key, portal_err) = match start_linux_portal_file_transfer(&export_path) {
        Ok(k) => (Some(k), None),
        Err(e) => (None, Some(e)),
    };

    let (tx, rx) = std::sync::mpsc::channel::<Option<bool>>();
    let app_ui = app.clone();
    let uri = linux_path_to_file_uri(&export_path);
    let portal_requested = Arc::new(AtomicBool::new(false));
    let portal_requested_ui = portal_requested.clone();
    let portal_key_ui = portal_key.clone();
    let portal_err_ui = portal_err.clone();
    let export_path_ui = export_path.clone();

    let dispatched = app.run_on_main_thread(move || {
        crate::window_overlay::set_linux_drag_in_progress(false);
        if let Ok(mut ov) = app_ui.state::<SharedState>().overlay.lock() {
            ov.is_shelf_drag_out = true;
        }
        crate::window_overlay::apply_linux_overlay_state(&app_ui);
        if let Some(display) = gdk::Display::default() {
            display.sync();
        }
        crate::window_overlay::set_linux_drag_in_progress(true);

        let restore_overlay = |app_h: &AppHandle| {
            crate::window_overlay::set_linux_drag_in_progress(false);
            if let Ok(mut ov) = app_h.state::<SharedState>().overlay.lock() {
                ov.is_shelf_drag_out = false;
            }
            crate::window_overlay::apply_linux_overlay_state(app_h);
            if let Some(display) = gdk::Display::default() {
                display.flush();
            }
        };

        let Some(win) = app_ui.get_webview_window("main") else {
            restore_overlay(&app_ui);
            let _ = tx.send(None);
            return;
        };
        let Ok(gtk_win) = win.gtk_window() else {
            restore_overlay(&app_ui);
            let _ = tx.send(None);
            return;
        };

        let (_webview_widget, real_event_opt) =
            crate::window_overlay::get_linux_drag_source_and_event(&gtk_win);

        if let Some(grabbed) = gtk::grab_get_current() {
            grabbed.grab_remove();
        }

        // Keep the target list at <= 3 entries so XDND carries all atoms inline inside XdndEnter.
        let targets = gtk::TargetList::new(&[]);
        targets.add(
            &gdk::Atom::intern("text/uri-list"),
            gtk::TargetFlags::empty().bits(),
            0,
        );
        if portal_key_ui.is_some() {
            targets.add(
                &gdk::Atom::intern("application/vnd.portal.filetransfer"),
                gtk::TargetFlags::empty().bits(),
                1,
            );
            targets.add(
                &gdk::Atom::intern("text/plain;charset=utf-8"),
                gtk::TargetFlags::empty().bits(),
                2,
            );
        } else {
            targets.add(
                &gdk::Atom::intern("text/plain;charset=utf-8"),
                gtk::TargetFlags::empty().bits(),
                2,
            );
            targets.add(
                &gdk::Atom::intern("UTF8_STRING"),
                gtk::TargetFlags::empty().bits(),
                2,
            );
        }

        let drag_actions = if is_isolated_export {
            gdk::DragAction::COPY | gdk::DragAction::MOVE | gdk::DragAction::LINK
        } else {
            gdk::DragAction::COPY | gdk::DragAction::LINK
        };

        let signal_ids: Rc<RefCell<Vec<glib::SignalHandlerId>>> =
            Rc::new(RefCell::new(Vec::new()));
        let failed = Rc::new(Cell::new(false));
        let sent = Rc::new(Cell::new(false));
        let data_requested = Rc::new(Cell::new(false));
        let drop_at: Rc<Cell<Option<std::time::Instant>>> = Rc::new(Cell::new(None));

        let uri_for_data = uri.clone();
        let portal_key_for_data = portal_key_ui.clone();
        let portal_req_cb = portal_requested_ui.clone();
        let data_req_cb = data_requested.clone();
        let app_data = app_ui.clone();
        let id_data = gtk_win.connect_drag_data_get(move |_w, _ctx, sel, info, _time| {
            data_req_cb.set(true);
            let set_ok = match info {
                1 => {
                    if let Some(ref key) = portal_key_for_data {
                        portal_req_cb.store(true, Ordering::SeqCst);
                        sel.set(&sel.target(), 8, key.as_bytes());
                        true
                    } else {
                        false
                    }
                }
                2 => {
                    if sel.set_text(&uri_for_data) {
                        true
                    } else {
                        sel.set(&sel.target(), 8, uri_for_data.as_bytes());
                        true
                    }
                }
                _ => {
                    let uris = [uri_for_data.as_str()];
                    if sel.set_uris(&uris) {
                        true
                    } else {
                        let line = format!("{uri_for_data}\r\n");
                        sel.set(&sel.target(), 8, line.as_bytes());
                        true
                    }
                }
            };
            app_data.state::<SharedState>().log(
                "INFO",
                "[Shelf/Linux] drag-data-get",
                Some(&serde_json::json!({
                    "info": info,
                    "target": sel.target().name().to_string(),
                    "setOk": set_ok,
                })),
            );
        });

        let failed_for_cb = failed.clone();
        let app_failed = app_ui.clone();
        let id_failed = gtk_win.connect_drag_failed(move |_w, ctx, res| {
            app_failed.state::<SharedState>().log(
                "WARN",
                "[Shelf/Linux] drag-failed",
                Some(&serde_json::json!({
                    "result": format!("{:?}", res),
                    "selectedAction": format!("{:?}", ctx.selected_action()),
                    "suggestedAction": format!("{:?}", ctx.suggested_action()),
                    "protocol": format!("{:?}", ctx.protocol()),
                })),
            );
            failed_for_cb.set(true);
            glib::Propagation::Stop
        });

        let sigs_for_end = signal_ids.clone();
        let failed_for_end = failed.clone();
        let sent_for_end = sent.clone();
        let data_req_end = data_requested.clone();
        let tx_end = tx.clone();
        let app_end = app_ui.clone();
        let id_end = gtk_win.connect_drag_end(move |w, ctx| {
            let ids: Vec<_> = sigs_for_end.borrow_mut().drain(..).collect();
            let w_clone = w.clone();
            glib::idle_add_local_once(move || {
                for id in ids {
                    w_clone.disconnect(id);
                }
            });
            crate::window_overlay::set_linux_drag_in_progress(false);
            if let Ok(mut ov) = app_end.state::<SharedState>().overlay.lock() {
                ov.is_shelf_drag_out = false;
            }
            crate::window_overlay::apply_linux_overlay_state(&app_end);
            if let Some(display) = gdk::Display::default() {
                display.flush();
            }
            app_end.state::<SharedState>().log(
                "INFO",
                "[Shelf/Linux] drag-end",
                Some(&serde_json::json!({
                    "failed": failed_for_end.get(),
                    "dataRequested": data_req_end.get(),
                    "selectedAction": format!("{:?}", ctx.selected_action()),
                    "suggestedAction": format!("{:?}", ctx.suggested_action()),
                    "protocol": format!("{:?}", ctx.protocol()),
                })),
            );
            if !sent_for_end.replace(true) {
                let _ = tx_end.send(Some(!failed_for_end.get() && data_req_end.get()));
            }
        });

        signal_ids.borrow_mut().extend([id_data, id_failed, id_end]);

        let cur_event = gtk::current_event();
        let synth_event = if real_event_opt.is_none() && cur_event.is_none() {
            let mut ev = gdk::Event::new(gdk::EventType::MotionNotify);
            if let Some(display) = gdk::Display::default() {
                if let Some(seat) = display.default_seat() {
                    if let Some(ptr) = seat.pointer() {
                        ev.set_device(Some(&ptr));
                    }
                }
            }
            Some(ev)
        } else {
            None
        };
        let event_ref = real_event_opt
            .as_ref()
            .or(cur_event.as_ref())
            .or(synth_event.as_ref());

        let ctx_opt = gtk_win.drag_begin_with_coordinates(
            &targets,
            drag_actions,
            1,
            event_ref,
            -1,
            -1,
        );
        let started = ctx_opt.is_some();

        app_ui.state::<SharedState>().log(
            "INFO",
            "[Shelf/Linux] drag_begin_with_coordinates",
            Some(&serde_json::json!({
                "started": started,
                "exportPath": export_path_ui,
                "isIsolatedExport": is_isolated_export,
                "portalReady": portal_key_ui.is_some(),
                "portalErr": portal_err_ui,
                "actions": format!("{:?}", drag_actions),
                "realEvent": real_event_opt.as_ref().map(|e| format!("{:?}@{}", e.event_type(), e.time())),
                "curEvent": cur_event.as_ref().map(|e| format!("{:?}@{}", e.event_type(), e.time())),
                "sessionType": std::env::var("XDG_SESSION_TYPE").ok(),
                "gdkBackend": std::env::var("GDK_BACKEND").ok(),
                "winActive": gtk_win.is_active(),
            })),
        );

        if let Some(ctx) = ctx_opt {
            ctx.drag_set_icon_default();
            // Now that GTK's internal ipc_widget holds the active grab and XdndSelection,
            // make our overlay input-passthrough & lowered so targets underneath can accept drops.
            crate::window_overlay::apply_linux_overlay_state(&app_ui);
            if let Some(display) = gdk::Display::default() {
                display.flush();
            }

            let app_act = app_ui.clone();
            let last_action: Rc<Cell<Option<gdk::DragAction>>> = Rc::new(Cell::new(None));
            ctx.connect_action_changed(move |c, action| {
                if last_action.get() != Some(action) {
                    last_action.set(Some(action));
                    app_act.state::<SharedState>().log(
                        "INFO",
                        "[Shelf/Linux] ctx action-changed",
                        Some(&serde_json::json!({
                            "action": format!("{:?}", action),
                            "suggestedAction": format!("{:?}", c.suggested_action()),
                            "selectedAction": format!("{:?}", c.selected_action()),
                        })),
                    );
                }
            });

            let app_drop = app_ui.clone();
            let drop_at_cb = drop_at.clone();
            ctx.connect_drop_performed(move |c, time| {
                drop_at_cb.set(Some(std::time::Instant::now()));
                app_drop.state::<SharedState>().log(
                    "INFO",
                    "[Shelf/Linux] ctx drop-performed",
                    Some(&serde_json::json!({
                        "time": time,
                        "selectedAction": format!("{:?}", c.selected_action()),
                        "suggestedAction": format!("{:?}", c.suggested_action()),
                        "protocol": format!("{:?}", c.protocol()),
                    })),
                );
            });

            let app_fin = app_ui.clone();
            ctx.connect_dnd_finished(move |c| {
                app_fin.state::<SharedState>().log(
                    "INFO",
                    "[Shelf/Linux] ctx dnd-finished",
                    Some(&serde_json::json!({
                        "selectedAction": format!("{:?}", c.selected_action()),
                    })),
                );
            });

            let app_cancel = app_ui.clone();
            ctx.connect_cancel(move |c, reason| {
                app_cancel.state::<SharedState>().log(
                    "WARN",
                    "[Shelf/Linux] ctx cancel",
                    Some(&serde_json::json!({
                        "reason": format!("{:?}", reason),
                        "selectedAction": format!("{:?}", c.selected_action()),
                    })),
                );
            });

            let sent_watch = sent.clone();
            let failed_watch = failed.clone();
            let data_req_watch = data_requested.clone();
            let sigs_watch = signal_ids.clone();
            let tx_watch = tx.clone();
            let win_watch = gtk_win.clone();
            let app_watch = app_ui.clone();
            let ctx_watch = ctx;
            let drop_at_watch = drop_at.clone();
            let started_at = std::time::Instant::now();

            glib::timeout_add_local(std::time::Duration::from_millis(80), move || {
                if sent_watch.get() {
                    return glib::ControlFlow::Break;
                }
                let elapsed = started_at.elapsed();
                let timeout_hit = elapsed > std::time::Duration::from_secs(45);
                let post_drop_stall = drop_at_watch
                    .get()
                    .map(|t| t.elapsed() > std::time::Duration::from_millis(3000))
                    .unwrap_or(false);
                if !timeout_hit && !post_drop_stall {
                    return glib::ControlFlow::Continue;
                }

                app_watch.state::<SharedState>().log(
                    "WARN",
                    "[Shelf/Linux] watchdog cancelling stalled drag",
                    Some(&serde_json::json!({
                        "timeoutHit": timeout_hit,
                        "postDropStall": post_drop_stall,
                        "dataRequested": data_req_watch.get(),
                        "elapsedMs": elapsed.as_millis() as u64,
                    })),
                );

                ctx_watch.drag_cancel();

                let ids: Vec<_> = sigs_watch.borrow_mut().drain(..).collect();
                for id in ids {
                    win_watch.disconnect(id);
                }
                crate::window_overlay::set_linux_drag_in_progress(false);
                if let Ok(mut ov) = app_watch.state::<SharedState>().overlay.lock() {
                    ov.is_shelf_drag_out = false;
                }
                crate::window_overlay::apply_linux_overlay_state(&app_watch);
                if let Some(display) = gdk::Display::default() {
                    display.flush();
                }
                if !sent_watch.replace(true) {
                    let _ = tx_watch.send(Some(!failed_watch.get() && data_req_watch.get()));
                }
                glib::ControlFlow::Break
            });
        } else {
            let ids: Vec<_> = signal_ids.borrow_mut().drain(..).collect();
            for id in ids {
                gtk_win.disconnect(id);
            }
            restore_overlay(&app_ui);
            if !sent.replace(true) {
                let _ = tx.send(None);
            }
        }
    });

    if dispatched.is_ok() {
        let drag_res = rx.recv_timeout(std::time::Duration::from_secs(60));
        crate::window_overlay::set_linux_drag_in_progress(false);
        if let Ok(mut ov) = app.state::<SharedState>().overlay.lock() {
            ov.is_shelf_drag_out = false;
        }
        crate::window_overlay::apply_linux_overlay_state(app);

        if let Some(ref key) = portal_key {
            if !portal_requested.load(Ordering::SeqCst) {
                stop_linux_portal_file_transfer(key);
            }
        }

        if let Ok(Some(ok)) = drag_res {
            return ok;
        }
    } else {
        crate::window_overlay::set_linux_drag_in_progress(false);
        if let Some(ref key) = portal_key {
            stop_linux_portal_file_transfer(key);
        }
    }

    // Fallback for compositors where synthetic GTK drag_begin_with_coordinates cannot start
    crate::window_overlay::apply_linux_overlay_state(app);
    for (bin, args) in [
        ("dragon-drop", vec!["-x", "-a", export_path.as_str()]),
        ("dragon", vec!["-x", "-a", export_path.as_str()]),
        ("ripdrag", vec!["-x", export_path.as_str()]),
    ] {
        if let Ok(status) = std::process::Command::new(bin).args(&args).status() {
            return status.success();
        }
    }
    false
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

    #[test]
    fn linux_file_uri_encoding_handles_spaces_and_special_chars() {
        assert_eq!(
            linux_path_to_file_uri("/home/user/My File (1).txt"),
            "file:///home/user/My%20File%20%281%29.txt"
        );
        assert_eq!(
            linux_path_to_file_uri("/tmp/report_v2.0~final-copy.pdf"),
            "file:///tmp/report_v2.0~final-copy.pdf"
        );
    }

    #[test]
    fn normalize_shelf_input_path_decodes_file_uris() {
        assert_eq!(
            normalize_shelf_input_path("file:///home/user/My%20File%20%281%29.txt").as_deref(),
            Some("/home/user/My File (1).txt")
        );
        assert_eq!(
            normalize_shelf_input_path("file://localhost/tmp/test%20doc.pdf").as_deref(),
            Some("/tmp/test doc.pdf")
        );
        assert_eq!(normalize_shelf_input_path("# comment line"), None);
        assert_eq!(normalize_shelf_input_path("   "), None);
    }

    #[test]
    fn strip_shelf_stage_prefix_removes_valid_hex_prefix_only() {
        assert_eq!(
            strip_shelf_stage_prefix("a1b2c3d4_Screenshot.png"),
            "Screenshot.png"
        );
        assert_eq!(
            strip_shelf_stage_prefix("ABCDEF09_report final.pdf"),
            "report final.pdf"
        );
        assert_eq!(
            strip_shelf_stage_prefix("nonhex12_file.txt"),
            "nonhex12_file.txt"
        );
        assert_eq!(strip_shelf_stage_prefix("short_a.txt"), "short_a.txt");
        assert_eq!(strip_shelf_stage_prefix("a1b2c3d4_"), "a1b2c3d4_");
    }
}
