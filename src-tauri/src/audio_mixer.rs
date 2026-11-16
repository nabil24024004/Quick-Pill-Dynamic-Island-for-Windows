use crate::state::SharedState;
#[cfg(windows)]
use crate::state::{extract_file_icon_data_url, from_wide_slice, read_file_description, to_wide};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
#[cfg(windows)]
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

#[cfg(windows)]
unsafe fn ensure_com() {
    let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
}

#[cfg(windows)]
unsafe fn create_enumerator() -> Result<IMMDeviceEnumerator, String> {
    ensure_com();
    CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
        .map_err(|e| format!("MMDeviceEnumerator failed: {e}"))
}

#[cfg(windows)]
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

#[cfg(windows)]
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

#[cfg(windows)]
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

#[cfg(windows)]
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

#[cfg(windows)]
#[tauri::command]
pub async fn audio_mixer_get_devices() -> Result<Vec<AudioDeviceInfo>, String> {
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

#[cfg(windows)]
#[tauri::command]
pub async fn audio_mixer_get_sessions(
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

#[cfg(windows)]
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

#[cfg(windows)]
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

#[cfg(windows)]
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

#[cfg(windows)]
#[tauri::command]
pub async fn audio_mixer_set_volume(payload: Value) -> Result<bool, String> {
    let scalar = parse_scalar_volume(&payload)?;
    unsafe { with_matching_sessions(&payload, |sv| { let _ = sv.SetMasterVolume(scalar, &GUID::zeroed()); }) }
}

#[cfg(windows)]
#[tauri::command]
pub async fn audio_mixer_set_mute(payload: Value) -> Result<bool, String> {
    let muted = parse_bool(&payload, "muted")?;
    unsafe { with_matching_sessions(&payload, |sv| { let _ = sv.SetMute(muted, &GUID::zeroed()); }) }
}

#[cfg(windows)]
#[tauri::command]
pub async fn audio_mixer_set_master_volume(payload: Value) -> Result<bool, String> {
    let device_id = payload.get("deviceId").and_then(|v| v.as_str());
    let scalar = parse_scalar_volume(&payload)?;
    unsafe {
        with_endpoint_volume(device_id, |ep| ep.SetMasterVolumeLevelScalar(scalar, &GUID::zeroed()))
    }
}

#[cfg(windows)]
#[tauri::command]
pub async fn audio_mixer_set_master_mute(payload: Value) -> Result<bool, String> {
    let device_id = payload.get("deviceId").and_then(|v| v.as_str());
    let muted = parse_bool(&payload, "muted")?;
    unsafe { with_endpoint_volume(device_id, |ep| ep.SetMute(muted, &GUID::zeroed())) }
}

// =============================================================================
// Linux PipeWire / PulseAudio Mixer (pactl + wpctl/amixer fallback)
// =============================================================================

#[cfg(target_os = "linux")]
#[derive(Debug, Clone)]
struct LinuxSink {
    index: u32,
    name: String,
    description: String,
    volume: i32,
    muted: bool,
}

#[cfg(target_os = "linux")]
#[derive(Debug, Clone)]
struct LinuxSinkInput {
    index: u32,
    sink: Option<u32>,
    pid: u32,
    app_name: String,
    binary: String,
    icon_name: String,
    volume: i32,
    muted: bool,
    active: bool,
}

#[cfg(target_os = "linux")]
fn run_audio_cmd(bin: &str, args: &[&str]) -> Option<String> {
    let out = std::process::Command::new(bin)
        .env("LC_ALL", "C")
        .args(args)
        .output()
        .ok()?;
    if out.status.success() {
        Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        None
    }
}

#[cfg(target_os = "linux")]
fn parse_pactl_json_volume(vol_obj: Option<&Value>) -> i32 {
    let Some(map) = vol_obj.and_then(|v| v.as_object()) else {
        return 100;
    };
    let mut sum = 0.0f64;
    let mut count = 0usize;
    for ch in map.values() {
        if let Some(pct_str) = ch.get("value_percent").and_then(|v| v.as_str()) {
            if let Ok(pct) = pct_str.trim().trim_end_matches('%').trim().parse::<f64>() {
                sum += pct;
                count += 1;
                continue;
            }
        }
        if let Some(raw) = ch.get("value").and_then(|v| v.as_f64()) {
            sum += (raw / 65536.0) * 100.0;
            count += 1;
        }
    }
    if count == 0 {
        100
    } else {
        (sum / count as f64).round().clamp(0.0, 100.0) as i32
    }
}

#[cfg(target_os = "linux")]
fn parse_pactl_text_percent(line: &str) -> Option<i32> {
    let mut sum = 0i32;
    let mut count = 0i32;
    for token in line.split_whitespace() {
        if let Some(num) = token.strip_suffix('%') {
            let clean = num.trim_matches(|c: char| !c.is_ascii_digit());
            if let Ok(v) = clean.parse::<i32>() {
                sum += v;
                count += 1;
            }
        }
    }
    if count > 0 {
        Some((sum / count).clamp(0, 100))
    } else {
        None
    }
}

#[cfg(target_os = "linux")]
fn wpctl_default_volume() -> Option<(i32, bool)> {
    let text = run_audio_cmd("wpctl", &["get-volume", "@DEFAULT_AUDIO_SINK@"])?;
    let muted = text.contains("[MUTED]");
    let val = text
        .split_whitespace()
        .find_map(|tok| tok.parse::<f64>().ok())?;
    Some(((val * 100.0).round().clamp(0.0, 100.0) as i32, muted))
}

#[cfg(target_os = "linux")]
fn amixer_default_volume() -> Option<(i32, bool)> {
    let text = run_audio_cmd("amixer", &["sget", "Master"])
        .or_else(|| run_audio_cmd("amixer", &["get", "Master"]))?;
    let mut vol = None;
    let mut muted = false;
    for line in text.lines() {
        if line.contains('[') && line.contains('%') {
            if let (Some(s), Some(e)) = (line.find('['), line.find("%]")) {
                if s < e {
                    if let Ok(v) = line[s + 1..e].parse::<i32>() {
                        vol = Some(v.clamp(0, 100));
                    }
                }
            }
            if line.contains("[off]") {
                muted = true;
            }
        }
    }
    vol.map(|v| (v, muted))
}

#[cfg(target_os = "linux")]
fn list_linux_sinks() -> Vec<LinuxSink> {
    if let Some(json_str) = run_audio_cmd("pactl", &["-f", "json", "list", "sinks"]) {
        if let Ok(arr) = serde_json::from_str::<Vec<Value>>(&json_str) {
            let mut sinks = Vec::with_capacity(arr.len());
            for s in arr {
                let index = s.get("index").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                let name = s
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if name.is_empty() {
                    continue;
                }
                let props = s.get("properties");
                let description = s
                    .get("description")
                    .and_then(|v| v.as_str())
                    .filter(|d| !d.is_empty())
                    .or_else(|| {
                        props
                            .and_then(|p| p.get("device.description").or_else(|| p.get("node.description")))
                            .and_then(|v| v.as_str())
                    })
                    .unwrap_or(&name)
                    .to_string();
                let muted = s.get("mute").and_then(|v| v.as_bool()).unwrap_or(false);
                let volume = parse_pactl_json_volume(s.get("volume"));
                sinks.push(LinuxSink {
                    index,
                    name,
                    description,
                    volume,
                    muted,
                });
            }
            if !sinks.is_empty() {
                return sinks;
            }
        }
    }

    if let Some(text) = run_audio_cmd("pactl", &["list", "sinks"]) {
        let mut sinks = Vec::new();
        let mut cur: Option<LinuxSink> = None;
        for line in text.lines() {
            let trimmed = line.trim();
            if let Some(rest) = trimmed.strip_prefix("Sink #") {
                if let Some(s) = cur.take() {
                    if !s.name.is_empty() {
                        sinks.push(s);
                    }
                }
                cur = Some(LinuxSink {
                    index: rest.trim().parse::<u32>().unwrap_or(0),
                    name: String::new(),
                    description: String::new(),
                    volume: 100,
                    muted: false,
                });
            } else if let Some(ref mut s) = cur {
                if let Some(v) = trimmed.strip_prefix("Name:") {
                    s.name = v.trim().to_string();
                } else if let Some(v) = trimmed.strip_prefix("Description:") {
                    s.description = v.trim().to_string();
                } else if let Some(v) = trimmed.strip_prefix("Mute:") {
                    s.muted = v.trim().eq_ignore_ascii_case("yes");
                } else if trimmed.starts_with("Volume:") {
                    if let Some(v) = parse_pactl_text_percent(trimmed) {
                        s.volume = v;
                    }
                }
            }
        }
        if let Some(mut s) = cur.take() {
            if !s.name.is_empty() {
                if s.description.is_empty() {
                    s.description = s.name.clone();
                }
                sinks.push(s);
            }
        }
        for s in &mut sinks {
            if s.description.is_empty() {
                s.description = s.name.clone();
            }
        }
        if !sinks.is_empty() {
            return sinks;
        }
    }

    if let Some((volume, muted)) = wpctl_default_volume().or_else(amixer_default_volume) {
        return vec![LinuxSink {
            index: 0,
            name: "@DEFAULT_AUDIO_SINK@".to_string(),
            description: "Default Output".to_string(),
            volume,
            muted,
        }];
    }

    Vec::new()
}

#[cfg(target_os = "linux")]
fn list_linux_sink_inputs() -> Vec<LinuxSinkInput> {
    if let Some(json_str) = run_audio_cmd("pactl", &["-f", "json", "list", "sink-inputs"]) {
        if let Ok(arr) = serde_json::from_str::<Vec<Value>>(&json_str) {
            let mut list = Vec::with_capacity(arr.len());
            for item in arr {
                let index = item.get("index").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                let sink = item.get("sink").and_then(|v| v.as_u64()).map(|v| v as u32);
                let muted = item.get("mute").and_then(|v| v.as_bool()).unwrap_or(false);
                let corked = item.get("corked").and_then(|v| v.as_bool()).unwrap_or(false);
                let volume = parse_pactl_json_volume(item.get("volume"));
                let props = item.get("properties");
                let prop_str = |k: &str| -> String {
                    props
                        .and_then(|p| p.get(k))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim()
                        .to_string()
                };
                let pid = prop_str("application.process.id").parse::<u32>().unwrap_or(0);
                let app_name = prop_str("application.name");
                let binary = prop_str("application.process.binary");
                let icon_name = prop_str("application.icon_name");
                let node_name = prop_str("node.name");
                let final_app = if !app_name.is_empty() {
                    app_name
                } else if !binary.is_empty() {
                    binary.clone()
                } else if !node_name.is_empty() {
                    node_name
                } else {
                    "Audio Stream".to_string()
                };
                list.push(LinuxSinkInput {
                    index,
                    sink,
                    pid,
                    app_name: final_app,
                    binary,
                    icon_name,
                    volume,
                    muted,
                    active: !corked,
                });
            }
            return list;
        }
    }

    if let Some(text) = run_audio_cmd("pactl", &["list", "sink-inputs"]) {
        let mut list = Vec::new();
        let mut cur: Option<LinuxSinkInput> = None;
        for line in text.lines() {
            let trimmed = line.trim();
            if let Some(rest) = trimmed.strip_prefix("Sink Input #") {
                if let Some(si) = cur.take() {
                    list.push(si);
                }
                cur = Some(LinuxSinkInput {
                    index: rest.trim().parse::<u32>().unwrap_or(0),
                    sink: None,
                    pid: 0,
                    app_name: String::new(),
                    binary: String::new(),
                    icon_name: String::new(),
                    volume: 100,
                    muted: false,
                    active: true,
                });
            } else if let Some(ref mut si) = cur {
                if let Some(v) = trimmed.strip_prefix("Sink:") {
                    si.sink = v.trim().parse::<u32>().ok();
                } else if let Some(v) = trimmed.strip_prefix("Mute:") {
                    si.muted = v.trim().eq_ignore_ascii_case("yes");
                } else if let Some(v) = trimmed.strip_prefix("Corked:") {
                    si.active = !v.trim().eq_ignore_ascii_case("yes");
                } else if trimmed.starts_with("Volume:") {
                    if let Some(v) = parse_pactl_text_percent(trimmed) {
                        si.volume = v;
                    }
                } else if let Some((k, raw_v)) = trimmed.split_once('=') {
                    let key = k.trim();
                    let val = raw_v.trim().trim_matches('"').to_string();
                    match key {
                        "application.name" => si.app_name = val,
                        "application.process.id" => si.pid = val.parse::<u32>().unwrap_or(0),
                        "application.process.binary" => si.binary = val,
                        "application.icon_name" => si.icon_name = val,
                        _ => {}
                    }
                }
            }
        }
        if let Some(mut si) = cur.take() {
            if si.app_name.is_empty() {
                si.app_name = if !si.binary.is_empty() {
                    si.binary.clone()
                } else {
                    "Audio Stream".to_string()
                };
            }
            list.push(si);
        }
        return list;
    }

    Vec::new()
}

#[cfg(target_os = "linux")]
fn sink_input_session_key(si: &LinuxSinkInput) -> (String, bool) {
    let lower = si.app_name.to_lowercase();
    let is_system = lower.contains("system sounds")
        || lower.contains("speech-dispatcher")
        || (si.pid == 0 && lower.is_empty());
    let key = if is_system {
        "system_sounds".to_string()
    } else if si.pid > 0 {
        format!("pid_{}", si.pid)
    } else {
        format!("si_{}", si.index)
    };
    (key, is_system)
}

#[cfg(target_os = "linux")]
#[tauri::command]
pub async fn audio_mixer_get_devices() -> Result<Vec<AudioDeviceInfo>, String> {
    let sinks = list_linux_sinks();
    let default_sink = run_audio_cmd("pactl", &["get-default-sink"]).unwrap_or_default();
    let mut devices = Vec::with_capacity(sinks.len());
    for (idx, s) in sinks.into_iter().enumerate() {
        let is_default = if default_sink.is_empty() {
            idx == 0
        } else {
            s.name == default_sink
        };
        let hint = format!("{} {}", s.description, s.name);
        devices.push(AudioDeviceInfo {
            id: s.name,
            name: s.description.clone(),
            volume: s.volume,
            muted: s.muted,
            is_default,
            icon_type: infer_icon_type(&hint),
        });
    }
    Ok(devices)
}

#[cfg(target_os = "linux")]
#[tauri::command]
pub async fn audio_mixer_get_sessions(
    state: tauri::State<'_, SharedState>,
    device_id: Option<String>,
) -> Result<AudioSessionsResponse, String> {
    let sinks = list_linux_sinks();
    let default_sink = run_audio_cmd("pactl", &["get-default-sink"]).unwrap_or_default();
    let requested = device_id
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    let target_sink = requested
        .and_then(|id| sinks.iter().find(|s| s.name == id))
        .or_else(|| {
            if !default_sink.is_empty() {
                sinks.iter().find(|s| s.name == default_sink)
            } else {
                None
            }
        })
        .or_else(|| sinks.first())
        .cloned();

    let (resolved_id, device_name, master_volume, master_muted, target_sink_index) =
        match target_sink {
            Some(s) => (s.name, s.description, s.volume, s.muted, Some(s.index)),
            None => (String::new(), "Default Output".to_string(), 100, false, None),
        };

    struct Agg {
        pid: u32,
        is_system: bool,
        exe_path: String,
        process_name: String,
        display_name: String,
        icon_hint: String,
        volume: i32,
        muted: bool,
        active: bool,
    }

    let mut grouped: HashMap<String, Agg> = HashMap::new();
    for si in list_linux_sink_inputs() {
        if let (Some(target_idx), Some(si_sink)) = (target_sink_index, si.sink) {
            if si_sink != target_idx {
                continue;
            }
        }
        let (session_key, is_system) = sink_input_session_key(&si);
        if let Some(existing) = grouped.get_mut(&session_key) {
            existing.active = existing.active || si.active;
            existing.muted = existing.muted && si.muted;
            continue;
        }

        let (exe_path, process_name, display_name) = if is_system {
            (
                String::new(),
                "System Sounds".to_string(),
                "System Sounds".to_string(),
            )
        } else {
            let exe = if si.pid > 0 {
                std::fs::read_link(format!("/proc/{}/exe", si.pid))
                    .ok()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default()
            } else {
                String::new()
            };
            let proc_name = if !si.binary.is_empty() {
                si.binary.clone()
            } else if !exe.is_empty() {
                std::path::Path::new(&exe)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("App")
                    .to_string()
            } else {
                si.app_name.clone()
            };
            let disp = if !si.app_name.is_empty() {
                si.app_name.clone()
            } else {
                nicify_process_name(&proc_name)
            };
            (exe, proc_name, disp)
        };

        let icon_hint = if !si.icon_name.is_empty() {
            si.icon_name.clone()
        } else {
            process_name.clone()
        };

        grouped.insert(
            session_key,
            Agg {
                pid: si.pid,
                is_system,
                exe_path,
                process_name,
                display_name,
                icon_hint,
                volume: si.volume,
                muted: si.muted,
                active: si.active,
            },
        );
    }

    let mut sessions: Vec<AudioSessionInfo> = grouped
        .into_iter()
        .map(|(id, agg)| {
            let icon_data_url = if agg.is_system {
                None
            } else {
                let cache_key = format!("linux_mixer:{}", agg.icon_hint.to_lowercase());
                let cached = state
                    .icon_cache
                    .lock()
                    .ok()
                    .and_then(|c| c.get(&cache_key).cloned());
                if cached.is_some() {
                    cached
                } else {
                    let resolved = crate::launcher::resolve_linux_app_icon(
                        &agg.icon_hint,
                        &agg.display_name,
                    );
                    if let Some(ref url) = resolved {
                        if let Ok(mut c) = state.icon_cache.lock() {
                            c.insert(cache_key, url.clone());
                        }
                    }
                    resolved
                }
            };

            AudioSessionInfo {
                id,
                pid: agg.pid,
                is_system_sounds: agg.is_system,
                process_name: agg.process_name,
                display_name: agg.display_name,
                exe_path: agg.exe_path,
                icon_data_url,
                volume: agg.volume.clamp(0, 100),
                muted: agg.muted,
                peak: if agg.active && !agg.muted { 0.35 } else { 0.0 },
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

#[cfg(target_os = "linux")]
fn find_matching_sink_inputs(payload: &Value) -> Vec<u32> {
    let target_id = payload.get("sessionId").and_then(|v| v.as_str());
    let target_pid = payload.get("pid").and_then(|v| v.as_u64()).map(|v| v as u32);
    list_linux_sink_inputs()
        .into_iter()
        .filter(|si| {
            let (key, is_system) = sink_input_session_key(si);
            let si_key = format!("si_{}", si.index);
            if let Some(id) = target_id {
                return id == key || id == si_key;
            }
            if let Some(tp) = target_pid {
                return (tp == 0 && is_system) || (tp > 0 && tp == si.pid);
            }
            false
        })
        .map(|si| si.index)
        .collect()
}

#[cfg(target_os = "linux")]
#[tauri::command]
pub async fn audio_mixer_set_volume(payload: Value) -> Result<bool, String> {
    let pct = (parse_scalar_volume(&payload)? * 100.0).round().clamp(0.0, 100.0) as i32;
    let pct_arg = format!("{pct}%");
    for idx in find_matching_sink_inputs(&payload) {
        let idx_str = idx.to_string();
        let _ = run_audio_cmd("pactl", &["set-sink-input-volume", &idx_str, &pct_arg]);
    }
    Ok(true)
}

#[cfg(target_os = "linux")]
#[tauri::command]
pub async fn audio_mixer_set_mute(payload: Value) -> Result<bool, String> {
    let muted = parse_bool(&payload, "muted")?;
    let mute_arg = if muted { "1" } else { "0" };
    for idx in find_matching_sink_inputs(&payload) {
        let idx_str = idx.to_string();
        let _ = run_audio_cmd("pactl", &["set-sink-input-mute", &idx_str, mute_arg]);
    }
    Ok(true)
}

#[cfg(target_os = "linux")]
#[tauri::command]
pub async fn audio_mixer_set_master_volume(payload: Value) -> Result<bool, String> {
    let device_id = payload
        .get("deviceId")
        .and_then(|v| v.as_str())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());
    let scalar = parse_scalar_volume(&payload)?;
    let pct = (scalar * 100.0).round().clamp(0.0, 100.0) as i32;
    let pct_arg = format!("{pct}%");

    if let Some(id) = device_id.filter(|id| *id != "@DEFAULT_AUDIO_SINK@") {
        if run_audio_cmd("pactl", &["set-sink-volume", id, &pct_arg]).is_some() {
            return Ok(true);
        }
    }
    if run_audio_cmd("pactl", &["set-sink-volume", "@DEFAULT_SINK@", &pct_arg]).is_some() {
        return Ok(true);
    }
    let scalar_arg = format!("{scalar:.2}");
    if run_audio_cmd("wpctl", &["set-volume", "@DEFAULT_AUDIO_SINK@", &scalar_arg]).is_some() {
        return Ok(true);
    }
    if run_audio_cmd("amixer", &["set", "Master", &pct_arg]).is_some() {
        return Ok(true);
    }
    Err("Failed to set master volume (install pipewire-pulse/pulseaudio-utils)".to_string())
}

#[cfg(target_os = "linux")]
#[tauri::command]
pub async fn audio_mixer_set_master_mute(payload: Value) -> Result<bool, String> {
    let device_id = payload
        .get("deviceId")
        .and_then(|v| v.as_str())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());
    let muted = parse_bool(&payload, "muted")?;
    let mute_num = if muted { "1" } else { "0" };

    if let Some(id) = device_id.filter(|id| *id != "@DEFAULT_AUDIO_SINK@") {
        if run_audio_cmd("pactl", &["set-sink-mute", id, mute_num]).is_some() {
            return Ok(true);
        }
    }
    if run_audio_cmd("pactl", &["set-sink-mute", "@DEFAULT_SINK@", mute_num]).is_some() {
        return Ok(true);
    }
    if run_audio_cmd("wpctl", &["set-mute", "@DEFAULT_AUDIO_SINK@", mute_num]).is_some() {
        return Ok(true);
    }
    let amixer_arg = if muted { "mute" } else { "unmute" };
    if run_audio_cmd("amixer", &["set", "Master", amixer_arg]).is_some() {
        return Ok(true);
    }
    Err("Failed to set master mute (install pipewire-pulse/pulseaudio-utils)".to_string())
}
