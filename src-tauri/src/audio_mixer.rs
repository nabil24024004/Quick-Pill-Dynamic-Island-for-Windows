use crate::state::{extract_file_icon_data_url, from_wide_slice, read_file_description, to_wide, SharedState};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use windows::{
    core::{Interface, GUID, PCWSTR},
    Win32::{
        Devices::FunctionDiscovery::PKEY_Device_FriendlyName,
        Foundation::{CloseHandle, MAX_PATH, S_OK},
        Media::Audio::{
            eConsole, eRender, IAudioSessionControl2, IAudioSessionEnumerator, IAudioSessionManager2,
            IMMDevice, IMMDeviceEnumerator, ISimpleAudioVolume, MMDeviceEnumerator, AudioSessionStateActive,
            AudioSessionStateExpired, DEVICE_STATE_ACTIVE,
        },
        Media::Audio::Endpoints::{IAudioEndpointVolume, IAudioMeterInformation},
        System::{
            Com::{
                CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED, STGM_READ,
            },
            Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT, PROCESS_QUERY_LIMITED_INFORMATION},
        },
    },
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioDeviceInfo {
    pub id: String,
    pub name: String,
    pub volume: i32,
    pub muted: bool,
    pub is_default: bool,
    pub icon_type: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioSessionInfo {
    pub id: String,
    pub pid: u32,
    pub is_system_sounds: bool,
    pub process_name: String,
    pub display_name: String,
    pub exe_path: String,
    pub icon_data_url: Option<String>,
    pub volume: i32,
    pub muted: bool,
    pub peak: f32,
    pub state: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioSessionsResponse {
    pub device_id: String,
    pub device_name: String,
    pub master_volume: i32,
    pub master_muted: bool,
    pub sessions: Vec<AudioSessionInfo>,
}

unsafe fn ensure_com() {
    let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
}

unsafe fn create_enumerator() -> Result<IMMDeviceEnumerator, String> {
    ensure_com();
    CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
        .map_err(|e| format!("MMDeviceEnumerator failed: {e}"))
}

unsafe fn get_device_id(device: &IMMDevice) -> String {
    match device.GetId() {
        Ok(pwstr) => {
            let s = pwstr.to_string().unwrap_or_default();
            windows::Win32::System::Com::CoTaskMemFree(Some(pwstr.0 as *const _));
            s
        }
        Err(_) => String::new(),
    }
}

unsafe fn get_device_name(device: &IMMDevice) -> String {
    if let Ok(store) = device.OpenPropertyStore(STGM_READ) {
        if let Ok(prop) = store.GetValue(&PKEY_Device_FriendlyName) {
            let s = prop.to_string();
            if !s.is_empty() {
                return s;
            }
        }
    }
    "Audio Output Device".to_string()
}

fn infer_icon_type(name: &str) -> String {
    let lower = name.to_lowercase();
    if lower.contains("headphone")
        || lower.contains("headset")
        || lower.contains("earbud")
        || lower.contains("airpod")
        || lower.contains("buds")
    {
        "headphones".to_string()
    } else if lower.contains("bluetooth") {
        "bluetooth".to_string()
    } else if lower.contains("hdmi") || lower.contains("displayport") || lower.contains("monitor") {
        "monitor".to_string()
    } else {
        "speaker".to_string()
    }
}

unsafe fn resolve_device(
    enumerator: &IMMDeviceEnumerator,
    device_id: Option<&str>,
) -> Result<IMMDevice, String> {
    if let Some(id) = device_id.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        let wide = to_wide(id);
        if let Ok(dev) = enumerator.GetDevice(PCWSTR(wide.as_ptr())) {
            return Ok(dev);
        }
    }
    enumerator
        .GetDefaultAudioEndpoint(eRender, eConsole)
        .map_err(|e| format!("No default audio endpoint: {e}"))
}

fn get_process_exe_path(pid: u32) -> Option<String> {
    if pid == 0 {
        return None;
    }
    unsafe {
        let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
            return None;
        };
        let mut buf = vec![0u16; MAX_PATH as usize * 4];
        let mut len = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_FORMAT(0),
            windows::core::PWSTR(buf.as_mut_ptr()),
            &mut len,
        )
        .is_ok();
        let _ = CloseHandle(handle);
        if ok && len > 0 {
            Some(from_wide_slice(&buf[..len as usize]))
        } else {
            None
        }
    }
}

