#[cfg(windows)]
use crate::state::from_wide_slice;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use once_cell::sync::Lazy;
use serde::Serialize;
use std::sync::Mutex;
#[cfg(any(windows, test))]
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(windows)]
use windows::{
    Media::Control::{
        GlobalSystemMediaTransportControlsSession,
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    },
    Storage::Streams::{DataReader, InputStreamOptions},
    Win32::{
        Foundation::{BOOL, CloseHandle, HWND, LPARAM, MAX_PATH},
        System::{
            Com::{CoInitializeEx, COINIT_MULTITHREADED},
            Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT, PROCESS_QUERY_LIMITED_INFORMATION},
        },
        UI::{
            Input::KeyboardAndMouse::{
                MapVirtualKeyW, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT,
                KEYEVENTF_EXTENDEDKEY, KEYEVENTF_KEYUP, MAPVK_VK_TO_VSC, VIRTUAL_KEY,
                VK_MEDIA_NEXT_TRACK, VK_MEDIA_PLAY_PAUSE, VK_MEDIA_PREV_TRACK, VK_MEDIA_STOP,
            },
            WindowsAndMessaging::{EnumWindows, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible},
        },
    },
};

#[derive(Debug, Clone, Serialize)]
pub struct SystemMediaInfo {
    pub name: String,
    pub artist: String,
    pub album: String,
    pub artwork_url: Option<String>,
    pub state: String,
    pub duration: f64,
    pub position: f64,
    pub source: String,
}

static ARTWORK_CACHE: Lazy<Mutex<(String, Option<String>)>> =
    Lazy::new(|| Mutex::new((String::new(), None)));

#[cfg(windows)]
static LAST_ACTIVE_AUMID: Lazy<Mutex<String>> = Lazy::new(|| Mutex::new(String::new()));

#[cfg(windows)]
const EPOCH_DIFF_100NS: i64 = 116_444_736_000_000_000;

#[cfg(any(windows, test))]
fn score_smtc_session(
    is_playing: bool,
    is_paused: bool,
    has_metadata: bool,
    is_last_active: bool,
    is_current: bool,
) -> i32 {
    let mut score = 0;
    if is_playing && has_metadata {
        score += 1000;
    } else if is_paused && has_metadata {
        score += 500;
    } else if has_metadata {
        score += 250;
    } else if is_playing {
        score += 150;
    }
    if is_last_active {
        score += 80;
    }
    if is_current {
        score += 40;
    }
    score
}

#[cfg(any(windows, test))]
fn compute_seek_target_100ns(
    start_100ns: i64,
    end_100ns: i64,
    min_seek_100ns: Option<i64>,
    max_seek_100ns: Option<i64>,
    seek_seconds: f64,
) -> i64 {
    let safe_sec = if seek_seconds.is_finite() {
        seek_seconds.max(0.0)
    } else {
        0.0
    };
    let offset_100ns = (safe_sec * 10_000_000.0).round() as i64;
    let raw = start_100ns.saturating_add(offset_100ns);

    let bounds = match (min_seek_100ns, max_seek_100ns) {
        (Some(lo), Some(hi)) if hi > lo => Some((lo, hi)),
        _ if end_100ns > start_100ns => Some((start_100ns, end_100ns)),
        _ => None,
    };

    match bounds {
        Some((lo, hi)) => raw.clamp(lo, hi),
        None => raw.max(0),
    }
}

#[cfg(windows)]
fn now_filetime_100ns() -> i64 {
    let unix_ns = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as i64)
        .unwrap_or(0);
    (unix_ns / 100) + EPOCH_DIFF_100NS
}

