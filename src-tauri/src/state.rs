use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use image::{codecs::png::PngEncoder, imageops::FilterType, ColorType, ImageEncoder, RgbaImage};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::{Cursor, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex, RwLock};
use tauri::{AppHandle, Manager};

#[cfg(windows)]
use windows::{
    core::{PCWSTR, PWSTR},
    Win32::{
        Foundation::{ERROR_INSUFFICIENT_BUFFER, ERROR_SUCCESS, HWND},
        Graphics::Gdi::{
            CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits, GetObjectW, ReleaseDC,
            BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        },
        Storage::{
            FileSystem::{GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW},
            Packaging::Appx::GetCurrentPackageFullName,
        },
        UI::{
            Shell::{ExtractIconExW, SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON, SHGFI_USEFILEATTRIBUTES},
            WindowsAndMessaging::{DestroyIcon, GetIconInfo, HICON, ICONINFO},
        },
    },
};

pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

pub static DEFAULT_TAB_SHORTCUTS: Lazy<HashMap<String, String>> = Lazy::new(|| {
    let pairs = [
        ("0", "Alt+B"),
        ("1", "Alt+W"),
        ("2", "Alt+O"),
        ("12", "Alt+A"),
        ("14", "Alt+L"),
        ("15", "Alt+Q"),
        ("3", "Alt+M"),
        ("4", "Alt+C"),
        ("5", "Alt+N"),
        ("6", "Alt+G"),
        ("7", "Alt+V"),
        ("8", "Alt+T"),
        ("10", "Alt+R"),
        ("16", "Alt+F"),
        ("17", "Alt+P"),
        ("9", "Alt+S"),
    ];
    pairs
        .into_iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect()
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_true")]
    pub always_on_top: bool,
    #[serde(default = "default_true")]
    pub auto_download_and_install: bool,
    #[serde(default = "default_shortcuts")]
    pub tab_shortcuts: HashMap<String, String>,
}

fn default_true() -> bool {
    true
}

fn default_shortcuts() -> HashMap<String, String> {
    DEFAULT_TAB_SHORTCUTS.clone()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            always_on_top: true,
            auto_download_and_install: true,
            tab_shortcuts: DEFAULT_TAB_SHORTCUTS.clone(),
        }
    }
}

