#[cfg(windows)]
use crate::state::to_wide;
use crate::state::{IslandBounds, SharedState};
use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;
#[cfg(windows)]
use std::sync::atomic::AtomicBool;
#[cfg(windows)]
use std::sync::atomic::AtomicIsize;
use std::sync::atomic::Ordering;
#[cfg(windows)]
use std::sync::Mutex;
use std::sync::OnceLock;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

#[cfg(target_os = "linux")]
use gtk::{cairo, gdk, glib, prelude::*};
#[cfg(target_os = "linux")]
use std::sync::atomic::AtomicBool;

#[cfg(windows)]
use windows::{
    core::{HSTRING, PCWSTR},
    ApplicationModel::{StartupTask, StartupTaskState},
    Win32::{
        Foundation::{COLORREF, HWND, LPARAM, LRESULT, POINT, RECT, WPARAM},
        System::Com::{CoInitializeEx, COINIT_MULTITHREADED},
        System::Registry::{
            RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegSetValueExW, HKEY,
            HKEY_CURRENT_USER, KEY_SET_VALUE, REG_SZ,
        },
        UI::{
            Input::KeyboardAndMouse::{
                GetAsyncKeyState, VK_CONTROL, VK_LBUTTON, VK_LCONTROL, VK_RCONTROL, VK_RMENU,
            },
            Shell::ShellExecuteW,
            WindowsAndMessaging::{
                CallWindowProcW, GetCursorPos, GetForegroundWindow, GetLayeredWindowAttributes,
                GetWindowLongPtrW, GetWindowRect, IsChild, IsIconic, IsWindowVisible,
                SetForegroundWindow, SetLayeredWindowAttributes, SetWindowLongPtrW, SetWindowPos,
                ShowWindow, GWL_EXSTYLE, GWLP_WNDPROC, HWND_TOPMOST,
                LAYERED_WINDOW_ATTRIBUTES_FLAGS, LWA_ALPHA, SIZE_MINIMIZED, SWP_FRAMECHANGED,
                SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOOWNERZORDER, SWP_NOSIZE, SWP_SHOWWINDOW,
                SW_RESTORE, SW_SHOWNOACTIVATE, SW_SHOWNORMAL, WM_POWERBROADCAST, WM_SIZE, WNDPROC,
                WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_EX_TRANSPARENT,
            },
        },
    },
};

#[cfg(windows)]
static LAST_WEBVIEW_LOW_MEMORY: Mutex<Option<bool>> = Mutex::new(None);

#[cfg(windows)]
static PREV_WNDPROC: AtomicIsize = AtomicIsize::new(0);
#[cfg(windows)]
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

#[cfg(any(windows, test))]
pub fn compute_windows_overlay_rect(
    disp_x: i32,
    disp_y: i32,
    disp_w_px: i32,
    disp_h_px: i32,
    scale: f64,
    position_mode: &str,
    island_x_pct: f64,
    island_y_px: f64,
    _expanded: bool,
) -> (i32, i32, i32, i32) {
    let eff_scale = scale.max(1.0);
    let disp_w = disp_w_px.max(1);
    let disp_h = disp_h_px.max(1);
    let disp_w_log = (disp_w as f64) / eff_scale;
    let disp_h_log = (disp_h as f64) / eff_scale;

    // Keep a fixed compact overlay HWND covering every pill/tab state without resizing on hover,
    // avoiding DWM/WebView2 surface reallocations and coordinate shifts during animations.
    let target_w_log = 960.0_f64.min(disp_w_log);
    let target_h_log = 368.0_f64.min(disp_h_log);

    let win_w = (target_w_log * eff_scale).round().max(1.0) as i32;
    let win_h = (target_h_log * eff_scale).round().max(1.0) as i32;
    let center_x = disp_x + ((disp_w as f64) * 0.498).round() as i32;

    let (win_x, win_y) = match position_mode {
        "top-left" => (disp_x, disp_y),
        "top-right" => (disp_x + disp_w - win_w, disp_y),
        "bottom-left" => (disp_x, disp_y + disp_h - win_h),
        "bottom-right" => (disp_x + disp_w - win_w, disp_y + disp_h - win_h),
        "bottom-center" => (center_x - (win_w / 2), disp_y + disp_h - win_h),
        "free" => {
            let cx = disp_x + ((disp_w as f64) * (island_x_pct.clamp(0.0, 100.0) / 100.0)).round() as i32;
            let top_pad = if island_y_px <= 0.0 { 0.0 } else { 24.0 };
            let y = disp_y + (((island_y_px - top_pad) * eff_scale).round() as i32);
            (cx - (win_w / 2), y)
        }
        _ => (center_x - (win_w / 2), disp_y),
    };

    (win_x, win_y, win_w, win_h)
}

#[cfg(windows)]
fn sync_webview2_state(app: &AppHandle, width_px: i32, height_px: i32, low_memory: bool, ensure_visible: bool) {
    let mem_changed = if let Ok(mut guard) = LAST_WEBVIEW_LOW_MEMORY.lock() {
        if *guard == Some(low_memory) {
            false
        } else {
            *guard = Some(low_memory);
            true
        }
    } else {
        true
    };

    if let Some(win) = app.get_webview_window("main") {
        let rw = width_px.max(1);
        let rh = height_px.max(1);
        let _ = win.with_webview(move |webview| unsafe {
            use webview2_com::Microsoft::Web::WebView2::Win32::{
                ICoreWebView2_19, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW,
                COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
            };
            use windows_core_wv2::Interface;

            let controller = webview.controller();
            if ensure_visible {
                let _ = controller.SetIsVisible(true);
            }
            if rw > 0 && rh > 0 {
                let mut cur_bounds = std::mem::zeroed();
                if controller.Bounds(&mut cur_bounds).is_ok() {
                    if cur_bounds.right != rw || cur_bounds.bottom != rh || cur_bounds.left != 0 || cur_bounds.top != 0 {
                        cur_bounds.left = 0;
                        cur_bounds.top = 0;
                        cur_bounds.right = rw;
                        cur_bounds.bottom = rh;
                        let _ = controller.SetBounds(cur_bounds);
                    }
                }
            }
            if mem_changed {
                if let Ok(core) = controller.CoreWebView2() {
                    if let Ok(wv19) = core.cast::<ICoreWebView2_19>() {
                        let level = if low_memory {
                            COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW
                        } else {
                            COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL
                        };
                        let _ = wv19.SetMemoryUsageTargetLevel(level);
                    }
                }
            }
        });
    }
}

