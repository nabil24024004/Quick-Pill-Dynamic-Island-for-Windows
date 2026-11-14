use crate::state::{from_wide_slice, to_wide, SharedState};
use chrono::Utc;
use once_cell::sync::Lazy;
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};
use tauri::{AppHandle, Emitter};

#[cfg(windows)]
use windows::{
    core::{PCWSTR, PWSTR},
    Win32::{
        Devices::Bluetooth::{
            BluetoothFindDeviceClose, BluetoothFindFirstDevice, BluetoothFindFirstRadio,
            BluetoothFindNextDevice, BluetoothFindRadioClose, BLUETOOTH_DEVICE_INFO,
            BLUETOOTH_DEVICE_SEARCH_PARAMS, BLUETOOTH_FIND_RADIO_PARAMS,
        },
        Foundation::{CloseHandle, HANDLE, HGLOBAL, HWND, MAX_PATH},
        Storage::FileSystem::{GetDriveTypeW, GetLogicalDrives, GetVolumeInformationW},
        System::{
            DataExchange::{
                CloseClipboard, EmptyClipboard, GetClipboardData, IsClipboardFormatAvailable,
                OpenClipboard, SetClipboardData,
            },
            Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE},
            Ole::CF_UNICODETEXT,
            Registry::{
                RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, RegQueryValueExW, HKEY,
                HKEY_CURRENT_USER, KEY_READ, REG_QWORD, REG_VALUE_TYPE,
            },
        },
        UI::Input::KeyboardAndMouse::{
            keybd_event, GetKeyState, KEYEVENTF_KEYUP, VK_CAPITAL, VK_NUMLOCK, VK_VOLUME_DOWN,
            VK_VOLUME_MUTE, VK_VOLUME_UP,
        },
    },
};

#[derive(Debug, Clone, Serialize)]
pub struct SystemMetrics {
    pub cpu: u32,
    pub ram: u32,
}

static SYS_METRICS: Lazy<Mutex<System>> = Lazy::new(|| {
    let mut sys = System::new_with_specifics(
        RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );
    sys.refresh_cpu_usage();
    sys.refresh_memory();
    Mutex::new(sys)
});

#[tauri::command]
pub fn get_system_metrics() -> SystemMetrics {
    let Ok(mut sys) = SYS_METRICS.lock() else {
        return SystemMetrics { cpu: 0, ram: 0 };
    };
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpu = sys.global_cpu_usage().round().clamp(0.0, 100.0) as u32;
    let total = sys.total_memory();
    let used = sys.used_memory();
    let ram = if total > 0 {
        (((used as f64) / (total as f64)) * 100.0)
            .round()
            .clamp(0.0, 100.0) as u32
    } else {
        0
    };

    SystemMetrics { cpu, ram }
}

#[cfg(windows)]
unsafe fn read_reg_qword(hkey: HKEY, value_name: &str) -> Option<u64> {
    let wide = to_wide(value_name);
    let mut reg_type = REG_VALUE_TYPE(0);
    let mut data = 0u64;
    let mut size = std::mem::size_of::<u64>() as u32;
    let status = RegQueryValueExW(
        hkey,
        PCWSTR(wide.as_ptr()),
        None,
        Some(&mut reg_type),
        Some(&mut data as *mut u64 as *mut u8),
        Some(&mut size),
    );
    if status.is_ok() && (reg_type == REG_QWORD || size == 8) {
        Some(data)
    } else {
        None
    }
}

