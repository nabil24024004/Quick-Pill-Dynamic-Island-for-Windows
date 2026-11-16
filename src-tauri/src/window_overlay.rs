#[cfg(windows)]
use crate::state::to_wide;
use crate::state::{IslandBounds, SharedState};
use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;
#[cfg(windows)]
use std::sync::atomic::AtomicIsize;
use std::sync::atomic::Ordering;
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

#[cfg(target_os = "linux")]
pub fn is_linux_cursor_inside_island_bounds(
    app: &AppHandle,
    bounds: Option<&IslandBounds>,
) -> (bool, bool) {
    let Some((bx, by, bw, bh)) = bounds.and_then(|b| b.normalized_rect()) else {
        return (false, false);
    };
    let Some((rel_x, rel_y, ctrl, _)) = poll_linux_cursor_and_mods(app) else {
        return (false, false);
    };
    let pad = 4.0;
    let inside = rel_x >= (bx - pad)
        && rel_x <= (bx + bw + pad)
        && rel_y >= (by - pad)
        && rel_y <= (by + bh + pad);
    (inside, ctrl)
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
    let Some((bx, by, bw, bh)) = bounds.and_then(|b| b.normalized_rect()) else {
        return false;
    };
    let Some((rel_x, rel_y, _)) =
        query_windows_cursor_pos_and_lmb(app, hwnd_raw, disp_x, disp_y)
    else {
        return false;
    };
    let pad = 4.0;
    rel_x >= (bx - pad)
        && rel_x <= (bx + bw + pad)
        && rel_y >= (by - pad)
        && rel_y <= (by + bh + pad)
}

fn start_cursor_watcher(app: AppHandle) {
    thread::spawn(move || {
        let mut drag_out_release_ticks: u32 = 0;

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
                    if drag_out_release_ticks < 6 {
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
                    if !is_cursor_inside_island_bounds(
                        &app,
                        hwnd_raw,
                        disp_x,
                        disp_y,
                        bounds_opt.as_ref(),
                    ) {
                        if let Ok(mut ov) = state.overlay.lock() {
                            ov.cursor_inside_island = false;
                            ov.ignore_mouse = true;
                        }
                        apply_overlay_styles(hwnd_raw, true);
                        let _ = app.emit("island:cursor-outside", ());
                    }
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
                    if drag_out_release_ticks < 18 {
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
                    let effective_ctrl = is_ctrl || ctrl_now;
                    let effective_ignore = !inside_now || effective_ctrl;
                    if let Ok(mut ov) = state.overlay.lock() {
                        ov.is_ctrl_held = effective_ctrl;
                        ov.cursor_inside_island = inside_now && !effective_ctrl;
                        ov.ignore_mouse = effective_ignore;
                    }
                    apply_linux_overlay_state(&app);
                    if inside_now && !effective_ctrl {
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

            #[cfg(windows)]
            if is_ctrl {
                continue;
            }

            let Some(bounds) = bounds_opt else {
                continue;
            };
            let Some((bx, by, bw, bh)) = bounds.normalized_rect() else {
                continue;
            };

            #[cfg(windows)]
            let (rel_x, rel_y, lmb_down) = {
                let Some(pos) =
                    query_windows_cursor_pos_and_lmb(&app, hwnd_raw, disp_x, disp_y)
                else {
                    continue;
                };
                pos
            };

            #[cfg(target_os = "linux")]
            let (rel_x, rel_y, lmb_down) = {
                let _ = (disp_x, disp_y);
                let Some((rx, ry, ctrl_now, lmb)) = poll_linux_cursor_and_mods(&app) else {
                    continue;
                };
                if ctrl_now != is_ctrl {
                    if let Ok(mut ov) = state.overlay.lock() {
                        ov.is_ctrl_held = ctrl_now;
                    }
                    apply_linux_overlay_state(&app);
                }
                if ctrl_now {
                    continue;
                }
                (rx, ry, lmb)
            };

            #[cfg(not(any(windows, target_os = "linux")))]
            let (rel_x, rel_y, lmb_down) = {
                let _ = (disp_x, disp_y);
                continue;
            };

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
                    #[cfg(target_os = "linux")]
                    apply_linux_overlay_state(&app);
                    if !prev_inside && lmb_down {
                        let _ = app.emit("shelf:drag-enter", ());
                    }
                    let _ = app.emit("island:cursor-entered", ());
                }
            } else if prev_inside {
                if !lmb_down {
                    {
                        if let Ok(mut ov) = state.overlay.lock() {
                            ov.cursor_inside_island = false;
                            #[cfg(target_os = "linux")]
                            {
                                ov.ignore_mouse = true;
                            }
                        }
                    }
                    #[cfg(target_os = "linux")]
                    apply_linux_overlay_state(&app);
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

static LOGGED_FIRST_BOUNDS: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[tauri::command]
pub fn update_island_bounds(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    bounds: Option<IslandBounds>,
) {
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
    #[cfg(target_os = "linux")]
    apply_linux_overlay_state(&app);
    #[cfg(not(target_os = "linux"))]
    let _ = app;
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
