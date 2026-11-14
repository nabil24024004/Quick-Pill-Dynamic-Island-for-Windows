use crate::state::{to_wide, IslandBounds, SharedState};
use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;
use std::sync::atomic::{AtomicIsize, Ordering};
use std::sync::OnceLock;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

#[cfg(windows)]
use windows::{
    core::{HSTRING, PCWSTR},
    ApplicationModel::{StartupTask, StartupTaskState},
    Win32::{
        Foundation::{HWND, LPARAM, LRESULT, POINT, RECT, WPARAM},
        System::Com::{CoInitializeEx, COINIT_MULTITHREADED},
        System::Registry::{
            RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegSetValueExW, HKEY,
            HKEY_CURRENT_USER, KEY_SET_VALUE, REG_SZ,
        },
        UI::{
            Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON},
            Shell::ShellExecuteW,
            WindowsAndMessaging::{
                CallWindowProcW, GetCursorPos, GetWindowLongPtrW, GetWindowRect, IsIconic,
                SetForegroundWindow, SetWindowLongPtrW, SetWindowPos, ShowWindow, GWL_EXSTYLE,
                GWLP_WNDPROC, HWND_TOPMOST, SIZE_MINIMIZED, SWP_FRAMECHANGED, SWP_NOACTIVATE,
                SWP_NOMOVE, SWP_NOOWNERZORDER, SWP_NOSIZE, SWP_SHOWWINDOW, SW_RESTORE,
                SW_SHOWNOACTIVATE, SW_SHOWNORMAL, WM_POWERBROADCAST, WM_SIZE, WNDPROC,
                WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_EX_TRANSPARENT,
            },
        },
    },
};

static PREV_WNDPROC: AtomicIsize = AtomicIsize::new(0);
static SUBCLASS_APP: OnceLock<AppHandle> = OnceLock::new();

#[cfg(windows)]
const PBT_APMRESUMESUSPEND: u32 = 0x0007;
#[cfg(windows)]
const PBT_APMRESUMEAUTOMATIC: u32 = 0x0012;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayBounds {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
    pub id: String,
    pub label: String,
    pub bounds: DisplayBounds,
    pub work_area: DisplayBounds,
    pub scale_factor: f64,
    pub is_primary: bool,
    pub physical_bounds: DisplayBounds,
}

fn stable_display_id(name: &str, index: usize) -> String {
    let mut hasher = DefaultHasher::new();
    name.hash(&mut hasher);
    index.hash(&mut hasher);
    // Keep legacy Electron-like numeric string format
    format!("{}", (hasher.finish() & 0xFFFF_FFFF) as u32)
}