#[cfg(windows)]
fn collect_scored_sessions() -> Vec<GlobalSystemMediaTransportControlsSession> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
    let Ok(mgr) = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .and_then(|op| op.get())
    else {
        return Vec::new();
    };

    let curr_session = mgr.GetCurrentSession().ok();
    let curr_aumid = curr_session
        .as_ref()
        .and_then(|s| s.SourceAppUserModelId().ok())
        .map(|s| s.to_string())
        .unwrap_or_default();

    let last_aumid = LAST_ACTIVE_AUMID
        .lock()
        .map(|g| g.clone())
        .unwrap_or_default();

    let mut scored: Vec<(i32, GlobalSystemMediaTransportControlsSession)> = Vec::new();
    if let Ok(sessions) = mgr.GetSessions() {
        for s in sessions {
            let aumid = s
                .SourceAppUserModelId()
                .ok()
                .map(|id| id.to_string())
                .unwrap_or_default();
            let pb_status = s.GetPlaybackInfo().ok().and_then(|pb| pb.PlaybackStatus().ok());
            let is_playing = pb_status == Some(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing);
            let is_paused = pb_status == Some(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused);

            let has_meta = s
                .TryGetMediaPropertiesAsync()
                .ok()
                .and_then(|op| op.get().ok())
                .map(|p| {
                    let t = p.Title().ok().map(|x| !x.is_empty()).unwrap_or(false);
                    let a = p.Artist().ok().map(|x| !x.is_empty()).unwrap_or(false);
                    t || a
                })
                .unwrap_or(false);

            let is_last = !last_aumid.is_empty() && aumid == last_aumid;
            let is_curr = !curr_aumid.is_empty() && aumid == curr_aumid;
            let score = score_smtc_session(is_playing, is_paused, has_meta, is_last, is_curr);
            scored.push((score, s));
        }
    }

    if scored.is_empty() {
        if let Some(curr) = curr_session {
            return vec![curr];
        }
    }

    scored.sort_by(|a, b| b.0.cmp(&a.0));
    scored.into_iter().map(|(_, s)| s).collect()
}

#[cfg(windows)]
fn read_thumbnail_data_url(
    session: &GlobalSystemMediaTransportControlsSession,
    cache_key: &str,
) -> Option<String> {
    if let Ok(guard) = ARTWORK_CACHE.lock() {
        if guard.0 == cache_key {
            if let Some(ref cached) = guard.1 {
                return Some(cached.clone());
            }
        }
    }

    let result = (|| {
        let props = session.TryGetMediaPropertiesAsync().ok()?.get().ok()?;
        let thumb_ref = props.Thumbnail().ok()?;
        let stream = thumb_ref.OpenReadAsync().ok()?.get().ok()?;
        let size = stream.Size().ok()? as u32;
        if size == 0 || size > 4 * 1024 * 1024 {
            return None;
        }
        let input = stream.GetInputStreamAt(0).ok()?;
        let reader = DataReader::CreateDataReader(&input).ok()?;
        let _ = reader.SetInputStreamOptions(InputStreamOptions::Partial);
        let loaded = reader.LoadAsync(size).ok()?.get().ok()?;
        if loaded == 0 {
            return None;
        }
        let mut bytes = vec![0u8; loaded as usize];
        reader.ReadBytes(&mut bytes).ok()?;

        let mime = if bytes.starts_with(&[0xFF, 0xD8]) {
            "image/jpeg".to_string()
        } else if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
            "image/png".to_string()
        } else {
            stream
                .ContentType()
                .ok()
                .map(|s| s.to_string())
                .filter(|s| s.starts_with("image/"))
                .unwrap_or_else(|| "image/png".to_string())
        };

        Some(format!("data:{mime};base64,{}", BASE64.encode(&bytes)))
    })();

    // Cache only successful thumbnails so transient startup misses recover on the next poll.
    if let Some(ref url) = result {
        if let Ok(mut guard) = ARTWORK_CACHE.lock() {
            *guard = (cache_key.to_string(), Some(url.clone()));
        }
    }
    result
}