/// Deserialize `null` as `T::default()` for legacy JSON compatibility.
pub fn deserialize_null_default<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    T: Default + serde::Deserialize<'de>,
    D: serde::Deserializer<'de>,
{
    let opt = Option::<T>::deserialize(deserializer)?;
    Ok(opt.unwrap_or_default())
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IslandBounds {
    #[serde(default)]
    pub x: Option<f64>,
    #[serde(default)]
    pub y: Option<f64>,
    #[serde(default)]
    pub width: Option<f64>,
    #[serde(default)]
    pub height: Option<f64>,
    #[serde(default)]
    pub left: Option<f64>,
    #[serde(default)]
    pub top: Option<f64>,
    #[serde(default)]
    pub right: Option<f64>,
    #[serde(default)]
    pub bottom: Option<f64>,
}

impl IslandBounds {
    /// Normalize `{ left, top, right, bottom }` or `{ x, y, width, height }` into `(x, y, width, height)`.
    pub fn normalized_rect(&self) -> Option<(f64, f64, f64, f64)> {
        let x = self.x.or(self.left)?;
        let y = self.y.or(self.top)?;
        let width = match self.width {
            Some(w) => w,
            None => match (self.left, self.right) {
                (Some(l), Some(r)) => r - l,
                _ => return None,
            },
        };
        let height = match self.height {
            Some(h) => h,
            None => match (self.top, self.bottom) {
                (Some(t), Some(b)) => b - t,
                _ => return None,
            },
        };
        if width > 0.0 && height > 0.0 {
            Some((x, y, width, height))
        } else {
            None
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct WindowOverlayState {
    pub bounds: Option<IslandBounds>,
    pub ignore_mouse: bool,
    pub forward_mouse: bool,
    pub is_ctrl_held: bool,
    pub cursor_inside_island: bool,
    pub is_shelf_drag_out: bool,
    pub current_display_id: String,
    pub display_x_px: i32,
    pub display_y_px: i32,
    pub display_width_px: i32,
    pub display_height_px: i32,
    pub main_hwnd: isize,
}

pub struct SharedState {
    pub data_dir: PathBuf,
    pub logs_dir: PathBuf,
    pub settings: RwLock<AppSettings>,
    pub overlay: Mutex<WindowOverlayState>,
    pub log_lock: Mutex<()>,
    pub icon_cache: Mutex<HashMap<String, String>>,
    pub bluetooth_cache: Mutex<(i64, Value)>,
    pub update_download_cancel: Arc<AtomicBool>,
    pub update_is_downloading: Arc<AtomicBool>,
    pub update_downloaded_path: Mutex<Option<PathBuf>>,
}

impl SharedState {
    pub fn new(app: &AppHandle) -> Self {
        let data_dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| dirs::data_dir().unwrap_or_else(|| PathBuf::from(".")).join("com.neosparkx.quickpill"));
        let logs_dir = data_dir.join("logs");

        let _ = fs::create_dir_all(&data_dir);
        let _ = fs::create_dir_all(&logs_dir);

        migrate_legacy_data(&data_dir);

        let settings = load_settings_from_disk(&data_dir);

        Self {
            data_dir,
            logs_dir,
            settings: RwLock::new(settings),
            overlay: Mutex::new(WindowOverlayState {
                ignore_mouse: true,
                forward_mouse: true,
                ..Default::default()
            }),
            log_lock: Mutex::new(()),
            icon_cache: Mutex::new(HashMap::new()),
            bluetooth_cache: Mutex::new((0, serde_json::json!({ "available": false, "enabled": false, "connected": false, "device": null, "devices": [] }))),
            update_download_cancel: Arc::new(AtomicBool::new(false)),
            update_is_downloading: Arc::new(AtomicBool::new(false)),
            update_downloaded_path: Mutex::new(None),
        }
    }

    pub fn settings_path(&self) -> PathBuf {
        self.data_dir.join("settings.json")
    }

    pub fn save_settings(&self) -> Result<(), String> {
        let current = self
            .settings
            .read()
            .map_err(|e| format!("settings read lock poisoned: {e}"))?
            .clone();
        let json = serde_json::to_string_pretty(&current)
            .map_err(|e| format!("serialize settings failed: {e}"))?;
        fs::write(self.settings_path(), json).map_err(|e| format!("write settings failed: {e}"))
    }

    pub fn log(&self, level: &str, msg: &str, details: Option<&Value>) {
        let _guard = self.log_lock.lock();
        let log_file = self.logs_dir.join("main.log");

        // Cap log file at ~5 MB to mirror Electron behavior
        if let Ok(meta) = fs::metadata(&log_file) {
            if meta.len() > 5 * 1024 * 1024 {
                let backup = self.logs_dir.join("main.log.old");
                let _ = fs::remove_file(&backup);
                let _ = fs::rename(&log_file, &backup);
            }
        }

        let ts = Utc::now().to_rfc3339();
        let detail_str = match details {
            Some(v) if !v.is_null() => format!(" {}", v),
            _ => String::new(),
        };
        let line = format!("[{ts}] [{}] {msg}{detail_str}\n", level.to_uppercase());
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&log_file) {
            let _ = f.write_all(line.as_bytes());
        }
    }
}

fn load_settings_from_disk(data_dir: &Path) -> AppSettings {
    let path = data_dir.join("settings.json");
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(mut parsed) = serde_json::from_str::<AppSettings>(&raw) {
            if parsed.tab_shortcuts.is_empty() {
                parsed.tab_shortcuts = DEFAULT_TAB_SHORTCUTS.clone();
            }
            return parsed;
        }
    }
    AppSettings::default()
}

/// Migrate user data files from legacy Electron (`%APPDATA%\quick-pill`) or project root.
fn migrate_legacy_data(dest_dir: &Path) {
    let files = [
        "settings.json",
        "notes.json",
        "notes.json.bak",
        "draft-recovery.json",
        "favorites.json",
        "workspaces.json",
        "app-cache.json",
        "notifications-store.json",
    ];

    let mut source_dirs: Vec<PathBuf> = Vec::new();
    if let Some(roaming) = dirs::data_dir() {
        source_dirs.push(roaming.join("quick-pill"));
    }
    if let Ok(cwd) = std::env::current_dir() {
        source_dirs.push(cwd);
    }

    for src_dir in source_dirs {
        if !src_dir.exists() || src_dir == dest_dir {
            continue;
        }
        for name in files {
            let src = src_dir.join(name);
            let dst = dest_dir.join(name);
            if src.exists() && !dst.exists() {
                let _ = fs::copy(&src, &dst);
            }
        }
    }
}

/// Atomically write JSON data via temporary sibling file + rename.
pub fn atomic_write_bytes(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir failed: {e}"))?;
    }
    let tmp = path.with_extension(format!(
        "tmp.{}",
        uuid::Uuid::new_v4().to_string().replace('-', "")
    ));
    fs::write(&tmp, bytes).map_err(|e| format!("write temp failed: {e}"))?;
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("rename failed: {e}")
    })
}