#[cfg(windows)]
pub fn apply_windows_overlay_rect(app: &AppHandle, state: &SharedState, force_show: bool) {
    let (hwnd_raw, rx, ry, rw, rh, size_or_pos_changed, expanded, always_on_top) = {
        let Ok(mut ov) = state.overlay.lock() else {
            return;
        };
        if ov.display_width_px <= 0 || ov.display_height_px <= 0 {
            return;
        }
        let expanded = ov.expanded_viewport || ov.is_shelf_drag_out;
        let (rx, ry, rw, rh) = compute_windows_overlay_rect(
            ov.display_x_px,
            ov.display_y_px,
            ov.display_width_px,
            ov.display_height_px,
            ov.scale_factor,
            &ov.position_mode,
            ov.island_x_pct,
            ov.island_y_px,
            expanded,
        );

        let changed = rx != ov.window_x_px
            || ry != ov.window_y_px
            || rw != ov.window_width_px
            || rh != ov.window_height_px;

        if changed && ov.window_width_px > 0 {
            let eff_scale = ov.scale_factor.max(1.0);
            let dx_log = (ov.window_x_px - rx) as f64 / eff_scale;
            let dy_log = (ov.window_y_px - ry) as f64 / eff_scale;
            if let Some(ref mut b) = ov.bounds {
                if let Some(v) = b.x.as_mut() { *v += dx_log; }
                if let Some(v) = b.left.as_mut() { *v += dx_log; }
                if let Some(v) = b.right.as_mut() { *v += dx_log; }
                if let Some(v) = b.y.as_mut() { *v += dy_log; }
                if let Some(v) = b.top.as_mut() { *v += dy_log; }
                if let Some(v) = b.bottom.as_mut() { *v += dy_log; }
            }
        }

        ov.window_x_px = rx;
        ov.window_y_px = ry;
        ov.window_width_px = rw;
        ov.window_height_px = rh;
        let always_on_top = state.settings.read().map(|s| s.always_on_top).unwrap_or(true);
        (ov.main_hwnd, rx, ry, rw, rh, changed, expanded, always_on_top)
    };

    if hwnd_raw != 0 && (size_or_pos_changed || force_show) {
        unsafe {
            let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
            let insert_after = if always_on_top {
                HWND_TOPMOST
            } else {
                windows::Win32::UI::WindowsAndMessaging::HWND_NOTOPMOST
            };
            let mut flags = SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_SHOWWINDOW;
            if force_show {
                flags |= SWP_FRAMECHANGED;
            }
            if !always_on_top && !force_show {
                flags |= windows::Win32::UI::WindowsAndMessaging::SWP_NOZORDER;
            }
            let _ = SetWindowPos(hwnd, insert_after, rx, ry, rw, rh, flags);
            if force_show || !IsWindowVisible(hwnd).as_bool() {
                let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
            }
        }
    }

    let first_paint_done = FIRST_MSIX_SHOW_DONE.load(Ordering::SeqCst);
    let low_mem = first_paint_done && !expanded;
    sync_webview2_state(app, rw, rh, low_mem, force_show);
}

/// Initializes layered alpha opacity when `WS_EX_LAYERED` is active without committed attributes.
#[cfg(windows)]
unsafe fn ensure_layered_alpha_initialized(hwnd: HWND) -> bool {
    let mut key = COLORREF(0);
    let mut alpha = 0u8;
    let mut lwa_flags = LAYERED_WINDOW_ATTRIBUTES_FLAGS(0);
    let missing = GetLayeredWindowAttributes(
        hwnd,
        Some(&mut key),
        Some(&mut alpha),
        Some(&mut lwa_flags),
    )
    .is_err()
        || lwa_flags.0 == 0
        || alpha == 0;
    if missing {
        let _ = SetLayeredWindowAttributes(hwnd, COLORREF(0), 255, LWA_ALPHA);
    }
    missing
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
        // Keep WS_EX_LAYERED permanently active (alpha=255) and only toggle WS_EX_TRANSPARENT
        // so DWM never tears down or flickers the layered surface on hover transitions.
        let mut next = (current | WS_EX_TOOLWINDOW.0 | WS_EX_LAYERED.0) & !WS_EX_APPWINDOW.0;
        if click_through {
            next |= WS_EX_TRANSPARENT.0;
        } else {
            next &= !WS_EX_TRANSPARENT.0;
        }
        let layered_toggled = ((next ^ current) & WS_EX_LAYERED.0) != 0;
        if next != current {
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, next as isize);
        }
        let lwa_initialized = ensure_layered_alpha_initialized(hwnd);
        if layered_toggled || lwa_initialized || !IsWindowVisible(hwnd).as_bool() {
            let _ = SetWindowPos(
                hwnd,
                HWND::default(),
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
            );
            let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
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
        if (GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32 & WS_EX_LAYERED.0) != 0 {
            ensure_layered_alpha_initialized(hwnd);
        }
        if IsIconic(hwnd).as_bool() || !IsWindowVisible(hwnd).as_bool() {
            let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
        }
        let _ = SetWindowPos(
            hwnd,
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_NOOWNERZORDER,
        );
    }
}

/// Reveals and activates the running Quick Pill overlay window without spawning a second process.
pub fn activate_existing_instance(app_handle: &AppHandle) {
    let st = app_handle.state::<SharedState>();
    let hwnd_raw = {
        if let Ok(mut ov) = st.overlay.lock() {
            ov.ignore_mouse = false;
            ov.is_ctrl_held = false;
            ov.is_text_input_focused = false;
            ov.main_hwnd
        } else {
            0
        }
    };
    #[cfg(windows)]
    {
        if hwnd_raw != 0 {
            apply_overlay_styles(hwnd_raw, false);
        }
        apply_windows_overlay_rect(app_handle, &st, true);
    }
    #[cfg(target_os = "linux")]
    {
        let _ = hwnd_raw;
        apply_linux_overlay_state(app_handle);
    }
    #[cfg(not(any(windows, target_os = "linux")))]
    let _ = hwnd_raw;

    if let Some(w) = app_handle.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
        let _ = app_handle.emit("open-tab-instant", 2);
    }
}

#[cfg(windows)]
unsafe extern "system" fn overlay_wnd_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    let activate_msg = crate::single_instance::activate_msg_id();
    if activate_msg != 0 && msg == activate_msg {
        if crate::single_instance::try_claim_activation_window() {
            if let Some(app) = SUBCLASS_APP.get() {
                if let Some(state) = app.try_state::<SharedState>() {
                    state.log("INFO", "[Instance] Secondary launch signal received; activating existing window", None);
                }
                activate_existing_instance(app);
            }
        }
        return LRESULT(0);
    }

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
static FIRST_MSIX_SHOW_DONE: AtomicBool = AtomicBool::new(false);

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
                ov.scale_factor = d.scale_factor.max(1.0);
                ov.ignore_mouse = true;
                ov.forward_mouse = true;
            }
        }
        let (rx, ry, rw, rh) = compute_windows_overlay_rect(
            d.physical_bounds.x,
            d.physical_bounds.y,
            d.physical_bounds.width,
            d.physical_bounds.height,
            d.scale_factor,
            "top-center",
            50.0,
            6.0,
            false,
        );
        let _ = win.set_position(tauri::PhysicalPosition::new(rx, ry));
        let _ = win.set_size(tauri::PhysicalSize::new(rw.max(1) as u32, rh.max(1) as u32));
        apply_overlay_styles(hwnd_raw, true);
        apply_windows_overlay_rect(app, &state, true);
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

#[cfg(target_os = "linux")]
static LINUX_CSS_INSTALLED: OnceLock<()> = OnceLock::new();
#[cfg(target_os = "linux")]
static LINUX_DRAW_HOOKED: AtomicBool = AtomicBool::new(false);
#[cfg(target_os = "linux")]
static LINUX_POINTER_TRACKED: AtomicBool = AtomicBool::new(false);
#[cfg(target_os = "linux")]
static LAST_LINUX_OVERLAY_APPLIED: std::sync::Mutex<
    Option<(bool, bool, bool, bool, i32, i32, i32, i32, i32, i32, i32, i32)>,
> = std::sync::Mutex::new(None);

#[cfg(target_os = "linux")]
static LINUX_DRAG_IN_PROGRESS: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);

#[cfg(target_os = "linux")]
pub fn set_linux_drag_in_progress(active: bool) {
    LINUX_DRAG_IN_PROGRESS.store(active, std::sync::atomic::Ordering::SeqCst);
}

#[cfg(target_os = "linux")]
pub fn is_linux_drag_in_progress() -> bool {
    LINUX_DRAG_IN_PROGRESS.load(std::sync::atomic::Ordering::SeqCst)
}

#[cfg(target_os = "linux")]
std::thread_local! {
    static LAST_LINUX_DRAG_EVENT: std::cell::RefCell<Option<(gtk::Widget, gdk::Event)>> =
        const { std::cell::RefCell::new(None) };
}