#[cfg(windows)]
fn check_consent_subkey_active(base_path: &str) -> bool {
    unsafe {
        let wide_base = to_wide(base_path);
        let mut hkey = HKEY::default();
        if RegOpenKeyExW(
            HKEY_CURRENT_USER,
            PCWSTR(wide_base.as_ptr()),
            0,
            KEY_READ,
            &mut hkey,
        )
        .is_err()
        {
            return false;
        }

        let mut idx = 0u32;
        let mut active = false;
        loop {
            let mut name_buf = [0u16; 256];
            let mut name_len = name_buf.len() as u32;
            let status = RegEnumKeyExW(
                hkey,
                idx,
                PWSTR(name_buf.as_mut_ptr()),
                &mut name_len,
                None,
                PWSTR::null(),
                None,
                None,
            );
            if status.is_err() {
                break;
            }
            idx += 1;

            let sub_name = from_wide_slice(&name_buf[..name_len as usize]);
            if sub_name.eq_ignore_ascii_case("NonPackaged") {
                if check_consent_subkey_active(&format!(r"{base_path}\NonPackaged")) {
                    active = true;
                    break;
                }
                continue;
            }

            let sub_path = to_wide(&format!(r"{base_path}\{sub_name}"));
            let mut sub_key = HKEY::default();
            if RegOpenKeyExW(
                HKEY_CURRENT_USER,
                PCWSTR(sub_path.as_ptr()),
                0,
                KEY_READ,
                &mut sub_key,
            )
            .is_ok()
            {
                let start = read_reg_qword(sub_key, "LastUsedTimeStart").unwrap_or(0);
                let stop = read_reg_qword(sub_key, "LastUsedTimeStop").unwrap_or(1);
                let _ = RegCloseKey(sub_key);
                if start > 0 && stop == 0 {
                    active = true;
                    break;
                }
            }
        }

        let _ = RegCloseKey(hkey);
        active
    }
}

fn is_capability_in_use(capability_name: &str) -> bool {
    #[cfg(windows)]
    {
        let root = format!(
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\{capability_name}"
        );
        return check_consent_subkey_active(&root);
    }
    #[cfg(not(windows))]
    false
}

#[tauri::command]
pub fn get_camera_status() -> bool {
    is_capability_in_use("webcam")
}

#[tauri::command]
pub fn get_microphone_status() -> bool {
    is_capability_in_use("microphone")
}

#[tauri::command]
pub fn get_bluetooth_status(state: tauri::State<'_, SharedState>) -> Value {
    let now_ms = Utc::now().timestamp_millis();
    if let Ok(cache) = state.bluetooth_cache.lock() {
        if now_ms - cache.0 < 3000 {
            return cache.1.clone();
        }
    }

    let result = query_bluetooth_native();
    if let Ok(mut cache) = state.bluetooth_cache.lock() {
        *cache = (now_ms, result.clone());
    }
    result
}

fn query_bluetooth_native() -> Value {
    #[cfg(windows)]
    unsafe {
        let radio_params = BLUETOOTH_FIND_RADIO_PARAMS {
            dwSize: std::mem::size_of::<BLUETOOTH_FIND_RADIO_PARAMS>() as u32,
        };
        let mut hradio = HANDLE::default();
        let Ok(hfind_radio) = BluetoothFindFirstRadio(&radio_params, &mut hradio) else {
            return json!({
                "connected": false,
                "devices": []
            });
        };
        if !hradio.is_invalid() {
            let _ = CloseHandle(hradio);
        }
        let _ = BluetoothFindRadioClose(hfind_radio);

        let search_params = BLUETOOTH_DEVICE_SEARCH_PARAMS {
            dwSize: std::mem::size_of::<BLUETOOTH_DEVICE_SEARCH_PARAMS>() as u32,
            fReturnAuthenticated: true.into(),
            fReturnRemembered: false.into(),
            fReturnUnknown: false.into(),
            fReturnConnected: true.into(),
            fIssueInquiry: false.into(),
            cTimeoutMultiplier: 0,
            hRadio: HANDLE::default(),
        };

        let mut device_info = BLUETOOTH_DEVICE_INFO {
            dwSize: std::mem::size_of::<BLUETOOTH_DEVICE_INFO>() as u32,
            ..Default::default()
        };

        let mut connected_names: Vec<String> = Vec::new();
        if let Ok(hfind_dev) = BluetoothFindFirstDevice(&search_params, &mut device_info) {
            loop {
                if device_info.fConnected.as_bool() {
                    let name = from_wide_slice(&device_info.szName).trim().to_string();
                    if !name.is_empty() && !connected_names.contains(&name) {
                        connected_names.push(name);
                    }
                }
                if BluetoothFindNextDevice(hfind_dev, &mut device_info).is_err() {
                    break;
                }
            }
            let _ = BluetoothFindDeviceClose(hfind_dev);
        }

        return json!({
            "connected": !connected_names.is_empty(),
            "devices": connected_names
        });
    }

    #[cfg(not(windows))]
    json!({ "connected": false, "devices": [] })
}