pub fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

pub fn from_wide_slice(buf: &[u16]) -> String {
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..len])
}

#[cfg(windows)]
pub unsafe fn hicon_to_png_data_url(hicon: HICON, target_size: u32) -> Option<String> {
    if hicon.is_invalid() {
        return None;
    }

    let mut icon_info = ICONINFO::default();
    if GetIconInfo(hicon, &mut icon_info).is_err() {
        return None;
    }

    struct Cleanup(ICONINFO);
    impl Drop for Cleanup {
        fn drop(&mut self) {
            unsafe {
                if !self.0.hbmColor.is_invalid() {
                    let _ = DeleteObject(self.0.hbmColor);
                }
                if !self.0.hbmMask.is_invalid() {
                    let _ = DeleteObject(self.0.hbmMask);
                }
            }
        }
    }
    let _cleanup = Cleanup(icon_info);

    let hdc_screen = GetDC(HWND::default());
    let hdc_mem = CreateCompatibleDC(hdc_screen);

    let hbm = if !icon_info.hbmColor.is_invalid() {
        icon_info.hbmColor
    } else {
        icon_info.hbmMask
    };

    let mut bmp = BITMAP::default();
    if GetObjectW(
        hbm,
        std::mem::size_of::<BITMAP>() as i32,
        Some(&mut bmp as *mut _ as *mut _),
    ) == 0
    {
        let _ = DeleteDC(hdc_mem);
        ReleaseDC(HWND::default(), hdc_screen);
        return None;
    }

    let width = bmp.bmWidth.max(1) as u32;
    let height = bmp.bmHeight.abs().max(1) as u32;

    let mut bmi = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: width as i32,
            biHeight: -(height as i32),
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        },
        ..Default::default()
    };

    let mut pixels = vec![0u8; (width * height * 4) as usize];
    let lines = GetDIBits(
        hdc_mem,
        hbm,
        0,
        height,
        Some(pixels.as_mut_ptr() as *mut _),
        &mut bmi,
        DIB_RGB_COLORS,
    );

    if lines == 0 {
        let _ = DeleteDC(hdc_mem);
        ReleaseDC(HWND::default(), hdc_screen);
        return None;
    }

    // Check if alpha channel is completely zero; if so, apply transparency from hbmMask
    let has_alpha = pixels.chunks_exact(4).any(|px| px[3] != 0);
    if !has_alpha && !icon_info.hbmMask.is_invalid() {
        let mut mask_pixels = vec![0u8; (width * height * 4) as usize];
        let mut mask_bmi = bmi;
        mask_bmi.bmiHeader.biHeight = -(height as i32);
        let mask_lines = GetDIBits(
            hdc_mem,
            icon_info.hbmMask,
            0,
            height,
            Some(mask_pixels.as_mut_ptr() as *mut _),
            &mut mask_bmi,
            DIB_RGB_COLORS,
        );
        if mask_lines > 0 {
            for (px, mask) in pixels.chunks_exact_mut(4).zip(mask_pixels.chunks_exact(4)) {
                px[3] = if mask[0] > 127 { 0 } else { 255 };
            }
        } else {
            for px in pixels.chunks_exact_mut(4) {
                px[3] = 255;
            }
        }
    }

    let _ = DeleteDC(hdc_mem);
    ReleaseDC(HWND::default(), hdc_screen);

    // Convert BGRA -> RGBA
    for px in pixels.chunks_exact_mut(4) {
        px.swap(0, 2);
    }

    let rgba = RgbaImage::from_raw(width, height, pixels)?;
    let final_img = if width != target_size || height != target_size {
        image::imageops::resize(&rgba, target_size, target_size, FilterType::Lanczos3)
    } else {
        rgba
    };

    let mut png_bytes = Cursor::new(Vec::new());
    PngEncoder::new(&mut png_bytes)
        .write_image(
            final_img.as_raw(),
            final_img.width(),
            final_img.height(),
            ColorType::Rgba8.into(),
        )
        .ok()?;

    Some(format!(
        "data:image/png;base64,{}",
        BASE64.encode(png_bytes.into_inner())
    ))
}