fn nicify_process_name(raw_name: &str) -> String {
    let base = raw_name
        .strip_suffix(".exe")
        .or_else(|| raw_name.strip_suffix(".EXE"))
        .unwrap_or(raw_name);
    let lower = base.to_lowercase();
    match lower.as_str() {
        "chrome" => "Google Chrome".to_string(),
        "msedge" => "Microsoft Edge".to_string(),
        "firefox" => "Firefox".to_string(),
        "brave" => "Brave".to_string(),
        "opera" => "Opera".to_string(),
        "spotify" => "Spotify".to_string(),
        "discord" | "discordptb" | "discordcanary" => "Discord".to_string(),
        "vlc" => "VLC Media Player".to_string(),
        "code" => "Visual Studio Code".to_string(),
        "obs64" | "obs32" => "OBS Studio".to_string(),
        "whatsapp" | "whatsapp.root" => "WhatsApp".to_string(),
        "telegram" => "Telegram".to_string(),
        "steam" | "steamwebhelper" => "Steam".to_string(),
        "explorer" => "Windows Explorer".to_string(),
        "svchost" => "System Services".to_string(),
        _ => {
            let mut chars = base.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => "Unknown App".to_string(),
            }
        }
    }
}

#[tauri::command]
pub fn audio_mixer_get_devices() -> Result<Vec<AudioDeviceInfo>, String> {
    unsafe {
        let enumerator = create_enumerator()?;
        let default_id = enumerator
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .ok()
            .map(|d| get_device_id(&d))
            .unwrap_or_default();

        let collection = enumerator
            .EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)
            .map_err(|e| format!("EnumAudioEndpoints failed: {e}"))?;
        let count = collection.GetCount().unwrap_or(0);

        let mut devices = Vec::with_capacity(count as usize);
        for i in 0..count {
            let Ok(device) = collection.Item(i) else {
                continue;
            };
            let id = get_device_id(&device);
            let name = get_device_name(&device);
            let mut volume = 100;
            let mut muted = false;

            if let Ok(ep_vol) = device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None) {
                if let Ok(scalar) = ep_vol.GetMasterVolumeLevelScalar() {
                    volume = (scalar * 100.0).round() as i32;
                }
                if let Ok(m) = ep_vol.GetMute() {
                    muted = m.as_bool();
                }
            }

            devices.push(AudioDeviceInfo {
                is_default: !default_id.is_empty() && id == default_id,
                icon_type: infer_icon_type(&name),
                id,
                name,
                volume: volume.clamp(0, 100),
                muted,
            });
        }
        Ok(devices)
    }
}

