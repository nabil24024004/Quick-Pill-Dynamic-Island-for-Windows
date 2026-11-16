use std::sync::atomic::{AtomicU64, Ordering};

const APP_ID: &str = "NeoSparkX.QuickPill.SingleInstance";
static LAST_ACTIVATE_MS: AtomicU64 = AtomicU64::new(0);

/// Debounces burst activation signals (e.g. named event + window broadcast for one launch).
pub fn try_claim_activation_window() -> bool {
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1);
    let mut prev = LAST_ACTIVATE_MS.load(Ordering::SeqCst);
    loop {
        if prev != 0 && now_ms.saturating_sub(prev) < 300 {
            return false;
        }
        match LAST_ACTIVATE_MS.compare_exchange(
            prev,
            now_ms.max(1),
            Ordering::SeqCst,
            Ordering::SeqCst,
        ) {
            Ok(_) => return true,
            Err(actual) => prev = actual,
        }
    }
}

pub enum InstanceAcquire {
    Primary(SingleInstanceGuard),
    Secondary,
}

pub fn try_acquire() -> InstanceAcquire {
    try_acquire_with_id(APP_ID)
}

#[cfg(windows)]
mod platform {
    use super::{try_claim_activation_window, InstanceAcquire};
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::{Arc, Mutex, OnceLock};
    use std::thread::JoinHandle;
    use tauri::AppHandle;
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{
        CloseHandle, GetLastError, ERROR_ACCESS_DENIED, ERROR_ALREADY_EXISTS, HANDLE, LPARAM,
        WAIT_OBJECT_0, WPARAM,
    };
    use windows::Win32::System::Threading::{
        CreateEventW, CreateMutexW, OpenEventW, SetEvent, WaitForSingleObject, EVENT_MODIFY_STATE,
        INFINITE,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        PostMessageW, RegisterWindowMessageW, HWND_BROADCAST,
    };

    static ACTIVATE_MSG_ID: OnceLock<u32> = OnceLock::new();

    fn to_wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    pub fn activate_msg_id() -> u32 {
        *ACTIVATE_MSG_ID.get_or_init(|| unsafe {
            let name = to_wide("NeoSparkX.QuickPill.SingleInstance.ActivateMsg");
            RegisterWindowMessageW(PCWSTR(name.as_ptr()))
        })
    }

    pub struct SingleInstanceGuard {
        mutex_raw: isize,
        event_raw: isize,
        stopped: Arc<AtomicBool>,
        listener_thread: Mutex<Option<JoinHandle<()>>>,
    }

    impl Drop for SingleInstanceGuard {
        fn drop(&mut self) {
            self.stopped.store(true, Ordering::SeqCst);
            unsafe {
                if self.event_raw != 0 {
                    let ev = HANDLE(self.event_raw as *mut std::ffi::c_void);
                    let _ = SetEvent(ev);
                }
            }
            if let Ok(mut guard) = self.listener_thread.lock() {
                if let Some(handle) = guard.take() {
                    let _ = handle.join();
                }
            }
            unsafe {
                if self.event_raw != 0 {
                    let _ = CloseHandle(HANDLE(self.event_raw as *mut std::ffi::c_void));
                    self.event_raw = 0;
                }
                if self.mutex_raw != 0 {
                    let _ = CloseHandle(HANDLE(self.mutex_raw as *mut std::ffi::c_void));
                    self.mutex_raw = 0;
                }
            }
        }
    }

    fn signal_existing(event_name: &str) {
        unsafe {
            let ev_wide = to_wide(event_name);
            if let Ok(ev) = OpenEventW(EVENT_MODIFY_STATE, false, PCWSTR(ev_wide.as_ptr())) {
                let _ = SetEvent(ev);
                let _ = CloseHandle(ev);
            }
            let msg = activate_msg_id();
            if msg != 0 {
                let _ = PostMessageW(HWND_BROADCAST, msg, WPARAM(0), LPARAM(0));
            }
        }
    }

    pub fn try_acquire_with_id(app_id: &str) -> InstanceAcquire {
        let mutex_name = format!("Local\\{app_id}.Mutex");
        let event_name = format!("Local\\{app_id}.Activate");
        let mutex_wide = to_wide(&mutex_name);

        unsafe {
            match CreateMutexW(None, false, PCWSTR(mutex_wide.as_ptr())) {
                Ok(mutex) => {
                    let already_exists = GetLastError() == ERROR_ALREADY_EXISTS;
                    if already_exists {
                        signal_existing(&event_name);
                        let _ = CloseHandle(mutex);
                        return InstanceAcquire::Secondary;
                    }

                    let ev_wide = to_wide(&event_name);
                    let event_raw = CreateEventW(None, false, false, PCWSTR(ev_wide.as_ptr()))
                        .map(|h| h.0 as isize)
                        .unwrap_or(0);

                    InstanceAcquire::Primary(SingleInstanceGuard {
                        mutex_raw: mutex.0 as isize,
                        event_raw,
                        stopped: Arc::new(AtomicBool::new(false)),
                        listener_thread: Mutex::new(None),
                    })
                }
                Err(err) => {
                    if err.code() == ERROR_ACCESS_DENIED.to_hresult() {
                        signal_existing(&event_name);
                        return InstanceAcquire::Secondary;
                    }
                    InstanceAcquire::Primary(SingleInstanceGuard {
                        mutex_raw: 0,
                        event_raw: 0,
                        stopped: Arc::new(AtomicBool::new(false)),
                        listener_thread: Mutex::new(None),
                    })
                }
            }
        }
    }