#[cfg(windows)]
pub fn extract_file_icon_data_url(path: &str, target_size: u32, is_dir: bool) -> Option<String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return None;
    }

    let wide = to_wide(trimmed);

    // For executables / ico / dll, try ExtractIconExW first for crisper high-res icons
    let lower = trimmed.to_lowercase();
    if !is_dir && (lower.ends_with(".exe") || lower.ends_with(".ico") || lower.ends_with(".dll")) {
        unsafe {
            let mut large_icon = HICON::default();
            let count = ExtractIconExW(PCWSTR(wide.as_ptr()), 0, Some(&mut large_icon), None, 1);
            if count > 0 && !large_icon.is_invalid() {
                let data = hicon_to_png_data_url(large_icon, target_size);
                let _ = DestroyIcon(large_icon);
                if data.is_some() {
                    return data;
                }
            }
        }
    }

    unsafe {
        let mut shfi = SHFILEINFOW::default();
        let flags = SHGFI_ICON
            | SHGFI_LARGEICON
            | if Path::new(trimmed).exists() {
                windows::Win32::UI::Shell::SHGFI_FLAGS(0)
            } else {
                SHGFI_USEFILEATTRIBUTES
            };
        let attrs = if is_dir { 0x10 } else { 0x80 };
        let ok = SHGetFileInfoW(
            PCWSTR(wide.as_ptr()),
            windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES(attrs),
            Some(&mut shfi),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            flags,
        );
        if ok != 0 && !shfi.hIcon.is_invalid() {
            let data = hicon_to_png_data_url(shfi.hIcon, target_size);
            let _ = DestroyIcon(shfi.hIcon);
            return data;
        }
    }
    None
}