#[cfg(windows)]
unsafe fn with_open_clipboard<F, T>(mut f: F) -> Result<T, String>
where
    F: FnMut() -> Result<T, String>,
{
    let mut opened = false;
    for _ in 0..4 {
        if OpenClipboard(HWND::default()).is_ok() {
            opened = true;
            break;
        }
        thread::sleep(Duration::from_millis(12));
    }
    if !opened {
        return Err("Failed to open Windows clipboard".to_string());
    }
    let res = f();
    let _ = CloseClipboard();
    res
}

#[tauri::command]
pub fn get_clipboard_text() -> String {
    #[cfg(windows)]
    unsafe {
        if IsClipboardFormatAvailable(CF_UNICODETEXT.0 as u32).is_err() {
            return String::new();
        }
        return with_open_clipboard(|| {
            let Ok(handle) = GetClipboardData(CF_UNICODETEXT.0 as u32) else {
                return Ok(String::new());
            };
            let hglobal = HGLOBAL(handle.0);
            let ptr = GlobalLock(hglobal) as *const u16;
            if ptr.is_null() {
                return Ok(String::new());
            }
            let mut len = 0usize;
            while len < 4 * 1024 * 1024 && *ptr.add(len) != 0 {
                len += 1;
            }
            let text = String::from_utf16_lossy(std::slice::from_raw_parts(ptr, len));
            let _ = GlobalUnlock(hglobal);
            Ok(text)
        })
        .unwrap_or_default();
    }
    #[cfg(not(windows))]
    String::new()
}

#[tauri::command]
pub fn write_clipboard_text(text: String) -> bool {
    #[cfg(windows)]
    unsafe {
        let wide = to_wide(&text);
        let byte_len = wide.len() * std::mem::size_of::<u16>();
        return with_open_clipboard(|| {
            let _ = EmptyClipboard();
            let hglobal = GlobalAlloc(GMEM_MOVEABLE, byte_len)
                .map_err(|e| format!("GlobalAlloc failed: {e}"))?;
            let ptr = GlobalLock(hglobal) as *mut u16;
            if ptr.is_null() {
                return Err("GlobalLock returned null".to_string());
            }
            std::ptr::copy_nonoverlapping(wide.as_ptr(), ptr, wide.len());
            let _ = GlobalUnlock(hglobal);
            SetClipboardData(CF_UNICODETEXT.0 as u32, HANDLE(hglobal.0))
                .map_err(|e| format!("SetClipboardData failed: {e}"))?;
            Ok(true)
        })
        .unwrap_or(false);
    }
    #[cfg(not(windows))]
    false
}

#[tauri::command]
pub fn clear_clipboard() -> bool {
    #[cfg(windows)]
    unsafe {
        return with_open_clipboard(|| {
            let _ = EmptyClipboard();
            Ok(true)
        })
        .unwrap_or(false);
    }
    #[cfg(not(windows))]
    false
}

#[tauri::command]
pub fn control_system_volume(action: String) -> bool {
    #[cfg(windows)]
    unsafe {
        let vk = match action.trim().to_lowercase().as_str() {
            "up" => VK_VOLUME_UP.0,
            "down" => VK_VOLUME_DOWN.0,
            "mute" => VK_VOLUME_MUTE.0,
            _ => return false,
        };
        keybd_event(vk as u8, 0, Default::default(), 0);
        keybd_event(vk as u8, 0, KEYEVENTF_KEYUP, 0);
        true
    }
    #[cfg(not(windows))]
    false
}