pub fn enumerate_displays(app: &AppHandle) -> Vec<DisplayInfo> {
    let Ok(monitors) = app.available_monitors() else {
        return Vec::new();
    };
    let primary = app.primary_monitor().ok().flatten();
    let primary_name = primary.as_ref().and_then(|m| m.name().cloned());

    let mut result = Vec::with_capacity(monitors.len());
    for (idx, m) in monitors.into_iter().enumerate() {
        let name = m
            .name()
            .cloned()
            .unwrap_or_else(|| format!("DISPLAY-{}", idx + 1));
        let scale = m.scale_factor().max(1.0);
        let pos = m.position();
        let size = m.size();
        let wa = m.work_area();

        let phys = DisplayBounds {
            x: pos.x,
            y: pos.y,
            width: size.width as i32,
            height: size.height as i32,
        };
        let logical = DisplayBounds {
            x: ((pos.x as f64) / scale).round() as i32,
            y: ((pos.y as f64) / scale).round() as i32,
            width: ((size.width as f64) / scale).round() as i32,
            height: ((size.height as f64) / scale).round() as i32,
        };
        let work_area = DisplayBounds {
            x: ((wa.position.x as f64) / scale).round() as i32,
            y: ((wa.position.y as f64) / scale).round() as i32,
            width: ((wa.size.width as f64) / scale).round() as i32,
            height: ((wa.size.height as f64) / scale).round() as i32,
        };

        let is_primary = primary_name
            .as_ref()
            .map(|p| p == &name)
            .unwrap_or(idx == 0);

        result.push(DisplayInfo {
            id: stable_display_id(&name, idx),
            label: format!("Display {} ({})", idx + 1, name.trim_start_matches(r"\\.\")),
            bounds: logical,
            work_area,
            scale_factor: scale,
            is_primary,
            physical_bounds: phys,
        });
    }
    result
}

#[cfg(windows)]
pub fn apply_overlay_styles(hwnd_raw: isize, click_through: bool) {
    if hwnd_raw == 0 {
        return;
    }
    unsafe {
        use windows::Win32::UI::WindowsAndMessaging::{SWP_NOZORDER, WS_EX_APPWINDOW};
        let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
        let current = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        let mut next = (current | WS_EX_TOOLWINDOW.0) & !WS_EX_APPWINDOW.0;
        if click_through {
            next |= WS_EX_LAYERED.0 | WS_EX_TRANSPARENT.0;
        } else {
            next &= !(WS_EX_TRANSPARENT.0 | WS_EX_LAYERED.0);
        }
        if next != current {
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, next as isize);
            let _ = SetWindowPos(
                hwnd,
                HWND::default(),
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
            );
        }
    }
}

#[cfg(windows)]
pub fn force_topmost_hwnd(hwnd_raw: isize) {
    if hwnd_raw == 0 {
        return;
    }
    unsafe {
        let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
        if IsIconic(hwnd).as_bool() {
            let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
        }
        let _ = SetWindowPos(
            hwnd,
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER,
        );
    }
}

#[cfg(windows)]
unsafe extern "system" fn overlay_wnd_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_POWERBROADCAST => {
            let code = wparam.0 as u32;
            if code == PBT_APMRESUMEAUTOMATIC || code == PBT_APMRESUMESUSPEND {
                if let Some(app) = SUBCLASS_APP.get() {
                    let _ = app.emit("system-resume", ());
                    if let Some(state) = app.try_state::<SharedState>() {
                        state.log("INFO", "[Power] System resumed; reasserting topmost", None);
                        if state.settings.read().map(|s| s.always_on_top).unwrap_or(true) {
                            force_topmost_hwnd(hwnd.0 as isize);
                        }
                    }
                }
            }
        }
        WM_SIZE => {
            if wparam.0 as u32 == SIZE_MINIMIZED {
                let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
            }
        }
        _ => {}
    }

    let prev = PREV_WNDPROC.load(Ordering::SeqCst);
    if prev != 0 {
        let prev_fn: WNDPROC = Some(std::mem::transmute(prev));
        CallWindowProcW(prev_fn, hwnd, msg, wparam, lparam)
    } else {
        LRESULT(0)
    }
}

#[cfg(windows)]
pub fn init_overlay_window(app: &AppHandle, win: &WebviewWindow) {
    let hwnd_raw = win
        .hwnd()
        .map(|h| h.0 as isize)
        .unwrap_or(0);

    if hwnd_raw == 0 {
        return;
    }

    let state = app.state::<SharedState>();
    let displays = enumerate_displays(app);
    let target = displays
        .iter()
        .find(|d| d.is_primary)
        .or_else(|| displays.first())
        .cloned();

    if let Some(d) = target {
        state.log(
            "INFO",
            &format!(
                "[Overlay] Initializing on display {} ({}x{} at {},{} scale={})",
                d.id,
                d.physical_bounds.width,
                d.physical_bounds.height,
                d.physical_bounds.x,
                d.physical_bounds.y,
                d.scale_factor
            ),
            None,
        );
        {
            if let Ok(mut ov) = state.overlay.lock() {
                ov.main_hwnd = hwnd_raw;
                ov.current_display_id = d.id.clone();
                ov.display_x_px = d.physical_bounds.x;
                ov.display_y_px = d.physical_bounds.y;
                ov.display_width_px = d.physical_bounds.width;
                ov.display_height_px = d.physical_bounds.height;
                ov.ignore_mouse = true;
                ov.forward_mouse = true;
            }
        }
        let _ = win.set_position(tauri::PhysicalPosition::new(
            d.physical_bounds.x,
            d.physical_bounds.y,
        ));
        let _ = win.set_size(tauri::PhysicalSize::new(
            d.physical_bounds.width.max(1) as u32,
            d.physical_bounds.height.max(1) as u32,
        ));
        unsafe {
            let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
            apply_overlay_styles(hwnd_raw, true);
            let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
            let _ = SetWindowPos(
                hwnd,
                HWND_TOPMOST,
                d.physical_bounds.x,
                d.physical_bounds.y,
                d.physical_bounds.width,
                d.physical_bounds.height,
                SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_NOOWNERZORDER | SWP_FRAMECHANGED,
            );
        }
    } else {
        state.log("WARN", "[Overlay] No monitor found during init_overlay_window", None);
    }

    let _ = SUBCLASS_APP.set(app.clone());
    unsafe {
        let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
        if PREV_WNDPROC.load(Ordering::SeqCst) == 0 {
            let old = SetWindowLongPtrW(
                hwnd,
                GWLP_WNDPROC,
                overlay_wnd_proc as *const () as usize as isize,
            );
            PREV_WNDPROC.store(old, Ordering::SeqCst);
        }
    }

    start_cursor_watcher(app.clone());
    start_topmost_heartbeat(app.clone());
}

