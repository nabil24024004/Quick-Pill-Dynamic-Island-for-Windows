use crate::state::{atomic_write_bytes, deserialize_null_default, extract_file_icon_data_url, from_wide_slice, to_wide, SharedState};
use chrono::Utc;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

#[cfg(windows)]
use windows::{
    core::{Interface, PCWSTR},
    Management::Deployment::{PackageManager, PackageTypes},
    Win32::{
        Foundation::{BOOL, CloseHandle, HWND, LPARAM, MAX_PATH},
        System::{
            Com::{CoCreateInstance, CoInitializeEx, IPersistFile, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED, STGM_READ},
            Registry::{RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ},
            Threading::{AttachThreadInput, GetCurrentThreadId, OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT, PROCESS_QUERY_LIMITED_INFORMATION},
        },
        UI::{
            Shell::{IShellLinkW, ShellExecuteW, ShellLink},
            WindowsAndMessaging::{
                BringWindowToTop, EnumWindows, GetForegroundWindow, GetWindowLongPtrW,
                GetWindowTextW, GetWindowThreadProcessId, IsIconic, IsWindow, IsWindowVisible,
                SetForegroundWindow, ShowWindow, GWL_EXSTYLE, SW_RESTORE, SW_SHOW, SW_SHOWNORMAL,
                WS_EX_TOOLWINDOW,
            },
        },
    },
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppItem {
    pub id: String,
    pub name: String,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub raw_name: String,
    #[serde(rename = "type", default, deserialize_with = "deserialize_null_default")]
    pub app_type: String,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub launch: String,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub target: String,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub args: String,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub icon_location: String,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub publisher: String,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub version: String,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub aliases: Vec<String>,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub source: String,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub last_discovered: i64,
    #[serde(default)]
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct AppCacheFile {
    #[serde(default, deserialize_with = "deserialize_null_default")]
    version: u32,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    updated_at: i64,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    count: usize,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    apps: Vec<AppItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct LaunchStat {
    #[serde(default)]
    launch_count: u64,
    #[serde(default)]
    last_launched: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct FavoritesFile {
    #[serde(default)]
    favorites: Vec<String>,
    #[serde(default)]
    history: HashMap<String, LaunchStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceLaunchEntry {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub target: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    #[serde(default = "default_ws_icon")]
    pub icon: String,
    #[serde(default = "default_ws_color")]
    pub color: String,
    #[serde(default)]
    pub pinned_apps: Vec<String>,
    #[serde(default)]
    pub launch_profile: Vec<WorkspaceLaunchEntry>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

fn default_ws_icon() -> String {
    "Layers".to_string()
}
fn default_ws_color() -> String {
    "#3B82F6".to_string()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningWindow {
    pub h_wnd: isize,
    pub pid: u32,
    pub title: String,
    pub process_name: String,
    pub exe_path: String,
    pub icon: Option<String>,
    pub is_minimized: bool,
}

static CATALOG: Lazy<Mutex<Vec<AppItem>>> = Lazy::new(|| Mutex::new(Vec::new()));

fn cache_path(state: &SharedState) -> PathBuf {
    state.data_dir.join("app-cache.json")
}

fn favorites_path(state: &SharedState) -> PathBuf {
    state.data_dir.join("favorites.json")
}

fn workspaces_path(state: &SharedState) -> PathBuf {
    state.data_dir.join("workspaces.json")
}

fn default_svg_icon() -> String {
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2MEE1RkEiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjIiIHk9IjMiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNCIgcng9IjIiLz48bGluZSB4MT0iOCIgeTE9IjIxIiB4Mj0iMTYiIHkyPSIyMSIvPjxsaW5lIHgxPSIxMiIgeTE9IjE3IiB4Mj0iMTIiIHkyPSIyMSIvPjwvc3ZnPg==".to_string()
}

pub fn init_launcher(app: &AppHandle, state: &SharedState) {
    if let Ok(raw) = fs::read_to_string(cache_path(state)) {
        match serde_json::from_str::<AppCacheFile>(&raw) {
            Ok(cache) if !cache.apps.is_empty() => {
                let count = cache.apps.len();
                if let Ok(mut guard) = CATALOG.lock() {
                    *guard = cache.apps;
                }
                state.log("INFO", &format!("[Launcher] Loaded {count} apps from cache"), None);
                return;
            }
            Ok(_) => {}
            Err(e) => {
                state.log("WARN", &format!("[Launcher] Cached app-cache.json invalid ({e}); reindexing in background"), None);
            }
        }
    }

    let app_bg = app.clone();
    std::thread::spawn(move || {
        use tauri::Manager;
        let st = app_bg.state::<SharedState>();
        st.log("INFO", "[Launcher] Starting background app discovery", None);
        let apps = discover_all_apps(&st);
        let count = apps.len();
        save_app_cache(&st, &apps);
        if let Ok(mut guard) = CATALOG.lock() {
            *guard = apps;
        }
        st.log("INFO", &format!("[Launcher] Background discovery indexed {count} apps"), None);
        let _ = app_bg.emit("launcher:catalog-updated", count);
    });
}

fn save_app_cache(state: &SharedState, apps: &[AppItem]) {
    let file = AppCacheFile {
        version: 1,
        updated_at: Utc::now().timestamp_millis(),
        count: apps.len(),
        apps: apps.to_vec(),
    };
    if let Ok(bytes) = serde_json::to_vec_pretty(&file) {
        let _ = atomic_write_bytes(&cache_path(state), &bytes);
    }
}

fn expand_env_vars(input: &str) -> String {
    let mut out = input.to_string();
    for (var, val) in std::env::vars() {
        let token = format!("%{var}%");
        if out.to_lowercase().contains(&token.to_lowercase()) {
            // Case-insensitive replace
            let lower_out = out.to_lowercase();
            let lower_tok = token.to_lowercase();
            let mut result = String::with_capacity(out.len());
            let mut i = 0;
            while let Some(pos) = lower_out[i..].find(&lower_tok) {
                result.push_str(&out[i..i + pos]);
                result.push_str(&val);
                i += pos + token.len();
            }
            result.push_str(&out[i..]);
            out = result;
        }
    }
    out
}

fn is_ignored_helper(name: &str, target: &str) -> bool {
    let nl = name.to_lowercase();
    let tl = target.to_lowercase();
    const BAD_TOKENS: &[&str] = &[
        "uninstall",
        "uninst",
        "unins000",
        "setup",
        "installer",
        "updater",
        "update.exe",
        "crashhandler",
        "crashreporter",
        "vcredist",
        "dxsetup",
        "documentation",
        "readme",
        "license",
        "help",
        "release notes",
        "manual",
    ];
    BAD_TOKENS.iter().any(|t| nl.contains(t) || tl.contains(t))
}

fn make_app_id(prefix: &str, name: &str) -> String {
    let slug: String = name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect();
    format!("{prefix}-{slug}")
}

fn add_alias_hints(name: &str, target: &str, aliases: &mut Vec<String>) {
    let nl = name.to_lowercase();
    if let Some(fname) = Path::new(target).file_name().and_then(|f| f.to_str()) {
        let fl = fname.to_lowercase();
        if !aliases.contains(&fl) {
            aliases.push(fl);
        }
    }
    if nl.contains("visual studio code") {
        aliases.push("vscode".into());
        aliases.push("code".into());
    } else if nl.contains("command prompt") {
        aliases.push("cmd".into());
    } else if nl.contains("windows terminal") {
        aliases.push("wt".into());
        aliases.push("terminal".into());
    } else if nl.contains("calculator") {
        aliases.push("calc".into());
    }
}

#[cfg(windows)]
fn resolve_lnk(lnk_path: &Path) -> Option<(String, String, String)> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let shell_link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER).ok()?;
        let persist: IPersistFile = shell_link.cast().ok()?;
        let wide_lnk = to_wide(&lnk_path.to_string_lossy());
        persist.Load(PCWSTR(wide_lnk.as_ptr()), STGM_READ).ok()?;

        let mut target_buf = [0u16; MAX_PATH as usize * 2];
        let _ = shell_link.GetPath(&mut target_buf, std::ptr::null_mut(), 0);
        let target = expand_env_vars(&from_wide_slice(&target_buf));

        let mut args_buf = [0u16; 1024];
        let _ = shell_link.GetArguments(&mut args_buf);
        let args = from_wide_slice(&args_buf);

        let mut icon_buf = [0u16; MAX_PATH as usize * 2];
        let mut icon_idx = 0i32;
        let _ = shell_link.GetIconLocation(&mut icon_buf, &mut icon_idx);
        let icon_loc = format!("{},{icon_idx}", from_wide_slice(&icon_buf));

        if target.trim().is_empty() {
            return None;
        }
        Some((target, args, icon_loc))
    }
}

fn scan_start_menu(dir: &Path, depth: usize, out: &mut Vec<AppItem>) {
    if depth > 5 || !dir.exists() {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let now = Utc::now().timestamp_millis();

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            scan_start_menu(&path, depth + 1, out);
            continue;
        }
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        if ext != "lnk" {
            continue;
        }

        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if name.is_empty() {
            continue;
        }

        #[cfg(windows)]
        if let Some((target, args, icon_loc)) = resolve_lnk(&path) {
            let lower_target = target.to_lowercase();
            if (!lower_target.ends_with(".exe") && !lower_target.ends_with(".msc"))
                || is_ignored_helper(&name, &lower_target)
                || !Path::new(&target).exists()
            {
                continue;
            }

            let mut aliases = vec![name.to_lowercase()];
            add_alias_hints(&name, &lower_target, &mut aliases);

            let icon_src = icon_loc
                .split(',')
                .next()
                .map(|s| expand_env_vars(s.trim()))
                .filter(|s| !s.is_empty() && Path::new(s).exists())
                .unwrap_or_else(|| target.clone());

            let icon = extract_file_icon_data_url(&icon_src, 48, false)
                .or_else(|| extract_file_icon_data_url(&target, 48, false))
                .or_else(|| Some(default_svg_icon()));

            out.push(AppItem {
                id: make_app_id("win32", &name),
                name: name.clone(),
                raw_name: name,
                app_type: "win32".to_string(),
                launch: lower_target.clone(),
                target: lower_target,
                args,
                icon_location: icon_loc,
                publisher: String::new(),
                version: String::new(),
                aliases,
                source: "start-menu".to_string(),
                last_discovered: now,
                icon,
            });
        }
    }
}

#[cfg(windows)]
unsafe fn read_reg_sz(hkey: HKEY, val_name: &str) -> Option<String> {
    let wide = to_wide(val_name);
    let mut reg_type = windows::Win32::System::Registry::REG_VALUE_TYPE(0);
    let mut len = 0u32;
    if RegQueryValueExW(hkey, PCWSTR(wide.as_ptr()), None, Some(&mut reg_type), None, Some(&mut len)).is_err()
        || len == 0
    {
        return None;
    }
    let mut buf = vec![0u16; (len as usize / 2) + 2];
    if RegQueryValueExW(
        hkey,
        PCWSTR(wide.as_ptr()),
        None,
        Some(&mut reg_type),
        Some(buf.as_mut_ptr() as *mut u8),
        Some(&mut len),
    )
    .is_err()
    {
        return None;
    }
    let s = from_wide_slice(&buf).trim().trim_matches('"').to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

#[cfg(windows)]
fn scan_app_paths(root: HKEY, out: &mut Vec<AppItem>) {
    let now = Utc::now().timestamp_millis();
    unsafe {
        let base = to_wide(r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths");
        let mut hkey = HKEY::default();
        if RegOpenKeyExW(root, PCWSTR(base.as_ptr()), 0, KEY_READ, &mut hkey).is_err() {
            return;
        }
        let mut idx = 0u32;
        loop {
            let mut buf = [0u16; 256];
            let mut len = buf.len() as u32;
            if RegEnumKeyExW(
                hkey,
                idx,
                windows::core::PWSTR(buf.as_mut_ptr()),
                &mut len,
                None,
                windows::core::PWSTR::null(),
                None,
                None,
            )
            .is_err()
            {
                break;
            }
            idx += 1;
            let key_name = from_wide_slice(&buf[..len as usize]);
            if !key_name.to_lowercase().ends_with(".exe") {
                continue;
            }
            let sub = to_wide(&format!(
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\{key_name}"
            ));
            let mut sub_key = HKEY::default();
            if RegOpenKeyExW(root, PCWSTR(sub.as_ptr()), 0, KEY_READ, &mut sub_key).is_ok() {
                if let Some(raw_exe) = read_reg_sz(sub_key, "") {
                    let exe = expand_env_vars(&raw_exe);
                    if Path::new(&exe).exists() && !is_ignored_helper(&key_name, &exe) {
                        let nice = crate::state::read_file_description(&exe)
                            .filter(|d| !d.trim().is_empty())
                            .unwrap_or_else(|| {
                                key_name
                                    .strip_suffix(".exe")
                                    .or_else(|| key_name.strip_suffix(".EXE"))
                                    .unwrap_or(&key_name)
                                    .to_string()
                            });
                        let mut aliases = vec![nice.to_lowercase(), key_name.to_lowercase()];
                        add_alias_hints(&nice, &exe, &mut aliases);
                        let icon = extract_file_icon_data_url(&exe, 48, false)
                            .or_else(|| Some(default_svg_icon()));

                        out.push(AppItem {
                            id: make_app_id("apppath", &nice),
                            name: nice.clone(),
                            raw_name: nice,
                            app_type: "win32".to_string(),
                            launch: exe.to_lowercase(),
                            target: exe.to_lowercase(),
                            args: String::new(),
                            icon_location: String::new(),
                            publisher: String::new(),
                            version: String::new(),
                            aliases,
                            source: "registry-app-paths".to_string(),
                            last_discovered: now,
                            icon,
                        });
                    }
                }
                let _ = RegCloseKey(sub_key);
            }
        }
        let _ = RegCloseKey(hkey);
    }
}

#[cfg(windows)]
fn scan_uwp_apps(out: &mut Vec<AppItem>) {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
    let Ok(pm) = PackageManager::new() else {
        return;
    };
    let Ok(packages) = pm.FindPackagesByUserSecurityIdWithPackageTypes(&"".into(), PackageTypes::Main) else {
        return;
    };
    let now = Utc::now().timestamp_millis();

    for pkg in packages {
        let entries = match pkg
            .GetAppListEntries()
            .or_else(|_| pkg.GetAppListEntriesAsync()?.get())
        {
            Ok(e) => e,
            Err(_) => continue,
        };
        let family = pkg
            .Id()
            .ok()
            .and_then(|id| id.FamilyName().ok())
            .map(|s| s.to_string())
            .unwrap_or_default();

        for entry in entries {
            let Ok(info) = entry.DisplayInfo() else {
                continue;
            };
            let Ok(name_hs) = info.DisplayName() else {
                continue;
            };
            let name = name_hs.to_string().trim().to_string();
            if name.is_empty() {
                continue;
            }
            let aumid = entry
                .AppUserModelId()
                .ok()
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("{family}!App"));
            if aumid.trim().is_empty() {
                continue;
            }

            let mut aliases = vec![name.to_lowercase()];
            add_alias_hints(&name, &aumid, &mut aliases);

            out.push(AppItem {
                id: make_app_id("uwp", &name),
                name: name.clone(),
                raw_name: name,
                app_type: "uwp".to_string(),
                launch: aumid.clone(),
                target: aumid,
                args: String::new(),
                icon_location: String::new(),
                publisher: String::new(),
                version: String::new(),
                aliases,
                source: "uwp-store".to_string(),
                last_discovered: now,
                icon: Some(default_svg_icon()),
            });
        }
    }
}

fn discover_all_apps(_state: &SharedState) -> Vec<AppItem> {
    let mut raw: Vec<AppItem> = Vec::new();

    if let Ok(prog_data) = std::env::var("ProgramData") {
        scan_start_menu(&PathBuf::from(prog_data).join(r"Microsoft\Windows\Start Menu\Programs"), 0, &mut raw);
    }
    if let Some(roaming) = dirs::data_dir() {
        scan_start_menu(&roaming.join(r"Microsoft\Windows\Start Menu\Programs"), 0, &mut raw);
    }

    #[cfg(windows)]
    {
        scan_app_paths(HKEY_LOCAL_MACHINE, &mut raw);
        scan_app_paths(HKEY_CURRENT_USER, &mut raw);
        scan_uwp_apps(&mut raw);
    }

    // Deduplicate preferring Start Menu win32 entries with real icons
    let mut by_name: HashMap<String, AppItem> = HashMap::new();
    let mut seen_ids: HashSet<String> = HashSet::new();

    for mut item in raw {
        let key = item.name.to_lowercase();
        if let Some(existing) = by_name.get(&key) {
            let prefer_new = existing.app_type == "uwp" && item.app_type == "win32";
            if !prefer_new {
                continue;
            }
        }
        while !seen_ids.insert(item.id.clone()) {
            item.id = format!("{}_2", item.id);
        }
        by_name.insert(key, item);
    }

    let mut result: Vec<AppItem> = by_name.into_values().collect();
    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    result
}

fn load_favorites_file(state: &SharedState) -> FavoritesFile {
    fs::read_to_string(favorites_path(state))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_favorites_file(state: &SharedState, fav: &FavoritesFile) {
    if let Ok(bytes) = serde_json::to_vec_pretty(fav) {
        let _ = atomic_write_bytes(&favorites_path(state), &bytes);
    }
}

fn record_launch_history(state: &SharedState, target_key: &str) {
    let clean = target_key.trim().to_lowercase();
    if clean.is_empty() {
        return;
    }
    let mut fav = load_favorites_file(state);
    let entry = fav.history.entry(clean).or_default();
    entry.launch_count += 1;
    entry.last_launched = Utc::now().to_rfc3339();
    save_favorites_file(state, &fav);
}

#[tauri::command]
pub fn launcher_get_catalog() -> Vec<AppItem> {
    CATALOG.lock().map(|g| g.clone()).unwrap_or_default()
}

#[tauri::command]
pub fn launcher_reindex_catalog(state: tauri::State<'_, SharedState>) -> Value {
    let apps = discover_all_apps(&state);
    let count = apps.len();
    save_app_cache(&state, &apps);
    if let Ok(mut guard) = CATALOG.lock() {
        *guard = apps.clone();
    }
    json!({
        "success": true,
        "count": count,
        "catalog": apps
    })
}

fn score_app(app: &AppItem, query_lower: &str, fav_set: &HashSet<String>, history: &HashMap<String, LaunchStat>) -> i64 {
    let name_l = app.name.to_lowercase();
    let mut score = 0i64;

    if name_l == query_lower || app.aliases.iter().any(|a| a == query_lower) {
        score = 1000;
    } else if name_l.starts_with(query_lower) {
        score = 800;
    } else if name_l
        .split_whitespace()
        .any(|w| w.starts_with(query_lower))
    {
        score = 650;
    } else if app.aliases.iter().any(|a| a.starts_with(query_lower)) {
        score = 600;
    } else if name_l.contains(query_lower) || app.aliases.iter().any(|a| a.contains(query_lower)) {
        score = 400;
    } else {
        // Ordered subsequence match
        let mut qi = query_lower.chars().peekable();
        for ch in name_l.chars() {
            if qi.peek() == Some(&ch) {
                qi.next();
            }
        }
        if qi.peek().is_none() {
            score = 180;
        }
    }

    if score == 0 {
        return 0;
    }

    if fav_set.contains(&app.id) || fav_set.contains(&name_l) {
        score += 150;
    }
    if let Some(st) = history.get(&name_l).or_else(|| history.get(&app.launch)) {
        score += (st.launch_count.min(20) as i64) * 5;
    }
    score
}

#[tauri::command]
pub fn launcher_search_apps(
    state: tauri::State<'_, SharedState>,
    query: String,
    _options: Option<Value>,
) -> Vec<AppItem> {
    let catalog = launcher_get_catalog();
    let fav_file = load_favorites_file(&state);
    let fav_set: HashSet<String> = fav_file
        .favorites
        .iter()
        .map(|s| s.to_lowercase())
        .collect();

    let q = query.trim().to_lowercase();
    if q.is_empty() {
        let mut items = catalog;
        items.sort_by(|a, b| {
            let af = fav_set.contains(&a.id.to_lowercase()) || fav_set.contains(&a.name.to_lowercase());
            let bf = fav_set.contains(&b.id.to_lowercase()) || fav_set.contains(&b.name.to_lowercase());
            bf.cmp(&af).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });
        items.truncate(40);
        return items;
    }

    let mut scored: Vec<(i64, AppItem)> = catalog
        .into_iter()
        .filter_map(|app| {
            let s = score_app(&app, &q, &fav_set, &fav_file.history);
            (s > 0).then_some((s, app))
        })
        .collect();

    scored.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| a.1.name.to_lowercase().cmp(&b.1.name.to_lowercase())));
    scored.truncate(25);
    scored.into_iter().map(|(_, a)| a).collect()
}

pub fn launch_app_internal(target_str: &str) -> Result<(), String> {
    let clean = target_str.trim();
    if clean.is_empty() {
        return Err("Empty launch target".to_string());
    }

    // Look up matching app inside discovered catalog (exact id/name/launch/target or alias)
    let catalog = CATALOG.lock().map(|g| g.clone()).unwrap_or_default();
    if let Some(app) = catalog.iter().find(|a| {
        a.id == clean
            || a.name.eq_ignore_ascii_case(clean)
            || a.launch.eq_ignore_ascii_case(clean)
            || a.target.eq_ignore_ascii_case(clean)
            || a.aliases.iter().any(|al| al.eq_ignore_ascii_case(clean))
    }) {
        if app.app_type == "uwp" {
            std::process::Command::new("explorer.exe")
                .arg(format!("shell:AppsFolder\\{}", app.launch))
                .spawn()
                .map_err(|e| format!("Failed to launch UWP app: {e}"))?;
            return Ok(());
        }

        #[cfg(windows)]
        unsafe {
            let op = to_wide("open");
            let file = to_wide(&app.launch);
            let params = to_wide(&app.args);
            let params_ptr = if app.args.trim().is_empty() {
                PCWSTR::null()
            } else {
                PCWSTR(params.as_ptr())
            };
            let res = ShellExecuteW(
                HWND::default(),
                PCWSTR(op.as_ptr()),
                PCWSTR(file.as_ptr()),
                params_ptr,
                PCWSTR::null(),
                SW_SHOWNORMAL,
            );
            if (res.0 as isize) > 32 {
                return Ok(());
            }
        }
    }

    // Direct URL, URI scheme, exe alias, or ShellExecuteW fallback
    #[cfg(windows)]
    unsafe {
        let op = to_wide("open");
        let file = to_wide(clean);
        let res = ShellExecuteW(
            HWND::default(),
            PCWSTR(op.as_ptr()),
            PCWSTR(file.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        );
        if (res.0 as isize) > 32 {
            return Ok(());
        }
    }

    Err(format!("Unable to launch '{clean}'"))
}

#[tauri::command]
pub fn launcher_launch_app(state: tauri::State<'_, SharedState>, target: Value) -> Value {
    let (launch_str, history_key) = if let Some(s) = target.as_str() {
        (s.to_string(), s.to_string())
    } else {
        let l = target
            .get("launch")
            .or_else(|| target.get("target"))
            .or_else(|| target.get("id"))
            .or_else(|| target.get("name"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let name = target
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or(&l)
            .to_string();
        (l, name)
    };

    match launch_app_internal(&launch_str) {
        Ok(()) => {
            record_launch_history(&state, &history_key);
            json!({ "success": true })
        }
        Err(err) => json!({ "success": false, "error": err }),
    }
}

#[tauri::command]
pub fn launcher_get_running_windows(
    state: tauri::State<'_, SharedState>,
    _options: Option<Value>,
) -> Vec<RunningWindow> {
    #[cfg(windows)]
    unsafe {
        let own_pid = std::process::id();
        let mut raw: Vec<(isize, u32, String, bool)> = Vec::new();

        unsafe extern "system" fn cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let out = &mut *(lparam.0 as *mut Vec<(isize, u32, String, bool)>);
            if !IsWindowVisible(hwnd).as_bool() {
                return BOOL(1);
            }
            let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
            if (ex_style & WS_EX_TOOLWINDOW.0) != 0 {
                return BOOL(1);
            }
            let mut title_buf = [0u16; 512];
            let t_len = GetWindowTextW(hwnd, &mut title_buf);
            if t_len <= 0 {
                return BOOL(1);
            }
            let title = from_wide_slice(&title_buf[..t_len as usize]).trim().to_string();
            if title.is_empty()
                || title == "Program Manager"
                || title == "Windows Input Experience"
                || title == "Quick Pill"
            {
                return BOOL(1);
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            out.push((hwnd.0 as isize, pid, title, IsIconic(hwnd).as_bool()));
            BOOL(1)
        }

        let _ = EnumWindows(Some(cb), LPARAM(&mut raw as *mut _ as isize));

        raw.into_iter()
            .filter(|(_, pid, _, _)| *pid != own_pid)
            .map(|(h_wnd, pid, title, is_minimized)| {
                let mut exe_path = String::new();
                if pid > 0 {
                    if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                        let mut buf = vec![0u16; MAX_PATH as usize * 2];
                        let mut len = buf.len() as u32;
                        if QueryFullProcessImageNameW(
                            handle,
                            PROCESS_NAME_FORMAT(0),
                            windows::core::PWSTR(buf.as_mut_ptr()),
                            &mut len,
                        )
                        .is_ok()
                        {
                            exe_path = from_wide_slice(&buf[..len as usize]);
                        }
                        let _ = CloseHandle(handle);
                    }
                }
                let process_name = Path::new(&exe_path)
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("App")
                    .to_string();

                let icon = if !exe_path.is_empty() {
                    let cached = state
                        .icon_cache
                        .lock()
                        .ok()
                        .and_then(|c| c.get(&exe_path).cloned());
                    if cached.is_some() {
                        cached
                    } else {
                        let extracted = extract_file_icon_data_url(&exe_path, 32, false);
                        if let Some(ref url) = extracted {
                            if let Ok(mut c) = state.icon_cache.lock() {
                                c.insert(exe_path.clone(), url.clone());
                            }
                        }
                        extracted
                    }
                } else {
                    None
                };

                RunningWindow {
                    h_wnd,
                    pid,
                    title,
                    process_name,
                    exe_path,
                    icon,
                    is_minimized,
                }
            })
            .collect()
    }
    #[cfg(not(windows))]
    Vec::new()
}

#[cfg(windows)]
fn focus_hwnd_force(hwnd_raw: isize) -> bool {
    if hwnd_raw == 0 {
        return false;
    }
    unsafe {
        let hwnd = HWND(hwnd_raw as *mut std::ffi::c_void);
        if !IsWindow(hwnd).as_bool() {
            return false;
        }
        if IsIconic(hwnd).as_bool() {
            let _ = ShowWindow(hwnd, SW_RESTORE);
        } else {
            let _ = ShowWindow(hwnd, SW_SHOW);
        }
        let fg = GetForegroundWindow();
        let fg_tid = if !fg.0.is_null() {
            GetWindowThreadProcessId(fg, None)
        } else {
            0
        };
        let curr_tid = GetCurrentThreadId();
        if fg_tid != 0 && fg_tid != curr_tid {
            let _ = AttachThreadInput(curr_tid, fg_tid, true);
        }
        let _ = BringWindowToTop(hwnd);
        let ok = SetForegroundWindow(hwnd).as_bool();
        if fg_tid != 0 && fg_tid != curr_tid {
            let _ = AttachThreadInput(curr_tid, fg_tid, false);
        }
        ok
    }
}

pub fn activate_window_by_query(query: &str) -> bool {
    #[cfg(windows)]
    unsafe {
        let q = query.to_lowercase();
        let mut matched: isize = 0;

        unsafe extern "system" fn find_cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let (q_ptr, out_ptr) = &mut *(lparam.0 as *mut (&str, &mut isize));
            if !IsWindowVisible(hwnd).as_bool() {
                return BOOL(1);
            }
            let mut buf = [0u16; 512];
            let len = GetWindowTextW(hwnd, &mut buf);
            if len > 0 {
                let title = from_wide_slice(&buf[..len as usize]).to_lowercase();
                if title.contains(*q_ptr) {
                    **out_ptr = hwnd.0 as isize;
                    return BOOL(0);
                }
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            if pid > 0 {
                if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                    let mut pbuf = vec![0u16; MAX_PATH as usize];
                    let mut plen = pbuf.len() as u32;
                    let ok = QueryFullProcessImageNameW(
                        handle,
                        PROCESS_NAME_FORMAT(0),
                        windows::core::PWSTR(pbuf.as_mut_ptr()),
                        &mut plen,
                    )
                    .is_ok();
                    let _ = CloseHandle(handle);
                    if ok {
                        let exe = from_wide_slice(&pbuf[..plen as usize]).to_lowercase();
                        if exe.contains(*q_ptr) {
                            **out_ptr = hwnd.0 as isize;
                            return BOOL(0);
                        }
                    }
                }
            }
            BOOL(1)
        }

        let mut pair = (q.as_str(), &mut matched);
        let _ = EnumWindows(Some(find_cb), LPARAM(&mut pair as *mut _ as isize));
        if matched != 0 {
            return focus_hwnd_force(matched);
        }
    }
    false
}

#[tauri::command]
pub fn launcher_activate_window(app: AppHandle, h_wnd: isize) -> Value {
    #[cfg(windows)]
    let ok = focus_hwnd_force(h_wnd);
    #[cfg(not(windows))]
    let ok = false;

    if ok {
        let _ = app.emit("launcher:window-activated", h_wnd);
    }
    json!({ "success": ok })
}

#[tauri::command]
pub fn launcher_get_favorites(state: tauri::State<'_, SharedState>) -> Vec<String> {
    load_favorites_file(&state).favorites
}

#[tauri::command]
pub fn launcher_set_favorites(
    state: tauri::State<'_, SharedState>,
    favorites: Vec<String>,
) -> Vec<String> {
    let mut fav_file = load_favorites_file(&state);
    fav_file.favorites = favorites.clone();
    save_favorites_file(&state, &fav_file);
    favorites
}

fn load_workspaces_list(state: &SharedState) -> Vec<Workspace> {
    if let Ok(raw) = fs::read_to_string(workspaces_path(state)) {
        if let Ok(ws) = serde_json::from_str::<Vec<Workspace>>(&raw) {
            if !ws.is_empty() {
                return ws;
            }
        }
    }
    let now = Utc::now().to_rfc3339();
    vec![Workspace {
        id: "ws-development".to_string(),
        name: "Development".to_string(),
        icon: "Code".to_string(),
        color: "#3B82F6".to_string(),
        pinned_apps: Vec::new(),
        launch_profile: vec![
            WorkspaceLaunchEntry {
                id: "dev-1".to_string(),
                name: "Visual Studio Code".to_string(),
                entry_type: "app".to_string(),
                target: "code".to_string(),
                args: Vec::new(),
                enabled: true,
            },
            WorkspaceLaunchEntry {
                id: "dev-2".to_string(),
                name: "GitHub".to_string(),
                entry_type: "url".to_string(),
                target: "https://github.com".to_string(),
                args: Vec::new(),
                enabled: true,
            },
        ],
        created_at: now.clone(),
        updated_at: now,
    }]
}

fn save_workspaces_list(state: &SharedState, list: &[Workspace]) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(list).map_err(|e| format!("Serialize workspaces: {e}"))?;
    atomic_write_bytes(&workspaces_path(state), &bytes)
}

#[tauri::command]
pub fn workspaces_get_all(state: tauri::State<'_, SharedState>) -> Vec<Workspace> {
    load_workspaces_list(&state)
}

#[tauri::command]
pub fn workspaces_save(
    state: tauri::State<'_, SharedState>,
    workspace: Value,
) -> Result<Value, String> {
    let mut list = load_workspaces_list(&state);
    let now = Utc::now().to_rfc3339();

    let mut ws: Workspace = serde_json::from_value(workspace)
        .map_err(|e| format!("Invalid workspace payload: {e}"))?;

    if ws.id.trim().is_empty() {
        ws.id = format!("ws-{}", uuid::Uuid::new_v4());
    }
    if ws.created_at.trim().is_empty() {
        ws.created_at = now.clone();
    }
    ws.updated_at = now;

    if let Some(pos) = list.iter().position(|w| w.id == ws.id) {
        list[pos] = ws.clone();
    } else {
        list.push(ws.clone());
    }

    save_workspaces_list(&state, &list)?;
    Ok(json!({ "success": true, "workspace": ws }))
}

#[tauri::command]
pub fn workspaces_delete(
    state: tauri::State<'_, SharedState>,
    id: String,
) -> Result<Value, String> {
    let mut list = load_workspaces_list(&state);
    list.retain(|w| w.id != id);
    save_workspaces_list(&state, &list)?;
    Ok(json!({ "success": true }))
}

#[tauri::command]
pub fn workspaces_launch(
    state: tauri::State<'_, SharedState>,
    id: String,
    _options: Option<Value>,
) -> Value {
    let list = load_workspaces_list(&state);
    let Some(ws) = list.into_iter().find(|w| w.id == id) else {
        return json!({ "success": false, "launchedCount": 0, "results": [] });
    };

    let mut launched_count = 0usize;
    let mut results = Vec::new();
    for entry in ws.launch_profile {
        if !entry.enabled {
            continue;
        }
        let res = launch_app_internal(&entry.target);
        if res.is_ok() {
            launched_count += 1;
            record_launch_history(&state, &entry.target);
        }
        results.push(json!({
            "id": entry.id,
            "name": entry.name,
            "success": res.is_ok(),
            "error": res.err()
        }));
    }

    json!({
        "success": true,
        "launchedCount": launched_count,
        "results": results
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn launcher_scoring_prefers_exact_and_prefix_over_fuzzy() {
        let now = Utc::now().timestamp_millis();
        let make = |name: &str| AppItem {
            id: make_app_id("win32", name),
            name: name.to_string(),
            raw_name: name.to_string(),
            app_type: "win32".into(),
            launch: format!("{name}.exe"),
            target: format!("{name}.exe"),
            args: String::new(),
            icon_location: String::new(),
            publisher: String::new(),
            version: String::new(),
            aliases: vec![],
            source: "start-menu".into(),
            last_discovered: now,
            icon: None,
        };
        let favs = HashSet::new();
        let hist = HashMap::new();

        let s_exact = score_app(&make("Code"), "code", &favs, &hist);
        let s_word = score_app(&make("Visual Studio Code"), "code", &favs, &hist);
        let s_sub = score_app(&make("Decoder"), "code", &favs, &hist);
        assert!(s_exact > s_word);
        assert!(s_word > s_sub);
        assert!(s_sub > 0);
    }
}