#[cfg(windows)]
fn find_spotify_window_fallback() -> Option<SystemMediaInfo> {
    unsafe extern "system" fn enum_cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let out = &mut *(lparam.0 as *mut Option<(String, String)>);
        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }
        let mut title_buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut title_buf);
        if len <= 0 {
            return BOOL(1);
        }
        let title = from_wide_slice(&title_buf[..len as usize]);
        if !title.contains(" - ")
            || title.eq_ignore_ascii_case("Spotify Free")
            || title.eq_ignore_ascii_case("Spotify Premium")
        {
            return BOOL(1);
        }

        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return BOOL(1);
        }
        if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            let mut path_buf = vec![0u16; MAX_PATH as usize * 2];
            let mut path_len = path_buf.len() as u32;
            let ok = QueryFullProcessImageNameW(
                handle,
                PROCESS_NAME_FORMAT(0),
                windows::core::PWSTR(path_buf.as_mut_ptr()),
                &mut path_len,
            )
            .is_ok();
            let _ = CloseHandle(handle);
            if ok {
                let exe = from_wide_slice(&path_buf[..path_len as usize]).to_lowercase();
                if exe.ends_with("spotify.exe") {
                    if let Some((artist, track)) = title.split_once(" - ") {
                        *out = Some((track.trim().to_string(), artist.trim().to_string()));
                        return BOOL(0);
                    }
                }
            }
        }
        BOOL(1)
    }

    let mut found: Option<(String, String)> = None;
    unsafe {
        let _ = EnumWindows(Some(enum_cb), LPARAM(&mut found as *mut _ as isize));
    }

    found.map(|(title, artist)| SystemMediaInfo {
        name: title,
        artist,
        album: String::new(),
        artwork_url: None,
        state: "playing".to_string(),
        duration: 0.0,
        position: 0.0,
        source: "Spotify".to_string(),
    })
}

#[cfg(windows)]
fn get_system_media_blocking() -> Option<SystemMediaInfo> {
    for session in collect_scored_sessions() {
        let app_id = session
            .SourceAppUserModelId()
            .ok()
            .map(|s| s.to_string())
            .unwrap_or_default();

        let props = session.TryGetMediaPropertiesAsync().ok().and_then(|op| op.get().ok());
        if let Some(p) = props {
            let title = p.Title().ok().map(|s| s.to_string()).unwrap_or_default();
            let artist = p.Artist().ok().map(|s| s.to_string()).unwrap_or_default();
            let album = p.AlbumTitle().ok().map(|s| s.to_string()).unwrap_or_default();

            if !title.is_empty() || !artist.is_empty() {
                if !app_id.is_empty() {
                    if let Ok(mut guard) = LAST_ACTIVE_AUMID.lock() {
                        *guard = app_id.clone();
                    }
                }

                let pb_status = session
                    .GetPlaybackInfo()
                    .ok()
                    .and_then(|pb| pb.PlaybackStatus().ok());
                let is_playing = pb_status
                    == Some(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing);
                let state_str = match pb_status {
                    Some(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing) => "playing",
                    Some(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused) => "paused",
                    _ => "stopped",
                };

                let (duration, position) = if let Ok(tl) = session.GetTimelineProperties() {
                    let start = tl.StartTime().map(|t| t.Duration).unwrap_or(0);
                    let end = tl.EndTime().map(|t| t.Duration).unwrap_or(0);
                    let pos = tl.Position().map(|t| t.Duration).unwrap_or(0);
                    let updated = tl.LastUpdatedTime().map(|d| d.UniversalTime).unwrap_or(0);

                    let dur_s = ((end - start).max(0) as f64) / 10_000_000.0;
                    let mut pos_s = ((pos - start).max(0) as f64) / 10_000_000.0;

                    if is_playing && updated > EPOCH_DIFF_100NS {
                        let elapsed_100ns = (now_filetime_100ns() - updated).max(0);
                        pos_s += (elapsed_100ns as f64) / 10_000_000.0;
                    }
                    if dur_s > 0.0 {
                        pos_s = pos_s.clamp(0.0, dur_s);
                    }
                    (dur_s, pos_s)
                } else {
                    (0.0, 0.0)
                };

                let cache_key = format!("{app_id}|{title}|{artist}|{album}");
                let artwork = read_thumbnail_data_url(&session, &cache_key);

                return Some(SystemMediaInfo {
                    name: title,
                    artist,
                    album,
                    artwork_url: artwork,
                    state: state_str.to_string(),
                    duration,
                    position,
                    source: app_id,
                });
            }
        }
    }

    find_spotify_window_fallback()
}