#[tauri::command]
pub fn audio_mixer_get_sessions(
    state: tauri::State<'_, SharedState>,
    device_id: Option<String>,
) -> Result<AudioSessionsResponse, String> {
    unsafe {
        let enumerator = create_enumerator()?;
        let device = resolve_device(&enumerator, device_id.as_deref())?;
        let resolved_id = get_device_id(&device);
        let device_name = get_device_name(&device);

        let mut master_volume = 100;
        let mut master_muted = false;
        if let Ok(ep_vol) = device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None) {
            if let Ok(scalar) = ep_vol.GetMasterVolumeLevelScalar() {
                master_volume = (scalar * 100.0).round() as i32;
            }
            if let Ok(m) = ep_vol.GetMute() {
                master_muted = m.as_bool();
            }
        }

        let manager: IAudioSessionManager2 = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("IAudioSessionManager2 failed: {e}"))?;
        let session_enum: IAudioSessionEnumerator = manager
            .GetSessionEnumerator()
            .map_err(|e| format!("GetSessionEnumerator failed: {e}"))?;
        let count = session_enum.GetCount().unwrap_or(0);

        struct Agg {
            pid: u32,
            is_system: bool,
            exe_path: String,
            process_name: String,
            display_name: String,
            volume: f32,
            muted: bool,
            peak: f32,
            active: bool,
        }

        let mut grouped: HashMap<String, Agg> = HashMap::new();

        for i in 0..count {
            let Ok(ctrl) = session_enum.GetSession(i) else {
                continue;
            };
            let state_val = ctrl.GetState().unwrap_or(AudioSessionStateExpired);
            if state_val == AudioSessionStateExpired {
                continue;
            }

            let Ok(ctrl2) = ctrl.cast::<IAudioSessionControl2>() else {
                continue;
            };

            let is_system = ctrl2.IsSystemSoundsSession() == S_OK;
            let pid = ctrl2.GetProcessId().unwrap_or(0);
            let session_key = if is_system || pid == 0 {
                "system_sounds".to_string()
            } else {
                format!("pid_{pid}")
            };

            let vol_iface = ctrl.cast::<ISimpleAudioVolume>().ok();
            let vol = vol_iface
                .as_ref()
                .and_then(|v| v.GetMasterVolume().ok())
                .unwrap_or(1.0);
            let muted = vol_iface
                .as_ref()
                .and_then(|v| v.GetMute().ok())
                .map(|b| b.as_bool())
                .unwrap_or(false);

            let peak = ctrl
                .cast::<IAudioMeterInformation>()
                .ok()
                .and_then(|m| m.GetPeakValue().ok())
                .unwrap_or(0.0);

            let active = state_val == AudioSessionStateActive || peak > 0.001;

            if let Some(existing) = grouped.get_mut(&session_key) {
                existing.peak = existing.peak.max(peak);
                existing.active = existing.active || active;
                existing.muted = existing.muted && muted;
                continue;
            }

            let (exe_path, process_name, display_name) = if is_system || pid == 0 {
                (
                    String::new(),
                    "System Sounds".to_string(),
                    "System Sounds".to_string(),
                )
            } else {
                let exe = get_process_exe_path(pid).unwrap_or_default();
                let proc_name = std::path::Path::new(&exe)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("App")
                    .to_string();
                let desc = if !exe.is_empty() {
                    read_file_description(&exe)
                } else {
                    None
                };
                let disp = desc
                    .filter(|d| !d.trim().is_empty() && !d.eq_ignore_ascii_case("chrome_exe"))
                    .unwrap_or_else(|| nicify_process_name(&proc_name));
                (exe, proc_name, disp)
            };

            grouped.insert(
                session_key,
                Agg {
                    pid,
                    is_system,
                    exe_path,
                    process_name,
                    display_name,
                    volume: vol,
                    muted,
                    peak,
                    active,
                },
            );
        }

        let mut sessions: Vec<AudioSessionInfo> = grouped
            .into_iter()
            .map(|(id, agg)| {
                let icon_data_url = if agg.is_system {
                    None
                } else if !agg.exe_path.is_empty() {
                    let cached = state
                        .icon_cache
                        .lock()
                        .ok()
                        .and_then(|c| c.get(&agg.exe_path).cloned());
                    if cached.is_some() {
                        cached
                    } else {
                        let extracted = extract_file_icon_data_url(&agg.exe_path, 32, false);
                        if let Some(ref url) = extracted {
                            if let Ok(mut c) = state.icon_cache.lock() {
                                c.insert(agg.exe_path.clone(), url.clone());
                            }
                        }
                        extracted
                    }
                } else {
                    None
                };

                AudioSessionInfo {
                    id,
                    pid: agg.pid,
                    is_system_sounds: agg.is_system,
                    process_name: agg.process_name,
                    display_name: agg.display_name,
                    exe_path: agg.exe_path,
                    icon_data_url,
                    volume: (agg.volume * 100.0).round().clamp(0.0, 100.0) as i32,
                    muted: agg.muted,
                    peak: agg.peak.clamp(0.0, 1.0),
                    state: if agg.active { "active" } else { "inactive" }.to_string(),
                }
            })
            .collect();

        sessions.sort_by(|a, b| {
            b.is_system_sounds
                .cmp(&a.is_system_sounds)
                .then_with(|| (b.state == "active").cmp(&(a.state == "active")))
                .then_with(|| a.display_name.to_lowercase().cmp(&b.display_name.to_lowercase()))
        });

        Ok(AudioSessionsResponse {
            device_id: resolved_id,
            device_name,
            master_volume: master_volume.clamp(0, 100),
            master_muted,
            sessions,
        })
    }
}

