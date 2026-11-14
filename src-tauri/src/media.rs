use crate::state::from_wide_slice;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use once_cell::sync::Lazy;
use serde::Serialize;
use std::sync::Mutex;
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
                keybd_event, KEYEVENTF_KEYUP, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PLAY_PAUSE,
                VK_MEDIA_PREV_TRACK, VK_MEDIA_STOP,
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

const EPOCH_DIFF_100NS: i64 = 116_444_736_000_000_000;

fn now_filetime_100ns() -> i64 {
    let unix_ns = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as i64)
        .unwrap_or(0);
    (unix_ns / 100) + EPOCH_DIFF_100NS
}

#[cfg(windows)]
fn get_best_session() -> Option<GlobalSystemMediaTransportControlsSession> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
    let mgr = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .ok()?
        .get()
        .ok()?;

    if let Ok(curr) = mgr.GetCurrentSession() {
        return Some(curr);
    }

    let sessions = mgr.GetSessions().ok()?;
    let mut fallback = None;
    for s in sessions {
        if let Ok(pb) = s.GetPlaybackInfo() {
            if pb.PlaybackStatus().ok() == Some(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing) {
                return Some(s);
            }
        }
        if fallback.is_none() {
            fallback = Some(s);
        }
    }
    fallback
}

#[cfg(windows)]
fn read_thumbnail_data_url(
    session: &GlobalSystemMediaTransportControlsSession,
    cache_key: &str,
) -> Option<String> {
    if let Ok(guard) = ARTWORK_CACHE.lock() {
        if guard.0 == cache_key {
            return guard.1.clone();
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

    if let Ok(mut guard) = ARTWORK_CACHE.lock() {
        *guard = (cache_key.to_string(), result.clone());
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

#[tauri::command]
pub fn get_system_media() -> Option<SystemMediaInfo> {
    #[cfg(windows)]
    {
        if let Some(session) = get_best_session() {
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

                        if is_playing && updated > 0 {
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

        return find_spotify_window_fallback();
    }

    #[cfg(not(windows))]
    None
}

#[cfg(windows)]
fn send_media_vk(vk: u16) {
    unsafe {
        keybd_event(vk as u8, 0, Default::default(), 0);
        keybd_event(vk as u8, 0, KEYEVENTF_KEYUP, 0);
    }
}

#[tauri::command]
pub fn control_system_media(command: String, seek_seconds: f64) -> bool {
    #[cfg(windows)]
    {
        let cmd = command.trim().to_lowercase();
        if let Some(session) = get_best_session() {
            match cmd.as_str() {
                "playpause" | "play_pause" | "toggle" => {
                    if session.TryTogglePlayPauseAsync().and_then(|o| o.get()).is_ok() {
                        return true;
                    }
                }
                "play" => {
                    if session.TryPlayAsync().and_then(|o| o.get()).is_ok() {
                        return true;
                    }
                }
                "pause" => {
                    if session.TryPauseAsync().and_then(|o| o.get()).is_ok() {
                        return true;
                    }
                }
                "next" => {
                    if session.TrySkipNextAsync().and_then(|o| o.get()).is_ok() {
                        return true;
                    }
                }
                "previous" | "prev" => {
                    if session.TrySkipPreviousAsync().and_then(|o| o.get()).is_ok() {
                        return true;
                    }
                }
                "stop" => {
                    if session.TryStopAsync().and_then(|o| o.get()).is_ok() {
                        return true;
                    }
                }
                "seek" => {
                    let start = session
                        .GetTimelineProperties()
                        .ok()
                        .and_then(|tl| tl.StartTime().ok())
                        .map(|t| t.Duration)
                        .unwrap_or(0);
                    let target_100ns = start + (seek_seconds.max(0.0) * 10_000_000.0).round() as i64;
                    return session
                        .TryChangePlaybackPositionAsync(target_100ns)
                        .and_then(|o| o.get())
                        .unwrap_or(false);
                }
                _ => {}
            }
        }

        // Virtual key fallback
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

    #[cfg(not(windows))]
    false
}