#[tauri::command]
pub async fn get_system_media() -> Option<SystemMediaInfo> {
    #[cfg(windows)]
    {
        return tokio::task::spawn_blocking(get_system_media_blocking)
            .await
            .ok()
            .flatten();
    }

    #[cfg(target_os = "linux")]
    {
        return linux_mpris::get_system_media();
    }

    #[cfg(all(not(windows), not(target_os = "linux")))]
    None
}

#[cfg(windows)]
fn send_media_vk(vk: u16) {
    unsafe {
        let scan = MapVirtualKeyW(vk as u32, MAPVK_VK_TO_VSC) as u16;
        let inputs = [
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(vk),
                        wScan: scan,
                        dwFlags: KEYEVENTF_EXTENDEDKEY,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(vk),
                        wScan: scan,
                        dwFlags: KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
        ];
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(windows)]
fn exec_smtc_command(
    session: &GlobalSystemMediaTransportControlsSession,
    cmd: &str,
    seek_seconds: f64,
) -> bool {
    let pb_status = session
        .GetPlaybackInfo()
        .ok()
        .and_then(|pb| pb.PlaybackStatus().ok());
    let is_playing =
        pb_status == Some(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing);

    match cmd {
        "playpause" | "play_pause" | "toggle" => {
            if session
                .TryTogglePlayPauseAsync()
                .and_then(|o| o.get())
                .unwrap_or(false)
            {
                return true;
            }
            if is_playing {
                session.TryPauseAsync().and_then(|o| o.get()).unwrap_or(false)
            } else {
                session.TryPlayAsync().and_then(|o| o.get()).unwrap_or(false)
            }
        }
        "play" => {
            if session.TryPlayAsync().and_then(|o| o.get()).unwrap_or(false) {
                return true;
            }
            if !is_playing {
                session
                    .TryTogglePlayPauseAsync()
                    .and_then(|o| o.get())
                    .unwrap_or(false)
            } else {
                false
            }
        }
        "pause" => {
            if session.TryPauseAsync().and_then(|o| o.get()).unwrap_or(false) {
                return true;
            }
            if is_playing {
                session
                    .TryTogglePlayPauseAsync()
                    .and_then(|o| o.get())
                    .unwrap_or(false)
            } else {
                false
            }
        }
        "next" => session
            .TrySkipNextAsync()
            .and_then(|o| o.get())
            .unwrap_or(false),
        "previous" | "prev" => session
            .TrySkipPreviousAsync()
            .and_then(|o| o.get())
            .unwrap_or(false),
        "stop" => session
            .TryStopAsync()
            .and_then(|o| o.get())
            .unwrap_or(false),
        "seek" => {
            let tl = session.GetTimelineProperties().ok();
            let start = tl
                .as_ref()
                .and_then(|t| t.StartTime().ok())
                .map(|d| d.Duration)
                .unwrap_or(0);
            let end = tl
                .as_ref()
                .and_then(|t| t.EndTime().ok())
                .map(|d| d.Duration)
                .unwrap_or(0);
            let min_seek = tl
                .as_ref()
                .and_then(|t| t.MinSeekTime().ok())
                .map(|d| d.Duration);
            let max_seek = tl
                .as_ref()
                .and_then(|t| t.MaxSeekTime().ok())
                .map(|d| d.Duration);
            let target_100ns =
                compute_seek_target_100ns(start, end, min_seek, max_seek, seek_seconds);
            session
                .TryChangePlaybackPositionAsync(target_100ns)
                .and_then(|o| o.get())
                .unwrap_or(false)
        }
        _ => false,
    }
}

#[cfg(windows)]
fn control_system_media_blocking(command: String, seek_seconds: f64) -> bool {
    let cmd = command.trim().to_lowercase();
    for session in collect_scored_sessions() {
        if exec_smtc_command(&session, &cmd, seek_seconds) {
            if let Ok(aumid) = session.SourceAppUserModelId() {
                let s = aumid.to_string();
                if !s.is_empty() {
                    if let Ok(mut guard) = LAST_ACTIVE_AUMID.lock() {
                        *guard = s;
                    }
                }
            }
            return true;
        }
    }

    if cmd == "seek" {
        return false;
    }

    // Virtual key fallback when no SMTC session accepts the control command
    match cmd.as_str() {
        "playpause" | "play_pause" | "toggle" | "play" | "pause" => {
            send_media_vk(VK_MEDIA_PLAY_PAUSE.0);
            true
        }
        "next" => {
            send_media_vk(VK_MEDIA_NEXT_TRACK.0);
            true
        }
        "previous" | "prev" => {
            send_media_vk(VK_MEDIA_PREV_TRACK.0);
            true
        }
        "stop" => {
            send_media_vk(VK_MEDIA_STOP.0);
            true
        }
        _ => false,
    }
}

#[tauri::command]
pub async fn control_system_media(command: String, seek_seconds: f64) -> bool {
    #[cfg(windows)]
    {
        return tokio::task::spawn_blocking(move || {
            control_system_media_blocking(command, seek_seconds)
        })
        .await
        .unwrap_or(false);
    }

    #[cfg(target_os = "linux")]
    {
        return linux_mpris::control_system_media(&command, seek_seconds);
    }

    #[cfg(all(not(windows), not(target_os = "linux")))]
    false
}

#[cfg(target_os = "linux")]
mod linux_mpris {
    use super::{Engine, SystemMediaInfo, ARTWORK_CACHE, BASE64};
    use once_cell::sync::Lazy;
    use std::collections::HashMap;
    use std::sync::Mutex;
    use zbus::blocking::{fdo::DBusProxy, Connection, Proxy};
    use zbus::zvariant::{ObjectPath, OwnedValue, Value};

    static LAST_MPRIS_BUS: Lazy<Mutex<String>> = Lazy::new(|| Mutex::new(String::new()));

    fn value_to_string(v: &Value<'_>) -> String {
        match v {
            Value::Str(s) => s.as_str().to_string(),
            Value::ObjectPath(p) => p.as_str().to_string(),
            _ => String::new(),
        }
    }

    fn meta_str(meta: &HashMap<String, OwnedValue>, key: &str) -> String {
        meta.get(key).map(|v| value_to_string(&**v)).unwrap_or_default()
    }

    fn meta_artist(meta: &HashMap<String, OwnedValue>) -> String {
        let Some(v) = meta.get("xesam:artist") else {
            return String::new();
        };
        match &**v {
            Value::Str(s) => s.as_str().trim().to_string(),
            Value::Array(arr) => arr
                .iter()
                .filter_map(|item| match item {
                    Value::Str(s) => {
                        let t = s.as_str().trim();
                        if t.is_empty() { None } else { Some(t.to_string()) }
                    }
                    _ => None,
                })
                .collect::<Vec<_>>()
                .join(", "),
            _ => String::new(),
        }
    }

    fn meta_length_seconds(meta: &HashMap<String, OwnedValue>) -> f64 {
        let Some(v) = meta.get("mpris:length") else {
            return 0.0;
        };
        let us = match &**v {
            Value::I64(n) => (*n).max(0) as f64,
            Value::U64(n) => *n as f64,
            Value::I32(n) => (*n).max(0) as f64,
            Value::U32(n) => *n as f64,
            _ => 0.0,
        };
        us / 1_000_000.0
    }

    fn percent_decode(input: &str) -> String {
        let bytes = input.as_bytes();
        let mut out = Vec::with_capacity(bytes.len());
        let mut i = 0;
        while i < bytes.len() {
            if bytes[i] == b'%' && i + 2 < bytes.len() {
                if let (Some(h), Some(l)) = (
                    (bytes[i + 1] as char).to_digit(16),
                    (bytes[i + 2] as char).to_digit(16),
                ) {
                    out.push(((h << 4) | l) as u8);
                    i += 3;
                    continue;
                }
            }
            out.push(bytes[i]);
            i += 1;
        }
        String::from_utf8_lossy(&out).to_string()
    }

    fn guess_image_mime(hint: &str, bytes: &[u8]) -> &'static str {
        if bytes.starts_with(&[0x89, b'P', b'N', b'G']) || hint.ends_with(".png") {
            "image/png"
        } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
            "image/webp"
        } else if bytes.starts_with(b"<svg") || hint.ends_with(".svg") {
            "image/svg+xml"
        } else {
            "image/jpeg"
        }
    }

    fn resolve_artwork(cache_key: &str, art_url: &str) -> Option<String> {
        if art_url.trim().is_empty() {
            return None;
        }
        if let Ok(guard) = ARTWORK_CACHE.lock() {
            if guard.0 == cache_key {
                return guard.1.clone();
            }
        }

        let resolved = if art_url.starts_with("data:") {
            Some(art_url.to_string())
        } else if let Some(raw_path) = art_url.strip_prefix("file://") {
            let decoded = percent_decode(raw_path);
            let fs_path = if decoded.starts_with("localhost/") {
                &decoded["localhost".len()..]
            } else {
                decoded.as_str()
            };
            std::fs::read(fs_path).ok().and_then(|bytes| {
                if bytes.is_empty() || bytes.len() > 5 * 1024 * 1024 {
                    return None;
                }
                let mime = guess_image_mime(&fs_path.to_lowercase(), &bytes);
                Some(format!("data:{mime};base64,{}", BASE64.encode(&bytes)))
            })
        } else if art_url.starts_with("http://") || art_url.starts_with("https://") {
            let url_owned = art_url.to_string();
            tauri::async_runtime::block_on(async move {
                let client = reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(3))
                    .build()
                    .ok()?;
                let resp = client.get(&url_owned).send().await.ok()?;
                if !resp.status().is_success() {
                    return None;
                }
                let bytes = resp.bytes().await.ok()?;
                if bytes.is_empty() || bytes.len() > 5 * 1024 * 1024 {
                    return None;
                }
                let mime = guess_image_mime(&url_owned.to_lowercase(), &bytes);
                Some(format!("data:{mime};base64,{}", BASE64.encode(&bytes)))
            })
        } else {
            None
        };

        if let Ok(mut guard) = ARTWORK_CACHE.lock() {
            guard.0 = cache_key.to_string();
            guard.1 = resolved.clone();
        }
        resolved
    }

    fn friendly_bus_source(conn: &Connection, bus: &str) -> String {
        if let Ok(root_proxy) = Proxy::new(
            conn,
            bus,
            "/org/mpris/MediaPlayer2",
            "org.mpris.MediaPlayer2",
        ) {
            if let Ok(id) = root_proxy.get_property::<String>("Identity") {
                if !id.trim().is_empty() {
                    return id;
                }
            }
        }
        let raw = bus
            .strip_prefix("org.mpris.MediaPlayer2.")
            .unwrap_or(bus)
            .split('.')
            .next()
            .unwrap_or("Media");
        let mut chars = raw.chars();
        match chars.next() {
            Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
            None => "Media".to_string(),
        }
    }

    fn list_mpris_buses(conn: &Connection) -> Vec<String> {
        let Ok(dbus) = DBusProxy::new(conn) else {
            return Vec::new();
        };
        let Ok(names) = dbus.list_names() else {
            return Vec::new();
        };
        names
            .into_iter()
            .filter_map(|n| {
                let s = n.as_str();
                if s.starts_with("org.mpris.MediaPlayer2.") {
                    Some(s.to_string())
                } else {
                    None
                }
            })
            .collect()
    }

    fn pick_best_bus(conn: &Connection) -> Option<String> {
        let buses = list_mpris_buses(conn);
        if buses.is_empty() {
            return None;
        }

        let last_bus = LAST_MPRIS_BUS.lock().ok().map(|g| g.clone()).unwrap_or_default();
        let mut best: Option<(i32, String)> = None;

        for bus in buses {
            let (status, meta) = {
                let Ok(player) = Proxy::new(
                    conn,
                    bus.as_str(),
                    "/org/mpris/MediaPlayer2",
                    "org.mpris.MediaPlayer2.Player",
                ) else {
                    continue;
                };
                let status = player
                    .get_property::<String>("PlaybackStatus")
                    .unwrap_or_default();
                let meta = player
                    .get_property::<HashMap<String, OwnedValue>>("Metadata")
                    .unwrap_or_default();
                (status, meta)
            };
            let has_meta = !meta_str(&meta, "xesam:title").is_empty() || !meta_artist(&meta).is_empty();
            let mut score = match status.as_str() {
                "Playing" => 100,
                "Paused" => 50,
                _ => 10,
            };
            if has_meta {
                score += 20;
            }
            if bus == last_bus {
                score += 5;
            }
            if best.as_ref().map(|(s, _)| score > *s).unwrap_or(true) {
                best = Some((score, bus));
            }
        }

        best.map(|(_, bus)| bus)
    }

    fn get_media_playerctl_fallback() -> Option<SystemMediaInfo> {
        let out = std::process::Command::new("playerctl")
            .args([
                "metadata",
                "--format",
                "{{status}}\t{{title}}\t{{artist}}\t{{album}}\t{{mpris:artUrl}}\t{{mpris:length}}\t{{position}}\t{{playerName}}",
            ])
            .output()
            .ok()?;
        if !out.status.success() {
            return None;
        }
        let line = String::from_utf8_lossy(&out.stdout).trim().to_string();
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() < 8 {
            return None;
        }
        let title = parts[1].trim().to_string();
        let artist = parts[2].trim().to_string();
        if title.is_empty() && artist.is_empty() {
            return None;
        }
        let album = parts[3].trim().to_string();
        let art_url = parts[4].trim();
        let dur_us = parts[5].trim().parse::<f64>().unwrap_or(0.0);
        let pos_us = parts[6].trim().parse::<f64>().unwrap_or(0.0);
        let source = parts[7].trim().to_string();
        let state = match parts[0].trim().to_lowercase().as_str() {
            "playing" => "playing",
            "paused" => "paused",
            _ => "stopped",
        };
        let duration = (dur_us / 1_000_000.0).max(0.0);
        let position = if duration > 0.0 {
            (pos_us / 1_000_000.0).clamp(0.0, duration)
        } else {
            (pos_us / 1_000_000.0).max(0.0)
        };
        let cache_key = format!("mpris:{source}|{title}|{artist}|{album}|{art_url}");
        let artwork_url = resolve_artwork(&cache_key, art_url);
        Some(SystemMediaInfo {
            name: title,
            artist,
            album,
            artwork_url,
            state: state.to_string(),
            duration,
            position,
            source,
        })
    }

    pub fn get_system_media() -> Option<SystemMediaInfo> {
        if let Ok(conn) = Connection::session() {
            if let Some(bus) = pick_best_bus(&conn) {
                if let Ok(player) = Proxy::new(
                    &conn,
                    bus.as_str(),
                    "/org/mpris/MediaPlayer2",
                    "org.mpris.MediaPlayer2.Player",
                ) {
                    let meta = player
                        .get_property::<HashMap<String, OwnedValue>>("Metadata")
                        .unwrap_or_default();
                    let title = meta_str(&meta, "xesam:title");
                    let artist = meta_artist(&meta);
                    let album = meta_str(&meta, "xesam:album");
                    if !title.is_empty() || !artist.is_empty() {
                        if let Ok(mut g) = LAST_MPRIS_BUS.lock() {
                            *g = bus.clone();
                        }
                        let status = player
                            .get_property::<String>("PlaybackStatus")
                            .unwrap_or_default();
                        let state = match status.as_str() {
                            "Playing" => "playing",
                            "Paused" => "paused",
                            _ => "stopped",
                        };
                        let duration = meta_length_seconds(&meta).max(0.0);
                        let pos_us = player.get_property::<i64>("Position").unwrap_or(0).max(0) as f64;
                        let mut position = pos_us / 1_000_000.0;
                        if duration > 0.0 {
                            position = position.clamp(0.0, duration);
                        }
                        let art_url = meta_str(&meta, "mpris:artUrl");
                        let source = friendly_bus_source(&conn, &bus);
                        let cache_key = format!("mpris:{source}|{title}|{artist}|{album}|{art_url}");
                        let artwork_url = resolve_artwork(&cache_key, &art_url);

                        return Some(SystemMediaInfo {
                            name: title,
                            artist,
                            album,
                            artwork_url,
                            state: state.to_string(),
                            duration,
                            position,
                            source,
                        });
                    }
                }
            }
        }

        get_media_playerctl_fallback()
    }

    pub fn control_system_media(command: &str, seek_seconds: f64) -> bool {
        let cmd = command.trim().to_lowercase();
        if let Ok(conn) = Connection::session() {
            if let Some(bus) = pick_best_bus(&conn) {
                if let Ok(player) = Proxy::new(
                    &conn,
                    bus.as_str(),
                    "/org/mpris/MediaPlayer2",
                    "org.mpris.MediaPlayer2.Player",
                ) {
                    let ok = match cmd.as_str() {
                        "playpause" | "play_pause" | "toggle" => player.call_method("PlayPause", &()).is_ok(),
                        "play" => player.call_method("Play", &()).is_ok(),
                        "pause" => player.call_method("Pause", &()).is_ok(),
                        "next" => player.call_method("Next", &()).is_ok(),
                        "previous" | "prev" => player.call_method("Previous", &()).is_ok(),
                        "stop" => player.call_method("Stop", &()).is_ok(),
                        "seek" => {
                            let target_us = (seek_seconds.max(0.0) * 1_000_000.0).round() as i64;
                            let meta = player
                                .get_property::<HashMap<String, OwnedValue>>("Metadata")
                                .unwrap_or_default();
                            let track_id = meta_str(&meta, "mpris:trackid");
                            let set_ok = ObjectPath::try_from(track_id.as_str())
                                .ok()
                                .filter(|p| !p.as_str().is_empty())
                                .map(|path| player.call_method("SetPosition", &(path, target_us)).is_ok())
                                .unwrap_or(false);
                            if set_ok {
                                true
                            } else {
                                let cur_us = player.get_property::<i64>("Position").unwrap_or(0);
                                let delta = target_us - cur_us;
                                player.call_method("Seek", &(delta)).is_ok()
                            }
                        }
                        _ => false,
                    };
                    if ok {
                        return true;
                    }
                }
            }
        }

        let arg = match cmd.as_str() {
            "playpause" | "play_pause" | "toggle" => vec!["play-pause".to_string()],
            "play" => vec!["play".to_string()],
            "pause" => vec!["pause".to_string()],
            "next" => vec!["next".to_string()],
            "previous" | "prev" => vec!["previous".to_string()],
            "stop" => vec!["stop".to_string()],
            "seek" => vec!["position".to_string(), format!("{:.2}", seek_seconds.max(0.0))],
            _ => return false,
        };
        std::process::Command::new("playerctl")
            .args(&arg)
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::{compute_seek_target_100ns, score_smtc_session};

    #[test]
    fn seek_target_clamps_to_seek_bounds_and_handles_invalid_inputs() {
        // Seek inside bounds
        assert_eq!(
            compute_seek_target_100ns(0, 1_800_000_000, Some(0), Some(1_800_000_000), 42.5),
            425_000_000
        );
        // Overshoot clamped to MaxSeekTime
        assert_eq!(
            compute_seek_target_100ns(0, 2_000_000_000, Some(100_000_000), Some(1_500_000_000), 250.0),
            1_500_000_000
        );
        // Negative / NaN clamped cleanly to MinSeekTime / 0
        assert_eq!(
            compute_seek_target_100ns(50_000_000, 1_000_000_000, Some(100_000_000), Some(900_000_000), -5.0),
            100_000_000
        );
        assert_eq!(
            compute_seek_target_100ns(0, 1_000_000_000, None, None, f64::NAN),
            0
        );
    }

    #[test]
    fn session_scoring_prefers_playing_with_metadata_over_empty_current_session() {
        let empty_current = score_smtc_session(false, false, false, false, true);
        let paused_with_meta = score_smtc_session(false, true, true, false, false);
        let playing_with_meta = score_smtc_session(true, false, true, false, false);
        let sticky_playing = score_smtc_session(true, false, true, true, false);
        assert!(paused_with_meta > empty_current);
        assert!(playing_with_meta > paused_with_meta);
        assert!(sticky_playing > playing_with_meta);
    }
}
