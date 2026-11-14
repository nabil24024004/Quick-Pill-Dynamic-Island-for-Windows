use crate::state::{SharedState, APP_VERSION};
use futures_util::StreamExt;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

const MANIFEST_URL: &str = "https://quickpill.neosparkx.com/version.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PlatformEntry {
    pub url: Option<String>,
    pub sha256: Option<String>,
    pub size: Option<u64>,
    pub installer_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateManifest {
    pub version: String,
    pub name: Option<String>,
    pub release_date: Option<String>,
    #[serde(default)]
    pub changelog: Vec<String>,
    #[serde(default)]
    pub platforms: std::collections::HashMap<String, PlatformEntry>,
    #[serde(alias = "url")]
    pub download_url: Option<String>,
    pub sha256: Option<String>,
    pub size: Option<u64>,
    pub file_name: Option<String>,
    pub release_notes: Option<String>,
}

impl UpdateManifest {
    pub fn resolved_url(&self) -> Option<String> {
        self.platforms
            .get("win32-x64")
            .and_then(|p| p.url.clone())
            .or_else(|| self.download_url.clone())
            .filter(|s| !s.trim().is_empty())
    }

    pub fn resolved_sha256(&self) -> Option<String> {
        self.platforms
            .get("win32-x64")
            .and_then(|p| p.sha256.clone())
            .or_else(|| self.sha256.clone())
            .filter(|s| !s.trim().is_empty())
    }

    pub fn resolved_size(&self) -> Option<u64> {
        self.platforms
            .get("win32-x64")
            .and_then(|p| p.size)
            .or(self.size)
    }

    pub fn resolved_notes(&self) -> Option<String> {
        if !self.changelog.is_empty() {
            Some(self.changelog.join("\n"))
        } else {
            self.release_notes.clone()
        }
    }
}

static LATEST_MANIFEST: Lazy<Mutex<Option<UpdateManifest>>> = Lazy::new(|| Mutex::new(None));

fn emit_update(app: &AppHandle, event: &str, data: Value) {
    let _ = app.emit("update-event", json!({ "event": event, "data": data }));
}

/// Classifies installer spawn/exit failures so Windows Smart App Control and
/// Device Guard policy blocks surface an actionable message instead of silent exit.
pub fn classify_installer_launch_error(raw_os_error: Option<i32>, detail: &str) -> String {
    let lower = detail.to_ascii_lowercase();
    let is_sac_block = matches!(raw_os_error, Some(4551) | Some(1260))
        || lower.contains("4551")
        || lower.contains("1260")
        || lower.contains("device guard")
        || lower.contains("smart app control")
        || lower.contains("application control")
        || lower.contains("system policy");

    if is_sac_block {
        "Windows Smart App Control or Device Guard blocked the update installer. Download the latest release directly from https://quickpill.neosparkx.com."
            .to_string()
    } else {
        format!("Failed to start installer: {detail}")
    }
}

pub fn is_newer_version(remote: &str, current: &str) -> bool {
    let parse = |v: &str| -> Vec<u64> {
        v.trim()
            .trim_start_matches('v')
            .split(['.', '-', '+'])
            .take(3)
            .map(|p| p.parse::<u64>().unwrap_or(0))
            .collect()
    };
    let r = parse(remote);
    let c = parse(current);
    for i in 0..3 {
        let rv = r.get(i).copied().unwrap_or(0);
        let cv = c.get(i).copied().unwrap_or(0);
        if rv > cv {
            return true;
        }
        if rv < cv {
            return false;
        }
    }
    false
}

fn store_managed_status() -> Value {
    json!({
        "status": "store-managed",
        "storeManaged": true,
        "updateAvailable": false,
        "version": APP_VERSION,
        "message": "Updates are managed automatically through the Microsoft Store."
    })
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<Value, String> {
    if crate::state::is_store_packaged() {
        let info = store_managed_status();
        emit_update(&app, "store-managed", info.clone());
        return Ok(info);
    }

    emit_update(&app, "checking", json!({}));

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            let msg = format!("HTTP client error: {e}");
            emit_update(&app, "error", json!({ "message": msg }));
            return Ok(json!({ "status": "error", "error": msg }));
        }
    };

    let resp = match client.get(MANIFEST_URL).send().await {
        Ok(r) => r,
        Err(e) => {
            let msg = format!("Failed to check updates: {e}");
            emit_update(&app, "error", json!({ "message": msg }));
            return Ok(json!({ "status": "error", "error": msg }));
        }
    };

    if !resp.status().is_success() {
        let msg = format!("Manifest returned HTTP {}", resp.status());
        emit_update(&app, "error", json!({ "message": msg }));
        return Ok(json!({ "status": "error", "error": msg }));
    }

    let manifest: UpdateManifest = match resp.json().await {
        Ok(m) => m,
        Err(e) => {
            let msg = format!("Invalid update manifest JSON: {e}");
            emit_update(&app, "error", json!({ "message": msg }));
            return Ok(json!({ "status": "error", "error": msg }));
        }
    };

    if is_newer_version(&manifest.version, APP_VERSION) {
        if let Ok(mut guard) = LATEST_MANIFEST.lock() {
            *guard = Some(manifest.clone());
        }
        let update_info = json!({
            "updateAvailable": true,
            "version": manifest.version,
            "releaseNotes": manifest.resolved_notes(),
            "changelog": manifest.changelog,
            "downloadUrl": manifest.resolved_url(),
            "sha256": manifest.resolved_sha256(),
            "fileName": manifest.file_name,
            "size": manifest.resolved_size()
        });
        emit_update(&app, "available", update_info.clone());
        Ok(json!({
            "status": "available",
            "updateAvailable": true,
            "updateInfo": update_info
        }))
    } else {
        let info = json!({
            "status": "not-available",
            "updateAvailable": false,
            "version": APP_VERSION
        });
        emit_update(&app, "not-available", info.clone());
        Ok(info)
    }
}