#[cfg(target_os = "linux")]
fn find_deepest_child_widget(widget: &gtk::Widget) -> gtk::Widget {
    if let Ok(container) = widget.clone().dynamic_cast::<gtk::Container>() {
        let children = container.children();
        if let Some(last) = children.last() {
            return find_deepest_child_widget(last);
        }
    }
    widget.clone()
}

#[cfg(target_os = "linux")]
fn attach_linux_pointer_event_tracker(widget: &gtk::Widget) {
    let children = widget
        .clone()
        .dynamic_cast::<gtk::Container>()
        .map(|c| c.children())
        .unwrap_or_default();
    if !children.is_empty() {
        for child in children {
            attach_linux_pointer_event_tracker(&child);
        }
        return;
    }

    widget.add_events(
        gdk::EventMask::BUTTON_PRESS_MASK
            | gdk::EventMask::BUTTON_RELEASE_MASK
            | gdk::EventMask::POINTER_MOTION_MASK
            | gdk::EventMask::BUTTON1_MOTION_MASK,
    );
    widget.connect_button_press_event(|w, ev| {
        let raw_ev: &gdk::Event = ev;
        LAST_LINUX_DRAG_EVENT.with(|slot| {
            *slot.borrow_mut() = Some((w.clone(), raw_ev.clone()));
        });
        glib::Propagation::Proceed
    });
    widget.connect_motion_notify_event(|w, ev| {
        if ev.state().contains(gdk::ModifierType::BUTTON1_MASK) {
            let raw_ev: &gdk::Event = ev;
            LAST_LINUX_DRAG_EVENT.with(|slot| {
                *slot.borrow_mut() = Some((w.clone(), raw_ev.clone()));
            });
        }
        glib::Propagation::Proceed
    });
}

#[cfg(target_os = "linux")]
pub fn get_linux_drag_source_and_event(
    gtk_win: &gtk::ApplicationWindow,
) -> (gtk::Widget, Option<gdk::Event>) {
    let stored = LAST_LINUX_DRAG_EVENT.with(|slot| slot.borrow().clone());
    if let Some((w, ev)) = stored {
        return (w, Some(ev));
    }
    let fallback_widget = find_deepest_child_widget(gtk_win.upcast_ref::<gtk::Widget>());
    (fallback_widget, None)
}

#[cfg(target_os = "linux")]
fn apply_linux_gtk_window_state(
    gtk_win: &gtk::ApplicationWindow,
    always_on_top: bool,
    bounds_opt: Option<&IslandBounds>,
    click_through: bool,
    passthrough_all: bool,
    is_shelf_drag_out: bool,
) {
    LINUX_CSS_INSTALLED.get_or_init(|| {
        if let Some(screen) = gdk::Screen::default() {
            let provider = gtk::CssProvider::new();
            let _ = provider.load_from_data(
                b"window, window.background, .background, webview { background-color: rgba(0, 0, 0, 0); background-image: none; box-shadow: none; border: none; }",
            );
            gtk::StyleContext::add_provider_for_screen(
                &screen,
                &provider,
                gtk::STYLE_PROVIDER_PRIORITY_USER,
            );
        }
    });

    gtk::prelude::WidgetExt::set_app_paintable(gtk_win, true);
    gtk_win.set_decorated(false);
    if !gtk::prelude::WidgetExt::is_realized(gtk_win) {
        if let Some(screen) = gtk::prelude::GtkWindowExt::screen(gtk_win) {
            if let Some(visual) = screen.rgba_visual() {
                gtk::prelude::WidgetExt::set_visual(gtk_win, Some(&visual));
            }
        }
    }

    if !LINUX_DRAW_HOOKED.swap(true, Ordering::SeqCst) {
        gtk::prelude::WidgetExt::connect_draw(gtk_win, |_w, cr| {
            cr.set_source_rgba(0.0, 0.0, 0.0, 0.0);
            cr.set_operator(cairo::Operator::Source);
            let _ = cr.paint();
            glib::Propagation::Proceed
        });
    }

    if !LINUX_POINTER_TRACKED.load(Ordering::SeqCst) && !gtk_win.children().is_empty() {
        LINUX_POINTER_TRACKED.store(true, Ordering::SeqCst);
        attach_linux_pointer_event_tracker(gtk_win.upcast_ref::<gtk::Widget>());
    }

    let Some(gdk_win) = gtk_win.window() else {
        return;
    };

    let accept_focus = if is_shelf_drag_out {
        true
    } else {
        !click_through && !passthrough_all
    };
    let win_width = gtk::prelude::WidgetExt::allocated_width(gtk_win)
        .max(gdk_win.width())
        .max(800);
    let win_height = gtk::prelude::WidgetExt::allocated_height(gtk_win)
        .max(gdk_win.height())
        .max(600);

    let (qx, qy, qw, qh) =
        if let Some((bx, by, bw, bh)) = bounds_opt.and_then(|b| b.normalized_rect()) {
            let x = (bx.floor() as i32 - 16).max(0) & !7;
            let y = (by.floor() as i32 - 12).max(0) & !7;
            let w = ((bw.ceil() as i32 + 32).max(80) + 7) & !7;
            let h = ((bh.ceil() as i32 + 28).max(48) + 7) & !7;
            (x, y, w, h)
        } else {
            ((win_width / 2 - 220).max(0), 0, 440, 96)
        };

    // During shelf drag-out on XWayland/Mutter, keep input_shape_combine_region non-empty
    // around the pill until GTK's internal ipc_widget takes over the drag grab, then make
    // our overlay input-passthrough so targets underneath the Shelf still accept drops.
    let (rx, ry, rw, rh) = if passthrough_all && !is_shelf_drag_out {
        (0, 0, 0, 0)
    } else if is_shelf_drag_out && is_linux_drag_in_progress() {
        (0, 0, 0, 0)
    } else {
        (qx, qy, qw, qh)
    };

    // Restrict the visual XShape bounding region so Mutter / XWayland does not
    // alpha-blend a full-screen ARGB surface across unoccupied desktop areas on every scroll frame.
    let (vx, vy, vw, vh) = if is_shelf_drag_out {
        (qx, qy, qw, qh)
    } else if accept_focus || qw > 280 || qh > 96 {
        let cx = qx + qw / 2;
        let vw_val = (qw + 64).max(840);
        let vx_val = (cx - vw_val / 2).max(0);
        let target_h = (qh + 64).max(560);
        if qy + qh / 2 < win_height / 2 {
            (vx_val, (qy - 32).max(0), vw_val, target_h)
        } else {
            let bottom = qy + qh + 32;
            let vy_val = (bottom - target_h).max(0);
            (vx_val, vy_val, vw_val, (bottom - vy_val).max(qh + 64))
        }
    } else {
        ((qx - 36).max(0), (qy - 18).max(0), qw + 72, qh + 52)
    };

    let effective_keep_above = always_on_top && !is_shelf_drag_out;

    let target_state = (
        effective_keep_above,
        accept_focus,
        passthrough_all,
        is_shelf_drag_out,
        rx,
        ry,
        rw,
        rh,
        vx,
        vy,
        vw,
        vh,
    );
    if let Ok(guard) = LAST_LINUX_OVERLAY_APPLIED.lock() {
        if *guard == Some(target_state) {
            return;
        }
    }

    gtk_win.set_keep_above(effective_keep_above);
    gtk_win.set_skip_taskbar_hint(true);
    gtk_win.set_skip_pager_hint(true);
    gtk_win.stick();
    gdk_win.set_override_redirect(false);
    if is_shelf_drag_out && is_linux_drag_in_progress() {
        gdk_win.lower();
    } else if effective_keep_above {
        gdk_win.raise();
    }
    gtk::prelude::GtkWindowExt::set_accept_focus(gtk_win, accept_focus);

    if (passthrough_all && !is_shelf_drag_out) || rw <= 0 || rh <= 0 {
        let empty = cairo::Region::create();
        gdk_win.input_shape_combine_region(&empty, 0, 0);
    } else {
        let rect = cairo::RectangleInt::new(rx, ry, rw, rh);
        let region = cairo::Region::create_rectangle(&rect);
        gdk_win.input_shape_combine_region(&region, 0, 0);
    }

    let vis_rect = cairo::RectangleInt::new(vx, vy, vw, vh);
    let visual_region = cairo::Region::create_rectangle(&vis_rect);
    let pill_vis_rect = cairo::RectangleInt::new(qx, qy, qw, qh);
    let _ = visual_region.union_rectangle(&pill_vis_rect);
    gdk_win.shape_combine_region(Some(&visual_region), 0, 0);

    if let Ok(mut guard) = LAST_LINUX_OVERLAY_APPLIED.lock() {
        *guard = Some(target_state);
    }
}