    pub fn start_activation_listener(app: AppHandle, guard: &SingleInstanceGuard) {
        let ev_raw = guard.event_raw;
        if ev_raw == 0 {
            return;
        }
        let stopped = Arc::clone(&guard.stopped);
        let handle = std::thread::spawn(move || loop {
            if stopped.load(Ordering::SeqCst) {
                break;
            }
            let wait_res = unsafe {
                WaitForSingleObject(HANDLE(ev_raw as *mut std::ffi::c_void), INFINITE)
            };
            if stopped.load(Ordering::SeqCst) {
                break;
            }
            if wait_res == WAIT_OBJECT_0 && try_claim_activation_window() {
                let app_cb = app.clone();
                let _ = app.run_on_main_thread(move || {
                    crate::window_overlay::activate_existing_instance(&app_cb);
                });
            }
        });
        if let Ok(mut slot) = guard.listener_thread.lock() {
            *slot = Some(handle);
        }
    }
}

#[cfg(target_os = "linux")]
mod platform {
    use super::{try_claim_activation_window, InstanceAcquire};
    use std::io::Write;
    use std::os::unix::net::{UnixListener, UnixStream};
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::{Arc, Mutex};
    use std::thread::JoinHandle;
    use tauri::AppHandle;

    fn socket_path_for(app_id: &str) -> PathBuf {
        let sanitized: String = app_id
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
            .collect();
        if let Ok(runtime_dir) = std::env::var("XDG_RUNTIME_DIR") {
            let trimmed = runtime_dir.trim();
            if !trimmed.is_empty() {
                return PathBuf::from(trimmed).join(format!("{sanitized}.sock"));
            }
        }
        let user = std::env::var("USER").unwrap_or_else(|_| "user".to_string());
        std::env::temp_dir().join(format!("{sanitized}-{user}.sock"))
    }

    pub struct SingleInstanceGuard {
        sock_path: PathBuf,
        listener: Mutex<Option<UnixListener>>,
        stopped: Arc<AtomicBool>,
        listener_thread: Mutex<Option<JoinHandle<()>>>,
        owns_socket: bool,
    }

    impl Drop for SingleInstanceGuard {
        fn drop(&mut self) {
            self.stopped.store(true, Ordering::SeqCst);
            if self.owns_socket {
                let _ = UnixStream::connect(&self.sock_path);
            }
            if let Ok(mut guard) = self.listener_thread.lock() {
                if let Some(handle) = guard.take() {
                    let _ = handle.join();
                }
            }
            if self.owns_socket {
                let _ = std::fs::remove_file(&self.sock_path);
            }
        }
    }

    pub fn try_acquire_with_id(app_id: &str) -> InstanceAcquire {
        let sock_path = socket_path_for(app_id);
        if let Ok(mut stream) = UnixStream::connect(&sock_path) {
            let _ = stream.write_all(b"ACTIVATE\n");
            let _ = stream.flush();
            return InstanceAcquire::Secondary;
        }
        let _ = std::fs::remove_file(&sock_path);
        match UnixListener::bind(&sock_path) {
            Ok(listener) => InstanceAcquire::Primary(SingleInstanceGuard {
                sock_path,
                listener: Mutex::new(Some(listener)),
                stopped: Arc::new(AtomicBool::new(false)),
                listener_thread: Mutex::new(None),
                owns_socket: true,
            }),
            Err(_) => InstanceAcquire::Primary(SingleInstanceGuard {
                sock_path,
                listener: Mutex::new(None),
                stopped: Arc::new(AtomicBool::new(false)),
                listener_thread: Mutex::new(None),
                owns_socket: false,
            }),
        }
    }

    pub fn start_activation_listener(app: AppHandle, guard: &SingleInstanceGuard) {
        let listener = match guard.listener.lock() {
            Ok(mut slot) => slot.take(),
            Err(_) => None,
        };
        let Some(listener) = listener else {
            return;
        };
        let stopped = Arc::clone(&guard.stopped);
        let handle = std::thread::spawn(move || {
            for conn in listener.incoming() {
                if stopped.load(Ordering::SeqCst) {
                    break;
                }
                if conn.is_ok() && try_claim_activation_window() {
                    let app_cb = app.clone();
                    let _ = app.run_on_main_thread(move || {
                        crate::window_overlay::activate_existing_instance(&app_cb);
                    });
                }
            }
        });
        if let Ok(mut slot) = guard.listener_thread.lock() {
            *slot = Some(handle);
        }
    }
}

#[cfg(not(any(windows, target_os = "linux")))]
mod platform {
    use super::InstanceAcquire;
    use tauri::AppHandle;

    pub struct SingleInstanceGuard;

    pub fn try_acquire_with_id(_app_id: &str) -> InstanceAcquire {
        InstanceAcquire::Primary(SingleInstanceGuard)
    }

    pub fn start_activation_listener(_app: AppHandle, _guard: &SingleInstanceGuard) {}
}

pub use platform::{start_activation_listener, try_acquire_with_id, SingleInstanceGuard};

#[cfg(windows)]
pub use platform::activate_msg_id;

#[cfg(test)]
mod tests {
    use super::{try_acquire_with_id, InstanceAcquire};

    #[test]
    fn secondary_instance_is_blocked_until_primary_drops() {
        let test_id = format!("NeoSparkX.QuickPill.Test.{}", std::process::id());
        let first = try_acquire_with_id(&test_id);
        let guard = match first {
            InstanceAcquire::Primary(g) => g,
            InstanceAcquire::Secondary => panic!("expected first acquire to become primary"),
        };

        assert!(
            matches!(try_acquire_with_id(&test_id), InstanceAcquire::Secondary),
            "expected second acquire while primary is alive to return Secondary"
        );

        drop(guard);

        assert!(
            matches!(try_acquire_with_id(&test_id), InstanceAcquire::Primary(_)),
            "expected re-acquire after dropping primary guard to succeed"
        );
    }
}