fn start_cursor_watcher(app: AppHandle) {
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_millis(90));
            let state = app.state::<SharedState>();

            let (bounds_opt, hwnd_raw, ignore_mouse, prev_inside, is_ctrl, is_drag_out, disp_x, disp_y) = {
                let Ok(ov) = state.overlay.lock() else {
                    continue;
                };
                (
                    ov.bounds.clone(),
                    ov.main_hwnd,
                    ov.ignore_mouse,
                    ov.cursor_inside_island,
                    ov.is_ctrl_held,
                    ov.is_shelf_drag_out,
                    ov.display_x_px,
                    ov.display_y_px,
                )
            };

            if is_drag_out || is_ctrl || hwnd_raw == 0 {
                continue;
            }

            let Some(bounds) = bounds_opt else {
                continue;
            };
            let Some((bx, by, bw, bh)) = bounds.normalized_rect() else {
                continue;
            };

            #[cfg(windows)]
            let cursor_pt = unsafe {
                let mut pt = POINT::default();
                if GetCursorPos(&mut pt).is_err() {
                    continue;
                }
                pt
            };

            let (win_x, win_y, scale) = {
                let mut wx = disp_x;
                let mut wy = disp_y;
                #[cfg(windows)]
                unsafe {
                    let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
                    let mut rect = RECT::default();
                    if GetWindowRect(hwnd, &mut rect).is_ok() {
                        wx = rect.left;
                        wy = rect.top;
                    }
                }
                let s = app
                    .get_webview_window("main")
                    .and_then(|w| w.scale_factor().ok())
                    .unwrap_or(1.0)
                    .max(1.0);
                (wx, wy, s)
            };

            let rel_x = (cursor_pt.x - win_x) as f64 / scale;
            let rel_y = (cursor_pt.y - win_y) as f64 / scale;

            let pad = 4.0;
            let now_inside = rel_x >= (bx - pad)
                && rel_x <= (bx + bw + pad)
                && rel_y >= (by - pad)
                && rel_y <= (by + bh + pad);

            if now_inside {
                if ignore_mouse || !prev_inside {
                    {
                        if let Ok(mut ov) = state.overlay.lock() {
                            ov.cursor_inside_island = true;
                            ov.ignore_mouse = false;
                        }
                    }
                    #[cfg(windows)]
                    apply_overlay_styles(hwnd_raw, false);
                    let _ = app.emit("island:cursor-entered", ());
                }
            } else if prev_inside {
                #[cfg(windows)]
                let lmb_down = unsafe { (GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000) != 0 };
                #[cfg(not(windows))]
                let lmb_down = false;

                if !lmb_down {
                    {
                        if let Ok(mut ov) = state.overlay.lock() {
                            ov.cursor_inside_island = false;
                        }
                    }
                    let _ = app.emit("island:cursor-outside", ());
                }
            }
        }
    });
}

fn start_topmost_heartbeat(app: AppHandle) {
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_millis(2500));
            let state = app.state::<SharedState>();
            let always_on_top = state
                .settings
                .read()
                .map(|s| s.always_on_top)
                .unwrap_or(true);
            if !always_on_top {
                continue;
            }
            let hwnd_raw = state.overlay.lock().map(|o| o.main_hwnd).unwrap_or(0);
            #[cfg(windows)]
            force_topmost_hwnd(hwnd_raw);
        }
    });
}