#[cfg(target_os = "linux")]
pub fn apply_linux_overlay_state(app: &AppHandle) {
    let state = app.state::<SharedState>();
    let always_on_top = state
        .settings
        .read()
        .map(|s| s.always_on_top)
        .unwrap_or(true);
    let (bounds_opt, click_through, passthrough_all, is_shelf_drag_out) = {
        let Ok(ov) = state.overlay.lock() else {
            return;
        };
        (
            ov.bounds.clone(),
            ov.ignore_mouse,
            ov.is_ctrl_held,
            ov.is_shelf_drag_out,
        )
    };

    let Some(win) = app.get_webview_window("main") else {
        return;
    };
    if gtk::is_initialized_main_thread() {
        if let Ok(gtk_win) = win.gtk_window() {
            apply_linux_gtk_window_state(
                &gtk_win,
                always_on_top,
                bounds_opt.as_ref(),
                click_through,
                passthrough_all,
                is_shelf_drag_out,
            );
        }
    } else {
        let win_cb = win.clone();
        let _ = win.run_on_main_thread(move || {
            if let Ok(gtk_win) = win_cb.gtk_window() {
                apply_linux_gtk_window_state(
                    &gtk_win,
                    always_on_top,
                    bounds_opt.as_ref(),
                    click_through,
                    passthrough_all,
                    is_shelf_drag_out,
                );
            }
        });
    }
}

#[cfg(target_os = "linux")]
fn start_linux_resume_watcher(app: AppHandle) {
    // 1. Monotonic vs wall-clock jump detector (universal across systemd/elogind/openrc)
    let app_clock = app.clone();
    thread::spawn(move || {
        let mut last_wall = chrono::Utc::now().timestamp_millis();
        let mut last_mono = std::time::Instant::now();
        loop {
            thread::sleep(Duration::from_secs(3));
            let now_wall = chrono::Utc::now().timestamp_millis();
            let now_mono = std::time::Instant::now();
            let elapsed_wall_ms = now_wall - last_wall;
            let elapsed_mono_ms = now_mono.duration_since(last_mono).as_millis() as i64;
            last_wall = now_wall;
            last_mono = now_mono;

            if elapsed_wall_ms - elapsed_mono_ms > 10_000 {
                let _ = app_clock.emit("system-resume", ());
                if let Some(st) = app_clock.try_state::<SharedState>() {
                    st.log("INFO", "[Power] Linux system resumed; reasserting overlay", None);
                }
                apply_linux_overlay_state(&app_clock);
            }
        }
    });

    // 2. systemd-logind PrepareForSleep(false) D-Bus listener
    thread::spawn(move || {
        let Ok(conn) = zbus::blocking::Connection::system() else {
            return;
        };
        let Ok(proxy) = zbus::blocking::Proxy::new(
            &conn,
            "org.freedesktop.login1",
            "/org/freedesktop/login1",
            "org.freedesktop.login1.Manager",
        ) else {
            return;
        };
        let Ok(signals) = proxy.receive_signal("PrepareForSleep") else {
            return;
        };
        for msg in signals {
            if let Ok(going_to_sleep) = msg.body().deserialize::<bool>() {
                if !going_to_sleep {
                    let _ = app.emit("system-resume", ());
                    apply_linux_overlay_state(&app);
                }
            }
        }
    });
}

#[cfg(target_os = "linux")]
pub fn init_overlay_window(app: &AppHandle, win: &WebviewWindow) {
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
                "[Overlay/Linux] Initializing on display {} ({}x{} at {},{} scale={})",
                d.id,
                d.physical_bounds.width,
                d.physical_bounds.height,
                d.physical_bounds.x,
                d.physical_bounds.y,
                d.scale_factor
            ),
            None,
        );
        if let Ok(mut ov) = state.overlay.lock() {
            ov.main_hwnd = 1;
            ov.current_display_id = d.id.clone();
            ov.display_x_px = d.physical_bounds.x;
            ov.display_y_px = d.physical_bounds.y;
            ov.display_width_px = d.physical_bounds.width;
            ov.display_height_px = d.physical_bounds.height;
            ov.ignore_mouse = true;
            ov.forward_mouse = true;
        }
        let _ = win.set_decorations(false);
        let _ = win.set_skip_taskbar(true);
        let _ = win.set_always_on_top(true);
        let _ = win.set_position(tauri::PhysicalPosition::new(
            d.physical_bounds.x,
            d.physical_bounds.y,
        ));
        let _ = win.set_size(tauri::PhysicalSize::new(
            d.physical_bounds.width.max(1) as u32,
            (d.physical_bounds.height - 2).max(1) as u32,
        ));
    } else {
        if let Ok(mut ov) = state.overlay.lock() {
            ov.main_hwnd = 1;
        }
        state.log("WARN", "[Overlay/Linux] No monitor found during init_overlay_window", None);
    }

    let win_hooks = win.clone();
    let _ = win.run_on_main_thread(move || {
        if let Ok(gtk_win) = win_hooks.gtk_window() {
            gtk_win.set_decorated(false);
            gtk_win.set_skip_taskbar_hint(true);
            gtk_win.set_skip_pager_hint(true);
            gtk_win.set_keep_above(true);
            gtk::prelude::GtkWindowExt::set_accept_focus(&gtk_win, false);
            gtk_win.stick();
        }
    });

    apply_linux_overlay_state(app);
    start_cursor_watcher(app.clone());
    start_topmost_heartbeat(app.clone());
    start_linux_resume_watcher(app.clone());
}

#[cfg(target_os = "linux")]
fn read_gdk_cursor_on_main_thread(win: &WebviewWindow) -> Option<(f64, f64, bool, bool)> {
    let display = gdk::Display::default()?;
    let seat = display.default_seat()?;
    let pointer = seat.pointer()?;
    let root = gdk::Window::default_root_window();
    let (win_under_root, abs_x, abs_y, mods) = root.device_position_double(&pointer);
    let (gx, gy) = if win_under_root.is_some() || abs_x != 0.0 || abs_y != 0.0 {
        (abs_x, abs_y)
    } else {
        let (_, px, py) = pointer.position();
        (px as f64, py as f64)
    };
    let (win_x, win_y) = {
        let state = win.app_handle().state::<SharedState>();
        let scale = win.scale_factor().ok().unwrap_or(1.0).max(1.0);
        let disp_opt = state
            .overlay
            .lock()
            .ok()
            .map(|ov| (ov.display_x_px as f64 / scale, ov.display_y_px as f64 / scale));
        disp_opt.unwrap_or_else(|| {
            win.gtk_window()
                .ok()
                .and_then(|gtk_win| gtk_win.window().map(|gw| gw.position()))
                .map(|(x, y)| (x as f64, y as f64))
                .unwrap_or((0.0, 0.0))
        })
    };
    let ctrl = mods.contains(gdk::ModifierType::CONTROL_MASK);
    let lmb = mods.contains(gdk::ModifierType::BUTTON1_MASK);
    Some((gx - win_x, gy - win_y, ctrl, lmb))
}