fn match_session(payload: &Value, ctrl2: &IAudioSessionControl2) -> bool {
    let target_id = payload.get("sessionId").and_then(|v| v.as_str());
    let target_pid = payload.get("pid").and_then(|v| v.as_u64()).map(|v| v as u32);

    unsafe {
        let is_system = ctrl2.IsSystemSoundsSession() == S_OK;
        let pid = ctrl2.GetProcessId().unwrap_or(0);
        let key = if is_system || pid == 0 {
            "system_sounds".to_string()
        } else {
            format!("pid_{pid}")
        };

        if let Some(id) = target_id {
            return id == key;
        }
        if let Some(tp) = target_pid {
            return (tp == 0 && is_system) || (tp > 0 && tp == pid);
        }
        false
    }
}

fn parse_bool(payload: &Value, key: &str) -> Result<bool, String> {
    payload
        .get(key)
        .and_then(|v| v.as_bool())
        .ok_or_else(|| format!("Missing {key}"))
}

fn parse_scalar_volume(payload: &Value) -> Result<f32, String> {
    let pct = payload
        .get("volume")
        .and_then(|v| v.as_f64())
        .ok_or_else(|| "Missing volume".to_string())?;
    Ok((pct.clamp(0.0, 100.0) / 100.0) as f32)
}

unsafe fn with_matching_sessions<F>(payload: &Value, mut op: F) -> Result<bool, String>
where
    F: FnMut(&ISimpleAudioVolume),
{
    let device_id = payload.get("deviceId").and_then(|v| v.as_str());
    let enumerator = create_enumerator()?;
    let device = resolve_device(&enumerator, device_id)?;
    let manager: IAudioSessionManager2 = device
        .Activate(CLSCTX_ALL, None)
        .map_err(|e| format!("{e}"))?;
    let session_enum = manager.GetSessionEnumerator().map_err(|e| format!("{e}"))?;
    let count = session_enum.GetCount().unwrap_or(0);
    for i in 0..count {
        let Ok(ctrl) = session_enum.GetSession(i) else {
            continue;
        };
        let Ok(ctrl2) = ctrl.cast::<IAudioSessionControl2>() else {
            continue;
        };
        if match_session(payload, &ctrl2) {
            if let Ok(sv) = ctrl.cast::<ISimpleAudioVolume>() {
                op(&sv);
            }
        }
    }
    Ok(true)
}

unsafe fn with_endpoint_volume<F>(device_id: Option<&str>, mut op: F) -> Result<bool, String>
where
    F: FnMut(&IAudioEndpointVolume) -> windows::core::Result<()>,
{
    let enumerator = create_enumerator()?;
    let device = resolve_device(&enumerator, device_id)?;
    let ep_vol: IAudioEndpointVolume = device
        .Activate(CLSCTX_ALL, None)
        .map_err(|e| format!("{e}"))?;
    op(&ep_vol).map_err(|e| format!("{e}"))?;
    Ok(true)
}

#[tauri::command]
pub fn audio_mixer_set_volume(payload: Value) -> Result<bool, String> {
    let scalar = parse_scalar_volume(&payload)?;
    unsafe { with_matching_sessions(&payload, |sv| { let _ = sv.SetMasterVolume(scalar, &GUID::zeroed()); }) }
}

#[tauri::command]
pub fn audio_mixer_set_mute(payload: Value) -> Result<bool, String> {
    let muted = parse_bool(&payload, "muted")?;
    unsafe { with_matching_sessions(&payload, |sv| { let _ = sv.SetMute(muted, &GUID::zeroed()); }) }
}

#[tauri::command]
pub fn audio_mixer_set_master_volume(payload: Value) -> Result<bool, String> {
    let device_id = payload.get("deviceId").and_then(|v| v.as_str());
    let scalar = parse_scalar_volume(&payload)?;
    unsafe {
        with_endpoint_volume(device_id, |ep| ep.SetMasterVolumeLevelScalar(scalar, &GUID::zeroed()))
    }
}

#[tauri::command]
pub fn audio_mixer_set_master_mute(payload: Value) -> Result<bool, String> {
    let device_id = payload.get("deviceId").and_then(|v| v.as_str());
    let muted = parse_bool(&payload, "muted")?;
    unsafe { with_endpoint_volume(device_id, |ep| ep.SetMute(muted, &GUID::zeroed())) }
}