#[cfg(windows)]
fn scan_removable_drives() -> HashMap<String, String> {
    let mut map = HashMap::new();
    unsafe {
        let mask = GetLogicalDrives();
        for bit in 0..26u32 {
            if (mask & (1 << bit)) == 0 {
                continue;
            }
            let letter = (b'A' + bit as u8) as char;
            let root = format!("{letter}:\\");
            let wide_root = to_wide(&root);
            // DRIVE_REMOVABLE == 2
            if GetDriveTypeW(PCWSTR(wide_root.as_ptr())) == 2 {
                let mut vol_name = [0u16; MAX_PATH as usize + 1];
                let ok = GetVolumeInformationW(
                    PCWSTR(wide_root.as_ptr()),
                    Some(&mut vol_name),
                    None,
                    None,
                    None,
                    None,
                )
                .is_ok();
                let label = if ok {
                    let s = from_wide_slice(&vol_name).trim().to_string();
                    if s.is_empty() {
                        format!("USB Drive ({letter}:)")
                    } else {
                        format!("{s} ({letter}:)")
                    }
                } else {
                    format!("USB Drive ({letter}:)")
                };
                map.insert(format!("{letter}:"), label);
            }
        }
    }
    map
}

pub fn start_system_watchers(app: AppHandle) {
    // 1. Key lock watcher (CapsLock / NumLock) dispatched safely on main thread
    let app_keys = app.clone();
    thread::spawn(move || {
        let prev_caps = Arc::new(AtomicBool::new(false));
        let prev_num = Arc::new(AtomicBool::new(false));
        let initialized = Arc::new(AtomicBool::new(false));

        loop {
            thread::sleep(Duration::from_millis(180));
            let app_emit = app_keys.clone();
            let pc = prev_caps.clone();
            let pn = prev_num.clone();
            let init = initialized.clone();

            let _ = app_keys.run_on_main_thread(move || {
                #[cfg(windows)]
                unsafe {
                    let caps = (GetKeyState(VK_CAPITAL.0 as i32) & 1) != 0;
                    let num = (GetKeyState(VK_NUMLOCK.0 as i32) & 1) != 0;
                    if !init.swap(true, Ordering::SeqCst) {
                        pc.store(caps, Ordering::SeqCst);
                        pn.store(num, Ordering::SeqCst);
                        return;
                    }
                    let old_caps = pc.swap(caps, Ordering::SeqCst);
                    let old_num = pn.swap(num, Ordering::SeqCst);
                    if caps != old_caps {
                        let _ = app_emit.emit(
                            "key-lock-change",
                            json!({ "key": "CapsLock", "state": caps }),
                        );
                    }
                    if num != old_num {
                        let _ = app_emit.emit(
                            "key-lock-change",
                            json!({ "key": "NumLock", "state": num }),
                        );
                    }
                }
            });
        }
    });

    // 2. USB removable drive watcher
    let app_usb = app;
    thread::spawn(move || {
        #[cfg(windows)]
        let mut prev = scan_removable_drives();
        #[cfg(not(windows))]
        let mut prev: HashMap<String, String> = HashMap::new();

        loop {
            thread::sleep(Duration::from_millis(2000));
            #[cfg(windows)]
            let curr = scan_removable_drives();
            #[cfg(not(windows))]
            let curr: HashMap<String, String> = HashMap::new();

            for (drive, name) in &curr {
                if !prev.contains_key(drive) {
                    let _ = app_usb.emit(
                        "usb-change",
                        json!({ "name": name, "action": "connected" }),
                    );
                }
            }
            for (drive, name) in &prev {
                if !curr.contains_key(drive) {
                    let _ = app_usb.emit(
                        "usb-change",
                        json!({ "name": name, "action": "disconnected" }),
                    );
                }
            }
            prev = curr;
        }
    });
}