/// Read `FileDescription` from Windows PE version resource using native Win32 APIs.
#[cfg(windows)]
pub fn read_file_description(path: &str) -> Option<String> {
    unsafe {
        let wide = to_wide(path);
        let mut handle = 0u32;
        let size = GetFileVersionInfoSizeW(PCWSTR(wide.as_ptr()), Some(&mut handle));
        if size == 0 {
            return None;
        }
        let mut buf = vec![0u8; size as usize];
        if GetFileVersionInfoW(PCWSTR(wide.as_ptr()), 0, size, buf.as_mut_ptr() as *mut _).is_err() {
            return None;
        }

        // Query Translation table
        let mut trans_ptr: *mut std::ffi::c_void = std::ptr::null_mut();
        let mut trans_len = 0u32;
        let trans_query = to_wide(r"\VarFileInfo\Translation");
        let mut candidates = vec!["040904B0".to_string(), "040904E4".to_string()];

        if VerQueryValueW(
            buf.as_ptr() as *const _,
            PCWSTR(trans_query.as_ptr()),
            &mut trans_ptr,
            &mut trans_len,
        )
        .as_bool()
            && trans_len >= 4
            && !trans_ptr.is_null()
        {
            let pair = std::slice::from_raw_parts(trans_ptr as *const u16, 2);
            candidates.insert(0, format!("{:04x}{:04x}", pair[0], pair[1]));
        }

        for lang_cp in candidates {
            for field in ["FileDescription", "ProductName"] {
                let query = to_wide(&format!(r"\StringFileInfo\{lang_cp}\{field}"));
                let mut val_ptr: *mut std::ffi::c_void = std::ptr::null_mut();
                let mut val_len = 0u32;
                if VerQueryValueW(
                    buf.as_ptr() as *const _,
                    PCWSTR(query.as_ptr()),
                    &mut val_ptr,
                    &mut val_len,
                )
                .as_bool()
                    && val_len > 0
                    && !val_ptr.is_null()
                {
                    let slice = std::slice::from_raw_parts(val_ptr as *const u16, val_len as usize);
                    let text = from_wide_slice(slice).trim().to_string();
                    if !text.is_empty() {
                        return Some(text);
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
pub fn log_message(
    state: tauri::State<'_, SharedState>,
    level: String,
    msg: String,
    details: Option<Value>,
) {
    state.log(&level, &msg, details.as_ref());
}

#[tauri::command]
pub fn log_renderer_error(state: tauri::State<'_, SharedState>, error_data: Value) {
    state.log("ERROR", "[RendererError]", Some(&error_data));
}

#[tauri::command]
pub fn get_app_version() -> String {
    APP_VERSION.to_string()
}

/// Returns `true` when Quick Pill is running inside a Windows MSIX / Appx package
/// (Microsoft Store or sideloaded `.msix` package identity).
pub fn is_store_packaged() -> bool {
    #[cfg(windows)]
    unsafe {
        let mut len: u32 = 0;
        let rc = GetCurrentPackageFullName(&mut len, PWSTR::null());
        return rc == ERROR_INSUFFICIENT_BUFFER || (rc == ERROR_SUCCESS && len > 0);
    }
    #[cfg(not(windows))]
    false
}

#[tauri::command]
pub fn is_store_build() -> bool {
    is_store_packaged()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_shortcuts_never_contain_ctrl() {
        for shortcut in DEFAULT_TAB_SHORTCUTS.values() {
            let lower = shortcut.to_lowercase();
            assert!(!lower.contains("ctrl") && !lower.contains("control"));
        }
    }

    #[test]
    fn wide_roundtrip_works() {
        let s = "Quick Pill বাংলা 🚀";
        let w = to_wide(s);
        assert_eq!(from_wide_slice(&w), s);
    }

    #[test]
    fn island_bounds_accepts_dom_rect_and_xywh() {
        let rect_json = r#"{"left": 760, "top": 10, "right": 1160, "bottom": 52}"#;
        let b1: IslandBounds = serde_json::from_str(rect_json).expect("dom rect parse");
        assert_eq!(b1.normalized_rect(), Some((760.0, 10.0, 400.0, 42.0)));

        let xywh_json = r#"{"x": 100, "y": 8, "width": 220, "height": 36}"#;
        let b2: IslandBounds = serde_json::from_str(xywh_json).expect("xywh parse");
        assert_eq!(b2.normalized_rect(), Some((100.0, 8.0, 220.0, 36.0)));
    }
}