#[tauri::command]
pub async fn start_update_download(app: AppHandle) -> Result<Value, String> {
    if crate::state::is_store_packaged() {
        let info = store_managed_status();
        emit_update(&app, "store-managed", info.clone());
        return Ok(info);
    }

    let state = app.state::<SharedState>();
    if state.update_is_downloading.swap(true, Ordering::SeqCst) {
        return Ok(json!({ "started": false, "reason": "already-downloading" }));
    }
    state.update_download_cancel.store(false, Ordering::SeqCst);

    struct ResetFlag<'a>(&'a std::sync::atomic::AtomicBool);
    impl Drop for ResetFlag<'_> {
        fn drop(&mut self) {
            self.0.store(false, Ordering::SeqCst);
        }
    }
    let _reset = ResetFlag(&state.update_is_downloading);

    let manifest = LATEST_MANIFEST
        .lock()
        .ok()
        .and_then(|g| g.clone())
        .ok_or_else(|| {
            let msg = "No update manifest loaded; check for updates first".to_string();
            emit_update(&app, "error", json!({ "message": msg }));
            msg
        })?;

    let url = manifest.resolved_url().ok_or_else(|| {
        let msg = "Manifest missing download URL".to_string();
        emit_update(&app, "error", json!({ "message": msg }));
        msg
    })?;

    emit_update(&app, "download-started", json!({}));

    let file_name = manifest.file_name.clone().unwrap_or_else(|| {
        format!("QuickPill-Windows-v{}-Setup.exe", manifest.version.trim())
    });

    let updates_dir = std::env::temp_dir().join("QuickPill-Updates");
    fs::create_dir_all(&updates_dir).map_err(|e| {
        let msg = format!("mkdir updates failed: {e}");
        emit_update(&app, "error", json!({ "message": msg }));
        msg
    })?;
    let dest_path: PathBuf = updates_dir.join(&file_name);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
        .map_err(|e| {
            let msg = format!("HTTP client failed: {e}");
            emit_update(&app, "error", json!({ "message": msg }));
            msg
        })?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            let msg = format!("Download request failed: {e}");
            emit_update(&app, "error", json!({ "message": msg }));
            msg
        })?;

    if !resp.status().is_success() {
        let msg = format!("Download returned HTTP {}", resp.status());
        emit_update(&app, "error", json!({ "message": msg }));
        return Err(msg);
    }

    let total = resp.content_length().or(manifest.resolved_size()).unwrap_or(0);
    let mut file = File::create(&dest_path).map_err(|e| {
        let msg = format!("Create installer failed: {e}");
        emit_update(&app, "error", json!({ "message": msg }));
        msg
    })?;
    let mut hasher = Sha256::new();
    let mut transferred: u64 = 0;
    let started_at = Instant::now();
    let mut last_emit = Instant::now();

    let mut stream = resp.bytes_stream();
    while let Some(chunk_res) = stream.next().await {
        if state.update_download_cancel.load(Ordering::SeqCst) {
            drop(file);
            let _ = fs::remove_file(&dest_path);
            emit_update(&app, "cancelled", json!({}));
            return Ok(json!({ "cancelled": true }));
        }

        let chunk = chunk_res.map_err(|e| {
            let msg = format!("Stream error: {e}");
            emit_update(&app, "error", json!({ "message": msg }));
            msg
        })?;

        file.write_all(&chunk).map_err(|e| {
            let msg = format!("Write failed: {e}");
            emit_update(&app, "error", json!({ "message": msg }));
            msg
        })?;
        hasher.update(&chunk);
        transferred += chunk.len() as u64;

        if last_emit.elapsed() >= Duration::from_millis(200) || (total > 0 && transferred >= total) {
            last_emit = Instant::now();
            let elapsed_s = started_at.elapsed().as_secs_f64().max(0.1);
            let bps = ((transferred as f64) / elapsed_s) as u64;
            let percent = if total > 0 {
                ((transferred as f64 / total as f64) * 100.0).min(100.0)
            } else {
                0.0
            };
            emit_update(
                &app,
                "download-progress",
                json!({
                    "percent": percent.round() as u64,
                    "transferredBytes": transferred,
                    "totalBytes": total,
                    "speedBytesPerSec": bps
                }),
            );
        }
    }
    file.flush().map_err(|e| format!("Flush failed: {e}"))?;
    drop(file);

    let actual_sha256 = hex::encode(hasher.finalize());
    if let Some(expected) = manifest.resolved_sha256() {
        if !actual_sha256.eq_ignore_ascii_case(expected.trim()) {
            let _ = fs::remove_file(&dest_path);
            let msg = "Update checksum verification failed (SHA-256 mismatch)".to_string();
            emit_update(&app, "error", json!({ "message": msg }));
            return Err(msg);
        }
    }

    if let Ok(mut guard) = state.update_downloaded_path.lock() {
        *guard = Some(dest_path.clone());
    }

    let info = json!({
        "version": manifest.version,
        "filePath": dest_path.to_string_lossy(),
        "sha256": actual_sha256
    });
    emit_update(&app, "downloaded", info.clone());
    Ok(info)
}

