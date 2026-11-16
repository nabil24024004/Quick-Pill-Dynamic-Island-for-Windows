use crate::state::SharedState;
#[cfg(windows)]
use crate::state::{from_wide_slice, to_wide};
use chrono::Utc;
use once_cell::sync::Lazy;
use serde::Serialize;
use serde_json::{json, Value};
#[cfg(not(target_os = "linux"))]
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::Duration;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "linux")]
static WATCHER_APP: OnceLock<AppHandle> = OnceLock::new();
#[cfg(not(target_os = "linux"))]
#[allow(dead_code)]
static WATCHER_APP: OnceLock<AppHandle> = OnceLock::new();

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
pub async fn get_system_metrics() -> SystemMetrics {
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
    #[cfg(target_os = "linux")]
    {
        return match capability_name {
            "webcam" => linux_sys::is_camera_in_use(),
            "microphone" => linux_sys::is_microphone_in_use(),
            _ => false,
        };
    }
    #[cfg(all(not(windows), not(target_os = "linux")))]
    false
}

#[tauri::command]
pub async fn get_camera_status() -> bool {
    is_capability_in_use("webcam")
}

#[tauri::command]
pub async fn get_microphone_status() -> bool {
    is_capability_in_use("microphone")
}

#[tauri::command]
pub async fn get_bluetooth_status(state: tauri::State<'_, SharedState>) -> Result<Value, String> {
    let now_ms = Utc::now().timestamp_millis();
    if let Ok(cache) = state.bluetooth_cache.lock() {
        if now_ms - cache.0 < 3000 {
            return Ok(cache.1.clone());
        }
    }

    let result = query_bluetooth_native();
    if let Ok(mut cache) = state.bluetooth_cache.lock() {
        *cache = (now_ms, result.clone());
    }
    Ok(result)
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

    #[cfg(target_os = "linux")]
    return linux_sys::query_bluetooth();

    #[cfg(all(not(windows), not(target_os = "linux")))]
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
pub async fn get_clipboard_text() -> String {
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
    #[cfg(target_os = "linux")]
    return linux_sys::get_clipboard_text();

    #[cfg(all(not(windows), not(target_os = "linux")))]
    String::new()
}

#[tauri::command]
pub async fn write_clipboard_text(text: String) -> bool {
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
    #[cfg(target_os = "linux")]
    return linux_sys::write_clipboard_text(&text);

    #[cfg(all(not(windows), not(target_os = "linux")))]
    false
}

#[tauri::command]
pub async fn clear_clipboard() -> bool {
    #[cfg(windows)]
    unsafe {
        return with_open_clipboard(|| {
            let _ = EmptyClipboard();
            Ok(true)
        })
        .unwrap_or(false);
    }
    #[cfg(target_os = "linux")]
    return linux_sys::clear_clipboard();

    #[cfg(all(not(windows), not(target_os = "linux")))]
    false
}

#[tauri::command]
pub async fn control_system_volume(action: String) -> bool {
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
    #[cfg(target_os = "linux")]
    return linux_sys::control_system_volume(&action);

    #[cfg(all(not(windows), not(target_os = "linux")))]
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
    let _ = WATCHER_APP.set(app.clone());

    // 1. Key lock watcher (CapsLock / NumLock)
    let app_keys = app.clone();
    thread::spawn(move || {
        let prev_caps = Arc::new(AtomicBool::new(false));
        let prev_num = Arc::new(AtomicBool::new(false));
        let initialized = Arc::new(AtomicBool::new(false));

        loop {
            thread::sleep(Duration::from_millis(320));
            #[cfg(windows)]
            {
                let app_emit = app_keys.clone();
                let pc = prev_caps.clone();
                let pn = prev_num.clone();
                let init = initialized.clone();

                let _ = app_keys.run_on_main_thread(move || unsafe {
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
                });
            }
            #[cfg(target_os = "linux")]
            {
                if let Some((caps, num)) = linux_sys::read_key_lock_states() {
                    if !initialized.swap(true, Ordering::SeqCst) {
                        prev_caps.store(caps, Ordering::SeqCst);
                        prev_num.store(num, Ordering::SeqCst);
                        continue;
                    }
                    let old_caps = prev_caps.swap(caps, Ordering::SeqCst);
                    let old_num = prev_num.swap(num, Ordering::SeqCst);
                    if caps != old_caps {
                        let _ = app_keys.emit(
                            "key-lock-change",
                            json!({ "key": "CapsLock", "state": caps }),
                        );
                    }
                    if num != old_num {
                        let _ = app_keys.emit(
                            "key-lock-change",
                            json!({ "key": "NumLock", "state": num }),
                        );
                    }
                }
            }
        }
    });

    // 2. USB removable drive watcher
    let app_usb = app;
    thread::spawn(move || {
        #[cfg(windows)]
        let mut prev = scan_removable_drives();
        #[cfg(target_os = "linux")]
        let mut prev = linux_sys::scan_removable_drives();
        #[cfg(all(not(windows), not(target_os = "linux")))]
        let mut prev: HashMap<String, String> = HashMap::new();

        loop {
            thread::sleep(Duration::from_millis(2000));
            #[cfg(windows)]
            let curr = scan_removable_drives();
            #[cfg(target_os = "linux")]
            let curr = linux_sys::scan_removable_drives();
            #[cfg(all(not(windows), not(target_os = "linux")))]
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

#[cfg(target_os = "linux")]
mod linux_sys {
    use super::WATCHER_APP;
    use serde_json::{json, Value};
    use std::collections::HashMap;
    use std::fs;
    use std::io::Write;
    use std::path::Path;
    use std::process::{Command, Stdio};
    use std::sync::{mpsc, Mutex};
    use std::time::{Duration, Instant};
    use zbus::blocking::{Connection, Proxy};
    use zbus::zvariant::{OwnedObjectPath, OwnedValue, Value as ZVal};

    static XSET_CACHE: Mutex<Option<(Instant, Option<(bool, bool)>)>> = Mutex::new(None);
    static CAMERA_CACHE: Mutex<Option<(Instant, bool)>> = Mutex::new(None);
    static MIC_CACHE: Mutex<Option<(Instant, bool)>> = Mutex::new(None);
    const PRIVACY_CACHE_TTL: Duration = Duration::from_millis(3000);
    const XSET_CACHE_TTL: Duration = Duration::from_millis(2000);

    pub fn is_camera_in_use() -> bool {
        if let Ok(guard) = CAMERA_CACHE.lock() {
            if let Some((ts, val)) = *guard {
                if ts.elapsed() < PRIVACY_CACHE_TTL {
                    return val;
                }
            }
        }
        let active = is_camera_in_use_uncached();
        if let Ok(mut guard) = CAMERA_CACHE.lock() {
            *guard = Some((Instant::now(), active));
        }
        active
    }

    fn is_camera_in_use_uncached() -> bool {
        let Ok(entries) = fs::read_dir("/proc") else {
            return false;
        };
        let own_pid = std::process::id().to_string();
        for entry in entries.flatten() {
            let fname = entry.file_name();
            let pid_str = fname.to_string_lossy();
            if pid_str == own_pid || !pid_str.bytes().all(|b| b.is_ascii_digit()) {
                continue;
            }
            let fd_dir = entry.path().join("fd");
            let Ok(fds) = fs::read_dir(fd_dir) else {
                continue;
            };
            for fd in fds.flatten() {
                if let Ok(target) = fs::read_link(fd.path()) {
                    if target.to_string_lossy().starts_with("/dev/video") {
                        return true;
                    }
                }
            }
        }
        false
    }

    pub fn is_microphone_in_use() -> bool {
        if let Ok(guard) = MIC_CACHE.lock() {
            if let Some((ts, val)) = *guard {
                if ts.elapsed() < PRIVACY_CACHE_TTL {
                    return val;
                }
            }
        }
        let active = is_microphone_in_use_uncached();
        if let Ok(mut guard) = MIC_CACHE.lock() {
            *guard = Some((Instant::now(), active));
        }
        active
    }

    fn is_microphone_in_use_uncached() -> bool {
        // Fast /proc/asound check first to avoid spawning pactl when ALSA capture substreams exist
        let mut saw_alsa_capture = false;
        if let Ok(cards) = fs::read_dir("/proc/asound") {
            for card in cards.flatten() {
                if !card.file_name().to_string_lossy().starts_with("card") {
                    continue;
                }
                if let Ok(pcms) = fs::read_dir(card.path()) {
                    for pcm in pcms.flatten() {
                        let name = pcm.file_name().to_string_lossy().to_string();
                        if !(name.starts_with("pcm") && name.ends_with('c')) {
                            continue;
                        }
                        saw_alsa_capture = true;
                        if let Ok(subs) = fs::read_dir(pcm.path()) {
                            for sub in subs.flatten() {
                                if sub.file_name().to_string_lossy().starts_with("sub") {
                                    if let Ok(status) = fs::read_to_string(sub.path().join("status")) {
                                        if status.contains("state: RUNNING") {
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if saw_alsa_capture {
            return false;
        }

        if let Ok(out) = Command::new("pactl")
            .env("LC_ALL", "C")
            .args(["-f", "json", "list", "source-outputs"])
            .output()
        {
            if out.status.success() {
                if let Ok(arr) = serde_json::from_slice::<Vec<Value>>(&out.stdout) {
                    for item in arr {
                        let corked = item.get("corked").and_then(|v| v.as_bool()).unwrap_or(false);
                        if corked {
                            continue;
                        }
                        let props = item.get("properties");
                        let media_name = props
                            .and_then(|p| p.get("media.name"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_lowercase();
                        let app_id = props
                            .and_then(|p| p.get("application.id"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_lowercase();
                        if media_name.contains("peak detect") || app_id == "org.pulseaudio.pavucontrol" {
                            continue;
                        }
                        return true;
                    }
                }
                return false;
            }
        }

        if let Ok(out) = Command::new("pactl")
            .env("LC_ALL", "C")
            .args(["list", "source-outputs"])
            .output()
        {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout);
                let mut corked = false;
                let mut in_block = false;
                let mut is_peak_meter = false;
                for line in text.lines() {
                    let t = line.trim();
                    if t.starts_with("Source Output #") {
                        if in_block && !corked && !is_peak_meter {
                            return true;
                        }
                        in_block = true;
                        corked = false;
                        is_peak_meter = false;
                    } else if in_block {
                        if let Some(v) = t.strip_prefix("Corked:") {
                            corked = v.trim().eq_ignore_ascii_case("yes");
                        } else if t.contains("Peak detect") {
                            is_peak_meter = true;
                        }
                    }
                }
                if in_block && !corked && !is_peak_meter {
                    return true;
                }
                return false;
            }
        }

        false
    }

    pub fn query_bluetooth() -> Value {
        if let Ok(conn) = Connection::system() {
            if let Ok(proxy) = Proxy::new(
                &conn,
                "org.bluez",
                "/",
                "org.freedesktop.DBus.ObjectManager",
            ) {
                type ManagedObjects =
                    HashMap<OwnedObjectPath, HashMap<String, HashMap<String, OwnedValue>>>;
                if let Ok(objs) = proxy.call::<_, _, ManagedObjects>("GetManagedObjects", &()) {
                    let mut names: Vec<String> = Vec::new();
                    for ifaces in objs.values() {
                        if let Some(dev) = ifaces.get("org.bluez.Device1") {
                            let connected = dev
                                .get("Connected")
                                .map(|v| matches!(&**v, ZVal::Bool(true)))
                                .unwrap_or(false);
                            if !connected {
                                continue;
                            }
                            let name = dev
                                .get("Alias")
                                .or_else(|| dev.get("Name"))
                                .and_then(|v| match &**v {
                                    ZVal::Str(s) => Some(s.as_str().trim().to_string()),
                                    _ => None,
                                })
                                .unwrap_or_default();
                            if !name.is_empty() && !names.contains(&name) {
                                names.push(name);
                            }
                        }
                    }
                    return json!({
                        "connected": !names.is_empty(),
                        "devices": names
                    });
                }
            }
        }

        if let Ok(out) = Command::new("bluetoothctl")
            .args(["devices", "Connected"])
            .output()
        {
            if out.status.success() {
                let mut names = Vec::new();
                for line in String::from_utf8_lossy(&out.stdout).lines() {
                    if let Some(rest) = line.trim().strip_prefix("Device ") {
                        if let Some((_mac, name)) = rest.split_once(' ') {
                            let clean = name.trim().to_string();
                            if !clean.is_empty() && !names.contains(&clean) {
                                names.push(clean);
                            }
                        }
                    }
                }
                return json!({
                    "connected": !names.is_empty(),
                    "devices": names
                });
            }
        }

        json!({ "connected": false, "devices": [] })
    }

    fn run_gtk_main<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> Option<T> {
        if gtk::is_initialized_main_thread() {
            return Some(f());
        }
        let app = WATCHER_APP.get()?;
        let (tx, rx) = mpsc::channel();
        if app
            .run_on_main_thread(move || {
                let _ = tx.send(f());
            })
            .is_err()
        {
            return None;
        }
        rx.recv_timeout(Duration::from_millis(500)).ok()
    }

    pub fn get_clipboard_text() -> String {
        if std::env::var_os("WAYLAND_DISPLAY").is_some() {
            if let Ok(out) = Command::new("wl-paste").arg("--no-newline").output() {
                if out.status.success() {
                    return String::from_utf8_lossy(&out.stdout).to_string();
                }
            }
        }
        if let Ok(out) = Command::new("xclip")
            .args(["-o", "-selection", "clipboard"])
            .output()
        {
            if out.status.success() {
                return String::from_utf8_lossy(&out.stdout).to_string();
            }
        }
        if let Ok(out) = Command::new("xsel").arg("-ob").output() {
            if out.status.success() {
                return String::from_utf8_lossy(&out.stdout).to_string();
            }
        }
        run_gtk_main(|| {
            let cb = gtk::Clipboard::get(&gdk::SELECTION_CLIPBOARD);
            cb.wait_for_text().map(|g| g.to_string()).unwrap_or_default()
        })
        .unwrap_or_default()
    }

    fn pipe_stdin(bin: &str, args: &[&str], text: &str) -> bool {
        let Ok(mut child) = Command::new(bin)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
        else {
            return false;
        };
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(text.as_bytes());
        }
        if bin == "xclip" || bin == "wl-copy" {
            // xclip / wl-copy fork a daemon to hold clipboard ownership; wait briefly for setup
            return child.try_wait().map(|s| s.map(|e| e.success()).unwrap_or(true)).unwrap_or(true);
        }
        child.wait().map(|s| s.success()).unwrap_or(false)
    }

    pub fn write_clipboard_text(text: &str) -> bool {
        if std::env::var_os("WAYLAND_DISPLAY").is_some() && pipe_stdin("wl-copy", &[], text) {
            return true;
        }
        if pipe_stdin("xclip", &["-selection", "clipboard"], text) {
            return true;
        }
        if pipe_stdin("xsel", &["-ib"], text) {
            return true;
        }
        let text_owned = text.to_string();
        run_gtk_main(move || {
            let cb = gtk::Clipboard::get(&gdk::SELECTION_CLIPBOARD);
            cb.set_text(&text_owned);
            cb.store();
            true
        })
        .unwrap_or(false)
    }

    pub fn clear_clipboard() -> bool {
        if std::env::var_os("WAYLAND_DISPLAY").is_some() {
            if Command::new("wl-copy")
                .arg("--clear")
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
            {
                return true;
            }
        }
        if Command::new("xsel")
            .arg("-bc")
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
        {
            return true;
        }
        if pipe_stdin("xclip", &["-selection", "clipboard"], "") {
            return true;
        }
        run_gtk_main(|| {
            let cb = gtk::Clipboard::get(&gdk::SELECTION_CLIPBOARD);
            cb.clear();
            true
        })
        .unwrap_or(false)
    }

    pub fn control_system_volume(action: &str) -> bool {
        let act = action.trim().to_lowercase();
        let (pa_args, wp_args, am_args): (&[&str], &[&str], &[&str]) = match act.as_str() {
            "up" => (
                &["set-sink-volume", "@DEFAULT_SINK@", "+5%"],
                &["set-volume", "-l", "1.0", "@DEFAULT_AUDIO_SINK@", "5%+"],
                &["set", "Master", "5%+"],
            ),
            "down" => (
                &["set-sink-volume", "@DEFAULT_SINK@", "-5%"],
                &["set-volume", "@DEFAULT_AUDIO_SINK@", "5%-"],
                &["set", "Master", "5%-"],
            ),
            "mute" => (
                &["set-sink-mute", "@DEFAULT_SINK@", "toggle"],
                &["set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"],
                &["set", "Master", "toggle"],
            ),
            _ => return false,
        };

        if Command::new("pactl").args(pa_args).status().map(|s| s.success()).unwrap_or(false) {
            return true;
        }
        if Command::new("wpctl").args(wp_args).status().map(|s| s.success()).unwrap_or(false) {
            return true;
        }
        Command::new("amixer").args(am_args).status().map(|s| s.success()).unwrap_or(false)
    }

    pub fn read_key_lock_states() -> Option<(bool, bool)> {
        let mut found_sysfs = false;
        let mut caps = false;
        let mut num = false;
        if let Ok(entries) = fs::read_dir("/sys/class/leds") {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                if name.ends_with("::capslock") {
                    found_sysfs = true;
                    if let Ok(b) = fs::read_to_string(entry.path().join("brightness")) {
                        if b.trim() != "0" {
                            caps = true;
                        }
                    }
                } else if name.ends_with("::numlock") {
                    found_sysfs = true;
                    if let Ok(b) = fs::read_to_string(entry.path().join("brightness")) {
                        if b.trim() != "0" {
                            num = true;
                        }
                    }
                }
            }
        }
        if found_sysfs {
            return Some((caps, num));
        }

        // Throttled X11 fallback via xset q so VMs without sysfs LEDs don't spawn xset 5x/sec
        if let Ok(guard) = XSET_CACHE.lock() {
            if let Some((ts, cached)) = *guard {
                if ts.elapsed() < XSET_CACHE_TTL {
                    return cached;
                }
            }
        }

        let mut parsed = None;
        if let Ok(out) = Command::new("xset").arg("q").output() {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout);
                for line in text.lines() {
                    if line.contains("Caps Lock:") {
                        let lc = line.to_lowercase();
                        if let Some(idx) = lc.find("caps lock:") {
                            caps = lc[idx + 10..].trim_start().starts_with("on");
                        }
                        if let Some(idx) = lc.find("num lock:") {
                            num = lc[idx + 9..].trim_start().starts_with("on");
                        }
                        parsed = Some((caps, num));
                        break;
                    }
                }
            }
        }
        if let Ok(mut guard) = XSET_CACHE.lock() {
            *guard = Some((Instant::now(), parsed));
        }
        parsed
    }

    pub fn scan_removable_drives() -> HashMap<String, String> {
        let mut map = HashMap::new();
        let mut label_by_dev: HashMap<String, String> = HashMap::new();
        if let Ok(entries) = fs::read_dir("/dev/disk/by-label") {
            for entry in entries.flatten() {
                let label = entry.file_name().to_string_lossy().replace("\\x20", " ");
                if let Ok(target) = fs::canonicalize(entry.path()) {
                    label_by_dev.insert(target.to_string_lossy().to_string(), label);
                }
            }
        }

        let Ok(mounts) = fs::read_to_string("/proc/mounts") else {
            return map;
        };
        for line in mounts.lines() {
            let mut parts = line.split_whitespace();
            let Some(dev) = parts.next() else { continue; };
            let Some(mount_raw) = parts.next() else { continue; };
            if !dev.starts_with("/dev/") || dev.starts_with("/dev/loop") {
                continue;
            }
            let dev_name = dev.trim_start_matches("/dev/");
            let block_name: String = dev_name
                .trim_end_matches(|c: char| c.is_ascii_digit())
                .trim_end_matches('p')
                .to_string();
            let check_candidates = [dev_name.to_string(), block_name];
            let mut is_removable = false;
            for blk in check_candidates {
                if blk.is_empty() {
                    continue;
                }
                let rem_path = Path::new("/sys/block").join(&blk).join("removable");
                if fs::read_to_string(&rem_path)
                    .map(|s| s.trim() == "1")
                    .unwrap_or(false)
                {
                    is_removable = true;
                    break;
                }
                if let Ok(sys_link) = fs::canonicalize(Path::new("/sys/block").join(&blk)) {
                    if sys_link.to_string_lossy().contains("/usb") {
                        is_removable = true;
                        break;
                    }
                }
            }
            if !is_removable {
                continue;
            }

            let mount_path = mount_raw.replace("\\040", " ");
            let canonical_dev = fs::canonicalize(dev)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| dev.to_string());
            let label = label_by_dev
                .get(&canonical_dev)
                .cloned()
                .or_else(|| {
                    Path::new(&mount_path)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(|s| s.to_string())
                })
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "USB Drive".to_string());

            map.insert(mount_path.clone(), format!("{label} ({mount_path})"));
        }
        map
    }
}