#[cfg(target_os = "linux")]
fn poll_linux_cursor_and_mods(app: &AppHandle) -> Option<(f64, f64, bool, bool)> {
    let gdk_pos = app.get_webview_window("main").and_then(|win| {
        if gtk::is_initialized_main_thread() {
            read_gdk_cursor_on_main_thread(&win)
        } else {
            let (tx, rx) = std::sync::mpsc::channel();
            let win_cb = win.clone();
            if win
                .run_on_main_thread(move || {
                    let _ = tx.send(read_gdk_cursor_on_main_thread(&win_cb));
                })
                .is_err()
            {
                return None;
            }
            rx.recv_timeout(Duration::from_millis(50)).ok().flatten()
        }
    });

    // Hyprland Wayland fast path for true global coordinates when pointer is outside input region,
    // combined with real GDK modifier flags so Ctrl click-through and LMB release remain accurate.
    if std::env::var_os("HYPRLAND_INSTANCE_SIGNATURE").is_some() {
        if let Ok(out) = std::process::Command::new("hyprctl")
            .args(["cursorpos", "-j"])
            .output()
        {
            if out.status.success() {
                if let Ok(v) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                    if let (Some(x), Some(y)) = (
                        v.get("x").and_then(|n| n.as_f64()),
                        v.get("y").and_then(|n| n.as_f64()),
                    ) {
                        let st = app.state::<SharedState>();
                        let scale = app
                            .get_webview_window("main")
                            .and_then(|w| w.scale_factor().ok())
                            .unwrap_or(1.0)
                            .max(1.0);
                        let (dx, dy) = if let Ok(ov) = st.overlay.lock() {
                            (ov.display_x_px as f64 / scale, ov.display_y_px as f64 / scale)
                        } else {
                            (0.0, 0.0)
                        };
                        let (ctrl, lmb) = gdk_pos
                            .map(|(_, _, c, l)| (c, l))
                            .unwrap_or((false, false));
                        return Some((x - dx, y - dy, ctrl, lmb));
                    }
                }
            }
        }
    }

    gdk_pos
}