#[tauri::command]
pub fn cancel_update_download(state: tauri::State<'_, SharedState>) -> bool {
    state.update_download_cancel.store(true, Ordering::SeqCst);
    true
}

#[tauri::command]
pub fn install_update(app: AppHandle, state: tauri::State<'_, SharedState>) -> Result<bool, String> {
    if crate::state::is_store_packaged() {
        return Err("Updates for Microsoft Store builds are installed automatically via the Microsoft Store.".to_string());
    }

    let installer = state
        .update_downloaded_path
        .lock()
        .ok()
        .and_then(|g| g.clone())
        .filter(|p| p.exists())
        .ok_or_else(|| {
            let msg = "No downloaded installer found".to_string();
            emit_update(&app, "error", json!({ "message": msg }));
            msg
        })?;

    let mut child = std::process::Command::new(&installer)
        .arg("/S")
        .spawn()
        .map_err(|e| {
            let msg = classify_installer_launch_error(e.raw_os_error(), &e.to_string());
            emit_update(&app, "error", json!({ "message": msg }));
            msg
        })?;

    // Give Windows Smart App Control / policy enforcement a moment to reject the child process
    // before closing Quick Pill so policy blocks can still be surfaced in the Settings UI.
    std::thread::sleep(Duration::from_millis(250));
    if let Ok(Some(status)) = child.try_wait() {
        if !status.success() {
            let msg = classify_installer_launch_error(
                status.code(),
                &format!("Installer exited early with status {status}"),
            );
            emit_update(&app, "error", json!({ "message": msg }));
            return Err(msg);
        }
    }

    app.exit(0);
    Ok(true)
}

#[tauri::command]
pub fn get_auto_download_install(state: tauri::State<'_, SharedState>) -> bool {
    state
        .settings
        .read()
        .map(|s| s.auto_download_and_install)
        .unwrap_or(true)
}

#[tauri::command]
pub fn set_auto_download_install(
    state: tauri::State<'_, SharedState>,
    enable: bool,
) -> Result<bool, String> {
    {
        let mut s = state.settings.write().map_err(|e| format!("{e}"))?;
        s.auto_download_and_install = enable;
    }
    state.save_settings()?;
    Ok(enable)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn semver_comparison_works() {
        assert!(is_newer_version("6.0.1", "6.0.0"));
        assert!(is_newer_version("v6.1.0", "6.0.0"));
        assert!(!is_newer_version("6.0.0", "6.0.0"));
        assert!(!is_newer_version("5.6.1", "6.0.0"));
    }

    #[test]
    fn manifest_parses_platforms_win32_x64() {
        let raw = r#"{
            "version": "6.0.0",
            "changelog": ["Line 1", "Line 2"],
            "platforms": {
                "win32-x64": {
                    "url": "https://example.com/setup.exe",
                    "sha256": "deadbeef",
                    "size": 12345
                }
            }
        }"#;
        let m: UpdateManifest = serde_json::from_str(raw).unwrap();
        assert_eq!(m.resolved_url().as_deref(), Some("https://example.com/setup.exe"));
        assert_eq!(m.resolved_sha256().as_deref(), Some("deadbeef"));
        assert_eq!(m.resolved_size(), Some(12345));
        assert_eq!(m.resolved_notes().as_deref(), Some("Line 1\nLine 2"));
    }

    #[test]
    fn sac_policy_error_classification_detects_4551_and_1260() {
        let sac = classify_installer_launch_error(Some(4551), "Application Control policy");
        assert!(sac.contains("Smart App Control"));

        let gpo = classify_installer_launch_error(Some(1260), "Group policy block");
        assert!(gpo.contains("Smart App Control"));

        let text_match = classify_installer_launch_error(None, "blocked by your organization's Device Guard policy (os error 4551)");
        assert!(text_match.contains("Smart App Control"));

        let generic = classify_installer_launch_error(Some(2), "file not found");
        assert_eq!(generic, "Failed to start installer: file not found");
    }

    #[test]
    fn store_managed_status_disables_external_update_flag() {
        let info = store_managed_status();
        assert_eq!(info["status"], "store-managed");
        assert_eq!(info["storeManaged"], true);
        assert_eq!(info["updateAvailable"], false);
        assert_eq!(info["version"], APP_VERSION);
        let _ = crate::state::is_store_packaged();
    }
}