#[tauri::command]
pub fn set_ignore_mouse_events(
    state: tauri::State<'_, SharedState>,
    ignore: bool,
    forward: bool,
    is_ctrl: bool,
) {
    let effective_ignore = ignore || is_ctrl;
    let hwnd_raw = {
        let Ok(mut ov) = state.overlay.lock() else {
            return;
        };
        ov.ignore_mouse = effective_ignore;
        ov.forward_mouse = forward;
        ov.is_ctrl_held = is_ctrl;
        if ov.is_shelf_drag_out {
            0
        } else {
            ov.main_hwnd
        }
    };

    #[cfg(windows)]
    if hwnd_raw != 0 {
        apply_overlay_styles(hwnd_raw, effective_ignore);
    }
}

static LOGGED_FIRST_BOUNDS: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[tauri::command]
pub fn update_island_bounds(state: tauri::State<'_, SharedState>, bounds: Option<IslandBounds>) {
    if let Some(ref b) = bounds {
        if let Some((x, y, w, h)) = b.normalized_rect() {
            if !LOGGED_FIRST_BOUNDS.swap(true, Ordering::SeqCst) {
                state.log(
                    "INFO",
                    &format!("[Overlay] First Island bounds: x={x}, y={y}, w={w}, h={h}"),
                    None,
                );
            }
        }
    }
    if let Ok(mut ov) = state.overlay.lock() {
        ov.bounds = bounds;
    }
}

#[tauri::command]
pub fn get_displays(app: AppHandle) -> Vec<DisplayInfo> {
    enumerate_displays(&app)
}

#[tauri::command]
pub fn set_display(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    display_id: String,
) -> Result<bool, String> {
    let displays = enumerate_displays(&app);
    if displays.is_empty() {
        return Ok(false);
    }

    let target = displays
        .iter()
        .find(|d| d.id == display_id || d.label == display_id)
        .or_else(|| displays.iter().find(|d| d.is_primary))
        .or_else(|| displays.first())
        .cloned()
        .ok_or_else(|| "No monitor available".to_string())?;

    let hwnd_raw = {
        let mut ov = state.overlay.lock().map_err(|e| format!("{e}"))?;
        ov.current_display_id = target.id.clone();
        ov.display_x_px = target.physical_bounds.x;
        ov.display_y_px = target.physical_bounds.y;
        ov.display_width_px = target.physical_bounds.width;
        ov.display_height_px = target.physical_bounds.height;
        ov.main_hwnd
    };

    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_position(tauri::PhysicalPosition::new(
            target.physical_bounds.x,
            target.physical_bounds.y,
        ));
        let _ = w.set_size(tauri::PhysicalSize::new(
            target.physical_bounds.width.max(1) as u32,
            target.physical_bounds.height.max(1) as u32,
        ));
    }

    #[cfg(windows)]
    if hwnd_raw != 0 {
        unsafe {
            let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
            let _ = SetWindowPos(
                hwnd,
                HWND_TOPMOST,
                target.physical_bounds.x,
                target.physical_bounds.y,
                target.physical_bounds.width,
                target.physical_bounds.height,
                SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_NOOWNERZORDER,
            );
        }
    }

    Ok(true)
}

#[tauri::command]
pub fn update_window_position(_x_perc: f64, _y_px: f64) -> bool {
    // Fullscreen transparent overlay positions the island via CSS; preserved for API compatibility.
    true
}

#[cfg(windows)]
fn set_msix_startup_task(enable: bool) -> Result<bool, String> {
    let handle = std::thread::spawn(move || -> Result<bool, String> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
        let op = StartupTask::GetAsync(&HSTRING::from("QuickPillStartup"))
            .map_err(|e| format!("StartupTask::GetAsync failed: {e}"))?;
        let task = op
            .get()
            .map_err(|e| format!("StartupTask await failed: {e}"))?;

        if enable {
            let state = task
                .RequestEnableAsync()
                .map_err(|e| format!("StartupTask::RequestEnableAsync failed: {e}"))?
                .get()
                .map_err(|e| format!("StartupTask enable await failed: {e}"))?;
            Ok(state == StartupTaskState::Enabled)
        } else {
            task.Disable()
                .map_err(|e| format!("StartupTask::Disable failed: {e}"))?;
            Ok(true)
        }
    });

    handle
        .join()
        .map_err(|_| "StartupTask worker thread panicked".to_string())?
}