/// Checks whether the global cursor coordinate (with padding) lies inside the rendered island rectangle.
pub fn cursor_in_bounds(rel_x: f64, rel_y: f64, bounds: &IslandBounds, pad: f64) -> bool {
    let Some((bx, by, bw, bh)) = bounds.normalized_rect() else {
        return false;
    };
    rel_x >= (bx - pad)
        && rel_x <= (bx + bw + pad)
        && rel_y >= (by - pad)
        && rel_y <= (by + bh + pad)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct CursorStepDecision {
    next_inside: bool,
    next_ctrl: bool,
    next_ignore: bool,
    apply_os_style: bool,
    emit_ctrl_hover: Option<(bool, bool, bool)>,
    emit_cursor_entered: bool,
    emit_cursor_outside: bool,
}

/// Evaluates overlay click-through and Ctrl+Hover state transitions from physical OS inputs.
fn evaluate_cursor_step(
    prev_inside: bool,
    prev_ignore: bool,
    prev_ctrl: bool,
    now_inside: bool,
    effective_ctrl: bool,
    lmb_down: bool,
) -> CursorStepDecision {
    let prev_ctrl_hover = prev_inside && prev_ctrl;

    if now_inside {
        if effective_ctrl {
            return CursorStepDecision {
                next_inside: true,
                next_ctrl: true,
                next_ignore: true,
                apply_os_style: !prev_ignore || !prev_ctrl,
                emit_ctrl_hover: (!prev_ctrl_hover).then_some((true, true, true)),
                emit_cursor_entered: false,
                emit_cursor_outside: false,
            };
        }
        return CursorStepDecision {
            next_inside: true,
            next_ctrl: false,
            next_ignore: false,
            apply_os_style: prev_ignore || prev_ctrl || !prev_inside,
            emit_ctrl_hover: prev_ctrl_hover.then_some((false, true, false)),
            emit_cursor_entered: prev_ignore || prev_ctrl || !prev_inside,
            emit_cursor_outside: false,
        };
    }

    // While dragging an interactive control inside the pill, keep capture until LMB is released.
    if lmb_down && !prev_ignore {
        return CursorStepDecision {
            next_inside: prev_inside,
            next_ctrl: prev_ctrl,
            next_ignore: prev_ignore,
            apply_os_style: false,
            emit_ctrl_hover: None,
            emit_cursor_entered: false,
            emit_cursor_outside: false,
        };
    }

    CursorStepDecision {
        next_inside: false,
        next_ctrl: effective_ctrl,
        next_ignore: true,
        apply_os_style: !prev_ignore || prev_ctrl != effective_ctrl,
        emit_ctrl_hover: prev_ctrl_hover.then_some((false, false, effective_ctrl)),
        emit_cursor_entered: false,
        emit_cursor_outside: prev_inside,
    }
}

#[cfg(target_os = "linux")]
pub fn is_linux_cursor_inside_island_bounds(
    app: &AppHandle,
    bounds: Option<&IslandBounds>,
) -> (bool, bool) {
    let Some(bounds_ref) = bounds else {
        return (false, false);
    };
    let Some((rel_x, rel_y, ctrl, _)) = poll_linux_cursor_and_mods(app) else {
        return (false, false);
    };
    (cursor_in_bounds(rel_x, rel_y, bounds_ref, 4.0), ctrl)
}

#[cfg(windows)]
pub fn is_windows_ctrl_down() -> bool {
    unsafe {
        let lctrl = (GetAsyncKeyState(VK_LCONTROL.0 as i32) as u16 & 0x8000) != 0;
        let rctrl = (GetAsyncKeyState(VK_RCONTROL.0 as i32) as u16 & 0x8000) != 0;
        let ctrl =
            lctrl || rctrl || (GetAsyncKeyState(VK_CONTROL.0 as i32) as u16 & 0x8000) != 0;
        if !ctrl {
            return false;
        }
        // Ignore AltGr (LCtrl + RAlt) so international typing doesn't trigger click-through.
        let rmenu = (GetAsyncKeyState(VK_RMENU.0 as i32) as u16 & 0x8000) != 0;
        !(rmenu && lctrl && !rctrl)
    }
}

#[cfg(windows)]
fn is_overlay_foreground(hwnd_raw: isize) -> bool {
    if hwnd_raw == 0 {
        return false;
    }
    unsafe {
        let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
        let fg = GetForegroundWindow();
        fg == hwnd || (!fg.0.is_null() && IsChild(hwnd, fg).as_bool())
    }
}

#[cfg(windows)]
pub fn query_windows_cursor_pos_and_lmb(
    app: &AppHandle,
    hwnd_raw: isize,
    disp_x: i32,
    disp_y: i32,
) -> Option<(f64, f64, bool)> {
    let cursor_pt = unsafe {
        let mut pt = POINT::default();
        if GetCursorPos(&mut pt).is_err() {
            return None;
        }
        pt
    };
    let (win_x, win_y, scale) = {
        let mut wx = disp_x;
        let mut wy = disp_y;
        if hwnd_raw != 0 {
            unsafe {
                let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
                let mut rect = RECT::default();
                if GetWindowRect(hwnd, &mut rect).is_ok() {
                    wx = rect.left;
                    wy = rect.top;
                }
            }
        }
        let s = app
            .get_webview_window("main")
            .and_then(|w| w.scale_factor().ok())
            .unwrap_or(1.0)
            .max(1.0);
        (wx, wy, s)
    };
    let lmb = unsafe { (GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000) != 0 };
    Some((
        (cursor_pt.x - win_x) as f64 / scale,
        (cursor_pt.y - win_y) as f64 / scale,
        lmb,
    ))
}

#[cfg(windows)]
pub fn is_cursor_inside_island_bounds(
    app: &AppHandle,
    hwnd_raw: isize,
    disp_x: i32,
    disp_y: i32,
    bounds: Option<&IslandBounds>,
) -> bool {
    let Some(bounds_ref) = bounds else {
        return false;
    };
    let Some((rel_x, rel_y, _)) =
        query_windows_cursor_pos_and_lmb(app, hwnd_raw, disp_x, disp_y)
    else {
        return false;
    };
    cursor_in_bounds(rel_x, rel_y, bounds_ref, 4.0)
}

fn start_cursor_watcher(app: AppHandle) {
    thread::spawn(move || {
        let mut drag_out_release_ticks: u32 = 0;

        loop {
            #[cfg(windows)]
            thread::sleep(Duration::from_millis(45));
            #[cfg(not(windows))]
            thread::sleep(Duration::from_millis(80));

            let state = app.state::<SharedState>();

            let (
                bounds_opt,
                hwnd_raw,
                ignore_mouse,
                prev_inside,
                is_ctrl,
                is_text_focused,
                is_drag_out,
                disp_x,
                disp_y,
            ) = {
                let Ok(ov) = state.overlay.lock() else {
                    continue;
                };
                (
                    ov.bounds.clone(),
                    ov.main_hwnd,
                    ov.ignore_mouse,
                    ov.cursor_inside_island,
                    ov.is_ctrl_held,
                    ov.is_text_input_focused,
                    ov.is_shelf_drag_out,
                    ov.display_x_px,
                    ov.display_y_px,
                )
            };

            if hwnd_raw == 0 {
                continue;
            }

            if is_drag_out {
                #[cfg(windows)]
                {
                    let lmb_down =
                        unsafe { (GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000) != 0 };
                    if lmb_down {
                        drag_out_release_ticks = 0;
                        continue;
                    }
                    drag_out_release_ticks = drag_out_release_ticks.saturating_add(1);
                    if drag_out_release_ticks < 12 {
                        continue;
                    }
                    drag_out_release_ticks = 0;
                    state.log(
                        "WARN",
                        "[Overlay] Auto-recovering stale shelf drag-out state after LMB release",
                        None,
                    );
                    if let Ok(mut ov) = state.overlay.lock() {
                        ov.is_shelf_drag_out = false;
                    }
                    let _ = app.emit(
                        "shelf:drag-ended",
                        serde_json::json!({ "success": false, "recovered": true }),
                    );
                    let inside_now = is_cursor_inside_island_bounds(
                        &app,
                        hwnd_raw,
                        disp_x,
                        disp_y,
                        bounds_opt.as_ref(),
                    );
                    let ctrl_now = is_windows_ctrl_down();
                    let effective_ignore = !inside_now || ctrl_now;
                    if let Ok(mut ov) = state.overlay.lock() {
                        ov.is_ctrl_held = ctrl_now;
                        ov.cursor_inside_island = inside_now;
                        ov.ignore_mouse = effective_ignore;
                    }
                    apply_overlay_styles(hwnd_raw, effective_ignore);
                    if inside_now && ctrl_now {
                        let _ = app.emit(
                            "island:ctrl-hover",
                            serde_json::json!({ "active": true, "inside": true, "ctrl": true }),
                        );
                    } else if inside_now {
                        let _ = app.emit("island:cursor-entered", ());
                    } else {
                        let _ = app.emit("island:cursor-outside", ());
                    }
                    continue;
                }
                #[cfg(target_os = "linux")]
                {
                    if is_linux_drag_in_progress() {
                        drag_out_release_ticks = 0;
                        continue;
                    }
                    let lmb_down = poll_linux_cursor_and_mods(&app)
                        .map(|(_, _, _, lmb)| lmb)
                        .unwrap_or(false);
                    if lmb_down {
                        drag_out_release_ticks = 0;
                        continue;
                    }
                    drag_out_release_ticks = drag_out_release_ticks.saturating_add(1);
                    if drag_out_release_ticks < 20 {
                        continue;
                    }
                    drag_out_release_ticks = 0;
                    state.log(
                        "WARN",
                        "[Overlay/Linux] Auto-recovering stale shelf drag-out state after LMB release",
                        None,
                    );
                    if let Ok(mut ov) = state.overlay.lock() {
                        ov.is_shelf_drag_out = false;
                    }
                    let _ = app.emit(
                        "shelf:drag-ended",
                        serde_json::json!({ "success": false, "recovered": true }),
                    );
                    let (inside_now, ctrl_now) =
                        is_linux_cursor_inside_island_bounds(&app, bounds_opt.as_ref());
                    let effective_ignore = !inside_now || ctrl_now;
                    if let Ok(mut ov) = state.overlay.lock() {
                        ov.is_ctrl_held = ctrl_now;
                        ov.cursor_inside_island = inside_now;
                        ov.ignore_mouse = effective_ignore;
                    }
                    apply_linux_overlay_state(&app);
                    if inside_now && ctrl_now {
                        let _ = app.emit(
                            "island:ctrl-hover",
                            serde_json::json!({ "active": true, "inside": true, "ctrl": true }),
                        );
                    } else if inside_now {
                        let _ = app.emit("island:cursor-entered", ());
                    } else {
                        let _ = app.emit("island:cursor-outside", ());
                    }
                    continue;
                }
                #[cfg(not(any(windows, target_os = "linux")))]
                {
                    let _ = drag_out_release_ticks;
                    continue;
                }
            } else {
                drag_out_release_ticks = 0;
            }

            let Some(bounds) = bounds_opt else {
                continue;
            };

            #[cfg(windows)]
            let (rel_x, rel_y, raw_ctrl, lmb_down, typing_ctrl) = {
                let Some((rx, ry, lmb)) =
                    query_windows_cursor_pos_and_lmb(&app, hwnd_raw, disp_x, disp_y)
                else {
                    continue;
                };
                let ctrl = is_windows_ctrl_down();
                let typing = ctrl && is_text_focused && is_overlay_foreground(hwnd_raw);
                (rx, ry, ctrl, lmb, typing)
            };

            #[cfg(target_os = "linux")]
            let (rel_x, rel_y, raw_ctrl, lmb_down, typing_ctrl) = {
                let _ = (disp_x, disp_y);
                let Some((rx, ry, ctrl_now, lmb)) = poll_linux_cursor_and_mods(&app) else {
                    continue;
                };
                let typing = ctrl_now
                    && is_text_focused
                    && app
                        .get_webview_window("main")
                        .and_then(|w| w.is_focused().ok())
                        .unwrap_or(false);
                (rx, ry, ctrl_now, lmb, typing)
            };

            #[cfg(not(any(windows, target_os = "linux")))]
            let (rel_x, rel_y, raw_ctrl, lmb_down, typing_ctrl) = {
                let _ = (disp_x, disp_y, is_text_focused);
                continue;
            };

            let pad = if prev_inside && (!ignore_mouse || is_ctrl) {
                8.0
            } else {
                2.0
            };
            let now_inside = cursor_in_bounds(rel_x, rel_y, &bounds, pad);
            let effective_ctrl = raw_ctrl && !typing_ctrl;
            let decision = evaluate_cursor_step(
                prev_inside,
                ignore_mouse,
                is_ctrl,
                now_inside,
                effective_ctrl,
                lmb_down,
            );

            let state_changed = decision.next_inside != prev_inside
                || decision.next_ignore != ignore_mouse
                || decision.next_ctrl != is_ctrl;
            if state_changed {
                if let Ok(mut ov) = state.overlay.lock() {
                    if !ov.is_shelf_drag_out {
                        ov.cursor_inside_island = decision.next_inside;
                        ov.is_ctrl_held = decision.next_ctrl;
                        ov.ignore_mouse = decision.next_ignore;
                    }
                }
            }

            if decision.apply_os_style {
                #[cfg(windows)]
                if decision.next_ignore != ignore_mouse {
                    apply_overlay_styles(hwnd_raw, decision.next_ignore);
                }
                #[cfg(target_os = "linux")]
                apply_linux_overlay_state(&app);
            }

            if let Some((active, inside, ctrl)) = decision.emit_ctrl_hover {
                let _ = app.emit(
                    "island:ctrl-hover",
                    serde_json::json!({
                        "active": active,
                        "inside": inside,
                        "ctrl": ctrl,
                    }),
                );
            }

            if decision.emit_cursor_entered {
                if !prev_inside && lmb_down {
                    let _ = app.emit("shelf:drag-enter", ());
                }
                let _ = app.emit("island:cursor-entered", ());
            }

            if decision.emit_cursor_outside {
                let _ = app.emit("island:cursor-outside", ());
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
            let (hwnd_raw, is_drag_out) = state
                .overlay
                .lock()
                .map(|o| (o.main_hwnd, o.is_shelf_drag_out))
                .unwrap_or((0, false));
            #[cfg(windows)]
            force_topmost_hwnd(hwnd_raw);
            #[cfg(target_os = "linux")]
            if hwnd_raw != 0 && !is_drag_out {
                if let Some(w) = app.get_webview_window("main") {
                    let w_cb = w.clone();
                    let _ = w.run_on_main_thread(move || {
                        if let Ok(gtk_win) = w_cb.gtk_window() {
                            gtk_win.set_keep_above(true);
                        }
                    });
                }
            }
            #[cfg(target_os = "linux")]
            let _ = is_drag_out;
            #[cfg(not(target_os = "linux"))]
            let _ = is_drag_out;
        }
    });
}

#[tauri::command]
pub fn set_ignore_mouse_events(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    ignore: bool,
    forward: bool,
    is_ctrl: bool,
) {
    let (hwnd_raw, effective_ignore) = {
        let Ok(mut ov) = state.overlay.lock() else {
            return;
        };
        #[cfg(windows)]
        let os_ctrl = if ov.is_text_input_focused && is_overlay_foreground(ov.main_hwnd) {
            false
        } else {
            is_windows_ctrl_down()
        };
        #[cfg(not(windows))]
        let os_ctrl = false;

        let effective_ctrl = is_ctrl || os_ctrl;
        let effective_ignore = ignore || effective_ctrl;
        ov.ignore_mouse = effective_ignore;
        ov.forward_mouse = forward;
        ov.is_ctrl_held = effective_ctrl;
        let target_hwnd = if ov.is_shelf_drag_out {
            0
        } else {
            ov.main_hwnd
        };
        (target_hwnd, effective_ignore)
    };

    #[cfg(windows)]
    {
        let _ = &app;
        if hwnd_raw != 0 {
            apply_overlay_styles(hwnd_raw, effective_ignore);
        }
    }
    #[cfg(target_os = "linux")]
    {
        let _ = hwnd_raw;
        apply_linux_overlay_state(&app);
    }
    #[cfg(not(any(windows, target_os = "linux")))]
    let _ = (app, hwnd_raw);
}

#[tauri::command]
pub fn set_text_input_focused(state: tauri::State<'_, SharedState>, focused: bool) {
    if let Ok(mut ov) = state.overlay.lock() {
        ov.is_text_input_focused = focused;
    }
}

static LOGGED_FIRST_BOUNDS: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[tauri::command]
pub fn update_island_bounds(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    bounds: Option<IslandBounds>,
) {
    let mut has_valid_bounds = false;
    if let Some(ref b) = bounds {
        if let Some((x, y, w, h)) = b.normalized_rect() {
            if w > 1.0 && h > 1.0 {
                has_valid_bounds = true;
            }
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
    #[cfg(windows)]
    if has_valid_bounds && !FIRST_MSIX_SHOW_DONE.swap(true, Ordering::SeqCst) {
        apply_windows_overlay_rect(&app, &state, true);
    }
    #[cfg(target_os = "linux")]
    {
        let _ = has_valid_bounds;
        apply_linux_overlay_state(&app);
    }
    #[cfg(not(any(windows, target_os = "linux")))]
    let _ = (&app, has_valid_bounds);
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
        ov.scale_factor = target.scale_factor.max(1.0);
        ov.window_width_px = 0;
        ov.main_hwnd
    };

    #[cfg(not(windows))]
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_position(tauri::PhysicalPosition::new(
            target.physical_bounds.x,
            target.physical_bounds.y,
        ));
        #[cfg(target_os = "linux")]
        let target_h = (target.physical_bounds.height - 2).max(1) as u32;
        #[cfg(not(target_os = "linux"))]
        let target_h = target.physical_bounds.height.max(1) as u32;
        let _ = w.set_size(tauri::PhysicalSize::new(
            target.physical_bounds.width.max(1) as u32,
            target_h,
        ));
    }

    #[cfg(windows)]
    {
        let _ = hwnd_raw;
        apply_windows_overlay_rect(&app, &state, true);
    }
    #[cfg(target_os = "linux")]
    {
        let _ = hwnd_raw;
        if let Ok(mut guard) = LAST_LINUX_OVERLAY_APPLIED.lock() {
            *guard = None;
        }
        apply_linux_overlay_state(&app);
    }
    #[cfg(not(any(windows, target_os = "linux")))]
    let _ = hwnd_raw;

    Ok(true)
}

#[tauri::command]
pub fn update_window_position(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    x_perc: f64,
    y_px: f64,
) -> bool {
    let mut is_free = false;
    if let Ok(mut ov) = state.overlay.lock() {
        ov.island_x_pct = x_perc;
        ov.island_y_px = y_px;
        is_free = ov.position_mode == "free";
    }
    #[cfg(windows)]
    if is_free {
        apply_windows_overlay_rect(&app, &state, false);
    }
    #[cfg(not(windows))]
    let _ = (&app, is_free);
    true
}

#[tauri::command]
pub fn sync_overlay_viewport(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    expanded: bool,
    position_mode: Option<String>,
    island_x_pct: Option<f64>,
    island_y_px: Option<f64>,
) -> bool {
    if let Ok(mut ov) = state.overlay.lock() {
        ov.expanded_viewport = expanded;
        if let Some(pm) = position_mode {
            ov.position_mode = pm;
        }
        if let Some(x) = island_x_pct {
            ov.island_x_pct = x;
        }
        if let Some(y) = island_y_px {
            ov.island_y_px = y;
        }
    }
    #[cfg(windows)]
    apply_windows_overlay_rect(&app, &state, false);
    #[cfg(not(windows))]
    let _ = app;
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
    #[cfg(windows)]
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

    #[cfg(target_os = "linux")]
    {
        let autostart_dir = dirs::config_dir()
            .unwrap_or_else(|| {
                std::path::PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| ".".into()))
                    .join(".config")
            })
            .join("autostart");
        let desktop_file = autostart_dir.join("quick-pill.desktop");

        if enable {
            std::fs::create_dir_all(&autostart_dir)
                .map_err(|e| format!("Failed to create autostart directory: {e}"))?;
            let exe_path = std::env::var("APPIMAGE")
                .ok()
                .filter(|p| !p.trim().is_empty())
                .unwrap_or_else(|| {
                    std::env::current_exe()
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_else(|_| "quick-pill".to_string())
                });
            let escaped_exec = if exe_path.contains(' ') {
                format!("\"{exe_path}\"")
            } else {
                exe_path
            };
            let entry = format!(
                "[Desktop Entry]\n\
                 Type=Application\n\
                 Version=1.0\n\
                 Name=Quick Pill\n\
                 Comment=Dynamic Island for Desktop\n\
                 Exec={escaped_exec}\n\
                 Icon=quick-pill\n\
                 Terminal=false\n\
                 X-GNOME-Autostart-enabled=true\n"
            );
            std::fs::write(&desktop_file, entry)
                .map_err(|e| format!("Failed to write autostart desktop entry: {e}"))?;
        } else if desktop_file.exists() {
            std::fs::remove_file(&desktop_file)
                .map_err(|e| format!("Failed to remove autostart desktop entry: {e}"))?;
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
    #[cfg(target_os = "linux")]
    {
        let _ = hwnd_raw;
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.set_always_on_top(enable);
            let w_cb = w.clone();
            let _ = w.run_on_main_thread(move || {
                if let Ok(gtk_win) = w_cb.gtk_window() {
                    gtk_win.set_keep_above(enable);
                }
            });
        }
    }
    #[cfg(not(any(windows, target_os = "linux")))]
    let _ = hwnd_raw;

    let _ = app.emit("always-on-top-changed", enable);
    Ok(enable)
}

#[tauri::command]
pub fn focus_window(app: AppHandle, state: tauri::State<'_, SharedState>) -> bool {
    let hwnd_raw = state.overlay.lock().map(|o| o.main_hwnd).unwrap_or(0);
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_focus();
        #[cfg(target_os = "linux")]
        {
            let _ = hwnd_raw;
            return true;
        }
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
    #[cfg(not(windows))]
    let _ = hwnd_raw;
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

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&normalized)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("xdg-open failed: {e}"))?;
    }

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::{compute_windows_overlay_rect, cursor_in_bounds, evaluate_cursor_step, CursorStepDecision};
    use crate::state::IslandBounds;

    #[test]
    fn compact_top_center_1080p_125pct() {
        // 1920x1080 @ 1.25 -> 960*1.25=1200, 368*1.25=460
        let (x, y, w, h) =
            compute_windows_overlay_rect(0, 0, 1920, 1080, 1.25, "top-center", 50.0, 0.0, false);
        assert_eq!((w, h), (1200, 460));
        assert_eq!(y, 0);
        // 1920 * 0.498 = 956; 956 - 600 = 356
        assert_eq!(x, 356);
    }

    #[test]
    fn expanded_top_center_stays_within_display() {
        let (x, y, w, h) =
            compute_windows_overlay_rect(0, 0, 1920, 1080, 1.25, "top-center", 50.0, 0.0, true);
        assert_eq!((w, h), (1200, 460));
        assert_eq!(y, 0);
        assert_eq!(x, 356);
    }

    #[test]
    fn corners_and_bottom_modes_anchor_to_edges() {
        assert_eq!(
            compute_windows_overlay_rect(100, 50, 1920, 1080, 1.0, "top-left", 50.0, 0.0, false),
            (100, 50, 960, 368)
        );
        assert_eq!(
            compute_windows_overlay_rect(100, 50, 1920, 1080, 1.0, "top-right", 50.0, 0.0, false),
            (100 + 1920 - 960, 50, 960, 368)
        );
        assert_eq!(
            compute_windows_overlay_rect(0, 0, 1920, 1080, 1.0, "bottom-left", 50.0, 0.0, false),
            (0, 1080 - 368, 960, 368)
        );
        assert_eq!(
            compute_windows_overlay_rect(0, 0, 1920, 1080, 1.0, "bottom-right", 50.0, 0.0, false),
            (1920 - 960, 1080 - 368, 960, 368)
        );
        assert_eq!(
            compute_windows_overlay_rect(0, 0, 1920, 1080, 1.0, "bottom-center", 50.0, 0.0, false),
            (956 - 480, 1080 - 368, 960, 368)
        );
    }

    #[test]
    fn free_mode_accounts_for_top_padding_when_detached() {
        // 1920x1080 @ 1.5 -> disp_w_log=1280, disp_h_log=720 -> win=1440x552
        let (x0, y0, w0, h0) =
            compute_windows_overlay_rect(0, 0, 1920, 1080, 1.5, "free", 50.0, 0.0, false);
        assert_eq!((x0, y0, w0, h0), (960 - 720, 0, 1440, 552));

        let (x1, y1, _, _) =
            compute_windows_overlay_rect(0, 0, 1920, 1080, 1.5, "free", 25.0, 100.0, false);
        // (100 - 24) * 1.5 = 114
        assert_eq!((x1, y1), (480 - 720, 114));
    }

    #[test]
    fn ctrl_hover_enters_without_unignoring_and_releases_cleanly() {
        // User holds Ctrl BEFORE entering pill bounds: stay click-through and activate ctrl-hover
        let d_enter = evaluate_cursor_step(false, true, false, true, true, false);
        assert_eq!(
            d_enter,
            CursorStepDecision {
                next_inside: true,
                next_ctrl: true,
                next_ignore: true,
                apply_os_style: true,
                emit_ctrl_hover: Some((true, true, true)),
                emit_cursor_entered: false,
                emit_cursor_outside: false,
            }
        );

        // User releases Ctrl while cursor is still inside pill: turn off click-through & restore hover
        let d_rel = evaluate_cursor_step(true, true, true, true, false, false);
        assert_eq!(
            d_rel,
            CursorStepDecision {
                next_inside: true,
                next_ctrl: false,
                next_ignore: false,
                apply_os_style: true,
                emit_ctrl_hover: Some((false, true, false)),
                emit_cursor_entered: true,
                emit_cursor_outside: false,
            }
        );

        // User presses Ctrl while already hovered over pill: enable click-through & ghost visual
        let d_press = evaluate_cursor_step(true, false, false, true, true, false);
        assert_eq!(
            d_press,
            CursorStepDecision {
                next_inside: true,
                next_ctrl: true,
                next_ignore: true,
                apply_os_style: true,
                emit_ctrl_hover: Some((true, true, true)),
                emit_cursor_entered: false,
                emit_cursor_outside: false,
            }
        );

        // User moves outside pill while holding Ctrl (even mid click-through drag): clear inside & ctrl-hover
        let d_exit = evaluate_cursor_step(true, true, true, false, true, true);
        assert_eq!(
            d_exit,
            CursorStepDecision {
                next_inside: false,
                next_ctrl: true,
                next_ignore: true,
                apply_os_style: false,
                emit_ctrl_hover: Some((false, false, true)),
                emit_cursor_entered: false,
                emit_cursor_outside: true,
            }
        );

        // Interactive drag inside pill (ignore=false, lmb=true) exiting edge preserves drag capture
        let d_drag = evaluate_cursor_step(true, false, false, false, false, true);
        assert_eq!(d_drag.next_inside, true);
        assert_eq!(d_drag.next_ignore, false);
        assert!(!d_drag.emit_cursor_outside);
    }

    #[test]
    fn cursor_in_bounds_uses_padding_consistently() {
        let bounds = IslandBounds {
            x: None,
            y: None,
            width: None,
            height: None,
            left: Some(200.0),
            top: Some(0.0),
            right: Some(400.0),
            bottom: Some(40.0),
        };
        assert!(cursor_in_bounds(199.0, 20.0, &bounds, 2.0));
        assert!(!cursor_in_bounds(195.0, 20.0, &bounds, 2.0));
        assert!(cursor_in_bounds(195.0, 20.0, &bounds, 8.0));
    }
}