#[tauri::command]
pub fn set_auto_launch(enable: bool) -> Result<bool, String> {
    if crate::state::is_store_packaged() {
        return set_msix_startup_task(enable);
    }

    #[cfg(windows)]
    unsafe {
        let subkey = to_wide(r"Software\Microsoft\Windows\CurrentVersion\Run");
        let val_name = to_wide("Quick Pill");
        let mut hkey = HKEY::default();
        let status = RegOpenKeyExW(
            HKEY_CURRENT_USER,
            PCWSTR(subkey.as_ptr()),
            0,
            KEY_SET_VALUE,
            &mut hkey,
        );
        if status.is_err() {
            return Err(format!("Failed to open Run key: {:?}", status));
        }

        let res = if enable {
            let exe = std::env::current_exe().map_err(|e| format!("current_exe failed: {e}"))?;
            let cmd = format!("\"{}\"", exe.to_string_lossy());
            let wide_cmd = to_wide(&cmd);
            let byte_len = (wide_cmd.len() * 2) as u32;
            let bytes = std::slice::from_raw_parts(wide_cmd.as_ptr() as *const u8, byte_len as usize);
            RegSetValueExW(hkey, PCWSTR(val_name.as_ptr()), 0, REG_SZ, Some(bytes))
        } else {
            let del = RegDeleteValueW(hkey, PCWSTR(val_name.as_ptr()));
            // ERROR_FILE_NOT_FOUND (2) is fine when removing non-existent entry
            if del.0 == 2 {
                windows::Win32::Foundation::ERROR_SUCCESS
            } else {
                del
            }
        };

        let _ = RegCloseKey(hkey);
        if res.is_err() {
            return Err(format!("Registry update failed: {:?}", res));
        }
    }
    Ok(true)
}

#[tauri::command]
pub fn get_always_on_top(state: tauri::State<'_, SharedState>) -> bool {
    state
        .settings
        .read()
        .map(|s| s.always_on_top)
        .unwrap_or(true)
}

#[tauri::command]
pub fn set_always_on_top(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    enable: bool,
) -> Result<bool, String> {
    {
        let mut s = state.settings.write().map_err(|e| format!("{e}"))?;
        s.always_on_top = enable;
    }
    state.save_settings()?;

    let hwnd_raw = state.overlay.lock().map(|o| o.main_hwnd).unwrap_or(0);
    #[cfg(windows)]
    if hwnd_raw != 0 {
        unsafe {
            let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
            let insert_after = if enable {
                HWND_TOPMOST
            } else {
                windows::Win32::UI::WindowsAndMessaging::HWND_NOTOPMOST
            };
            let _ = SetWindowPos(
                hwnd,
                insert_after,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER,
            );
        }
    }

    let _ = app.emit("always-on-top-changed", enable);
    Ok(enable)
}

#[tauri::command]
pub fn focus_window(app: AppHandle, state: tauri::State<'_, SharedState>) -> bool {
    let hwnd_raw = state.overlay.lock().map(|o| o.main_hwnd).unwrap_or(0);
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_focus();
    }
    #[cfg(windows)]
    if hwnd_raw != 0 {
        unsafe {
            let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
            if IsIconic(hwnd).as_bool() {
                let _ = ShowWindow(hwnd, SW_RESTORE);
            }
            let _ = SetForegroundWindow(hwnd);
        }
        return true;
    }
    false
}

#[tauri::command]
pub fn open_external(url: String) -> Result<bool, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("Empty URL".to_string());
    }

    let lower = trimmed.to_lowercase();
    if lower.starts_with("javascript:") || lower.starts_with("vbscript:") || lower.starts_with("data:") {
        return Err("Blocked unsafe URI scheme".to_string());
    }

    let has_scheme = {
        if let Some(idx) = trimmed.find(':') {
            idx > 1
                && trimmed[..idx]
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-' || c == '.')
        } else {
            false
        }
    };

    let normalized = if has_scheme || trimmed.starts_with(r"\\") || Path::new(trimmed).exists() {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    };

    #[cfg(windows)]
    unsafe {
        let op = to_wide("open");
        let target = to_wide(&normalized);
        let hinst = ShellExecuteW(
            HWND::default(),
            PCWSTR(op.as_ptr()),
            PCWSTR(target.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        );
        if (hinst.0 as isize) <= 32 {
            return Err(format!("ShellExecuteW failed with code {}", hinst.0 as isize));
        }
    }

    Ok(true)
}
