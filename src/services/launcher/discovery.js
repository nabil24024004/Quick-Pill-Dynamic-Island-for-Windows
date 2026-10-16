"use strict";

const fs = require("fs");
const path = require("path");
const { exec, execFile } = require("child_process");

/**
 * Normalizes an executable path by stripping quotes, icon indices,
 * expanding environment variables, and converting to standard backslashes.
 * @param {string} pathStr
 * @returns {string}
 */
function normalizeExePath(pathStr) {
  if (!pathStr || typeof pathStr !== "string") return "";

  let cleaned = pathStr.trim();

  // Strip trailing icon index e.g., ",0" or ",-1"
  cleaned = cleaned.replace(/,\s*-?\d+$/, "").trim();

  // Strip leading and trailing quotes
  cleaned = cleaned.replace(/^["']+|["']+$/g, "").trim();

  // Expand %ENV_VAR%
  cleaned = cleaned.replace(/%([^%]+)%/g, (_, varName) => {
    return process.env[varName] || process.env[varName.toUpperCase()] || `%${varName}%`;
  });

  // Normalize slashes to backslashes
  cleaned = cleaned.replace(/\//g, "\\");

  return cleaned.toLowerCase();
}

/**
 * Normalizes an application name by stripping architecture tags and version strings.
 * e.g., "Google Chrome (64-bit)" -> "Google Chrome", "Upscayl 2.15.0" -> "Upscayl"
 * @param {string} nameStr
 * @returns {string}
 */
function normalizeAppName(nameStr) {
  if (!nameStr || typeof nameStr !== "string") return "";

  let name = nameStr.trim();

  // Strip architecture tags like (64-bit), (x86), [x64], etc.
  name = name.replace(/\s*[\(\[]\s*(?:64-bit|32-bit|x86|x64|arm64)\s*[\)\]]/gi, "");

  // Strip trailing version patterns like " 2.15.0", " v1.4.2", " 2024"
  name = name.replace(/\s+v?\d+(?:\.\d+)+(?:-[a-z0-9.]+)?$/i, "");

  // Normalize whitespace
  name = name.replace(/\s+/g, " ").trim();

  return name || nameStr.trim();
}

/**
 * Scans Windows Start Menu shortcut (.lnk) files.
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
async function scanStartMenu(options = {}) {
  if (options.mockShortcuts) {
    return options.mockShortcuts;
  }

  if (process.platform !== "win32") {
    return [];
  }

  const dirs = options.startMenuDirs || [
    path.join(process.env.ProgramData || "C:\\ProgramData", "Microsoft\\Windows\\Start Menu\\Programs"),
    path.join(process.env.APPDATA || "", "Microsoft\\Windows\\Start Menu\\Programs")
  ];

  return new Promise((resolve) => {
    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$shell = New-Object -ComObject WScript.Shell
$dirs = @(${dirs.map(d => `"${d.replace(/"/g, '`"')}"`).join(",")})
$results = [System.Collections.Generic.List[object]]::new()

foreach ($dir in $dirs) {
  if (-not (Test-Path $dir)) { continue }
  Get-ChildItem -LiteralPath $dir -Recurse -Filter '*.lnk' -File -EA SilentlyContinue | ForEach-Object {
    try {
      $sc = $shell.CreateShortcut($_.FullName)
      $target = $sc.TargetPath
      if ($target -and ($target.EndsWith('.exe') -or $target.EndsWith('.cmd') -or $target.EndsWith('.bat') -or $target.EndsWith('.ps1'))) {
        if ($target -notmatch '\\\\(?:unins(?:tall)?(?:000)?|update)\\.exe$' -and $_.BaseName -notmatch '(?i)uninstall|readme|help') {
          $rawIconLoc = $sc.IconLocation
          $validIconLoc = ''
          if ($rawIconLoc) {
            $cleaned = ($rawIconLoc -replace ',\s*-?\d+$', '').Trim(' "', "'")
            if ($cleaned -and (Test-Path -LiteralPath $cleaned -PathType Leaf)) {
              $validIconLoc = $rawIconLoc
            }
          }
          $results.Add([PSCustomObject]@{
            name = $_.BaseName
            lnkPath = $_.FullName
            target = $target
            args = $sc.Arguments
            iconLocation = $validIconLoc
            type = 'win32'
            source = 'start-menu'
          })
        }
      }
    } catch {}
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`;
    const enc = Buffer.from(script, "utf16le").toString("base64");
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${enc}`,
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout) return resolve([]);
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(Array.isArray(parsed) ? parsed : parsed ? [parsed] : []);
        } catch {
          resolve([]);
        }
      }
    );
  });
}

/**
 * Scans Windows Registry uninstall hives for desktop applications.
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
async function scanRegistry(options = {}) {
  if (options.mockRegistry) {
    return options.mockRegistry;
  }

  if (process.platform !== "win32") {
    return [];
  }

  return new Promise((resolve) => {
    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$hives = @(
  "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKCU:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
)
$results = [System.Collections.Generic.List[object]]::new()

foreach ($hive in $hives) {
  Get-ItemProperty $hive -EA SilentlyContinue | ForEach-Object {
    if ($_.DisplayName -and -not $_.SystemComponent -and -not $_.ParentKeyName -and ($_.DisplayName -notmatch '^KB\\d+')) {
      $results.Add([PSCustomObject]@{
        name = $_.DisplayName
        displayIcon = $_.DisplayIcon
        installLocation = $_.InstallLocation
        publisher = $_.Publisher
        version = $_.DisplayVersion
        uninstallString = $_.UninstallString
        source = 'registry'
      })
    }
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`;
    const enc = Buffer.from(script, "utf16le").toString("base64");
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${enc}`,
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout) return resolve([]);
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(Array.isArray(parsed) ? parsed : parsed ? [parsed] : []);
        } catch {
          resolve([]);
        }
      }
    );
  });
}

/**
 * Scans Windows App Paths registry keys for registered application aliases.
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
async function scanAppPaths(options = {}) {
  if (options.mockAppPaths) {
    return options.mockAppPaths;
  }

  if (process.platform !== "win32") {
    return [];
  }

  return new Promise((resolve) => {
    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$hives = @(
  "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\*",
  "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\*"
)
$results = [System.Collections.Generic.List[object]]::new()

foreach ($hive in $hives) {
  Get-ItemProperty $hive -EA SilentlyContinue | ForEach-Object {
    $alias = Split-Path $_.PSPath -Leaf
    $target = $_.'(default)'
    if ($target -and $alias) {
      $results.Add([PSCustomObject]@{
        alias = $alias
        target = $target
        path = $_.Path
        source = 'app-paths'
      })
    }
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`;
    const enc = Buffer.from(script, "utf16le").toString("base64");
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${enc}`,
      { maxBuffer: 5 * 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout) return resolve([]);
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(Array.isArray(parsed) ? parsed : parsed ? [parsed] : []);
        } catch {
          resolve([]);
        }
      }
    );
  });
}

/**
 * Scans Packaged UWP Applications via Get-StartApps.
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
async function scanUWP(options = {}) {
  if (options.mockUWP) {
    return options.mockUWP;
  }

  if (process.platform !== "win32") {
    return [];
  }

  return new Promise((resolve) => {
    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$results = [System.Collections.Generic.List[object]]::new()
Get-StartApps -EA SilentlyContinue | ForEach-Object {
  if ($_.AppID -match '.+!.+') {
    $results.Add([PSCustomObject]@{
      name = $_.Name
      appId = $_.AppID
      type = 'uwp'
      source = 'uwp'
    })
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`;
    const enc = Buffer.from(script, "utf16le").toString("base64");
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${enc}`,
      { maxBuffer: 5 * 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout) return resolve([]);
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(Array.isArray(parsed) ? parsed : parsed ? [parsed] : []);
        } catch {
          resolve([]);
        }
      }
    );
  });
}

/**
 * Deduplicates raw application entries from Start Menu, Registry, App Paths, and UWP.
 * Merges metadata: Start Menu provides canonical user-friendly names, Registry provides
 * publisher and version, App Paths provides executable aliases.
 * @param {Array<Object>} rawApps
 * @returns {Array<Object>}
 */
function deduplicateCatalog(rawApps = []) {
  if (!Array.isArray(rawApps)) return [];

  // Map keyed by canonical executable path for Win32
  const win32Map = new Map();
  // Map keyed by appId for UWP
  const uwpMap = new Map();

  for (const raw of rawApps) {
    if (!raw || typeof raw !== "object") continue;

    // Handle UWP apps
    if (raw.type === "uwp" || raw.appId) {
      const appId = (raw.appId || "").trim();
      if (!appId) continue;
      const key = appId.toLowerCase();

      if (!uwpMap.has(key)) {
        const cleanName = normalizeAppName(raw.name || appId);
        uwpMap.set(key, {
          id: `uwp-${key.replace(/[^a-z0-9_-]/g, "_")}`,
          name: cleanName,
          rawName: raw.name || cleanName,
          type: "uwp",
          launch: `shell:AppsFolder\\${appId}`,
          appId,
          target: `shell:AppsFolder\\${appId}`,
          publisher: raw.publisher || "",
          version: raw.version || "",
          aliases: [cleanName.toLowerCase(), appId.toLowerCase()],
          source: raw.source || "uwp",
          lastDiscovered: Date.now()
        });
      }
      continue;
    }

    // Handle App Paths aliases
    if (raw.source === "app-paths") {
      const targetPath = normalizeExePath(raw.target);
      if (!targetPath) continue;

      if (win32Map.has(targetPath)) {
        const existing = win32Map.get(targetPath);
        if (raw.alias && !existing.aliases.includes(raw.alias.toLowerCase())) {
          existing.aliases.push(raw.alias.toLowerCase());
        }
      } else {
        const baseExe = path.basename(targetPath);
        const appName = normalizeAppName(raw.alias ? raw.alias.replace(/\.exe$/i, "") : baseExe.replace(/\.exe$/i, ""));
        win32Map.set(targetPath, {
          id: `win32-${appName.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`,
          name: appName,
          rawName: raw.alias || appName,
          type: "win32",
          launch: targetPath,
          target: targetPath,
          args: "",
          iconLocation: targetPath,
          publisher: "",
          version: "",
          aliases: raw.alias ? [raw.alias.toLowerCase(), baseExe.toLowerCase()] : [baseExe.toLowerCase()],
          source: "app-paths",
          lastDiscovered: Date.now()
        });
      }
      continue;
    }

    // Handle Registry entries
    if (raw.source === "registry") {
      let targetPath = "";
      if (raw.displayIcon) {
        targetPath = normalizeExePath(raw.displayIcon);
      }
      if (!targetPath && raw.installLocation) {
        // If no explicit exe, we can't reliably launch it directly
        continue;
      }
      if (!targetPath || !targetPath.endsWith(".exe")) continue;

      if (win32Map.has(targetPath)) {
        const existing = win32Map.get(targetPath);
        if (!existing.publisher && raw.publisher) existing.publisher = raw.publisher;
        if (!existing.version && raw.version) existing.version = raw.version;
      } else {
        const appName = normalizeAppName(raw.name);
        if (!appName) continue;
        const baseExe = path.basename(targetPath).toLowerCase();
        win32Map.set(targetPath, {
          id: `win32-${appName.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`,
          name: appName,
          rawName: raw.name || appName,
          type: "win32",
          launch: targetPath,
          target: targetPath,
          args: "",
          iconLocation: raw.displayIcon || targetPath,
          publisher: raw.publisher || "",
          version: raw.version || "",
          aliases: [appName.toLowerCase(), baseExe],
          source: "registry",
          lastDiscovered: Date.now()
        });
      }
      continue;
    }

    // Handle Start Menu entries
    const targetPath = normalizeExePath(raw.target || raw.path);
    if (!targetPath) continue;

    const baseExe = path.basename(targetPath).toLowerCase();
    const appName = normalizeAppName(raw.name);

    if (win32Map.has(targetPath)) {
      const existing = win32Map.get(targetPath);
      // Start Menu has the most user-friendly names
      existing.name = appName;
      if (raw.args && !existing.args) existing.args = raw.args;
      if (raw.iconLocation && !existing.iconLocation) existing.iconLocation = raw.iconLocation;
      if (!existing.aliases.includes(appName.toLowerCase())) {
        existing.aliases.push(appName.toLowerCase());
      }
      if (!existing.aliases.includes(baseExe)) {
        existing.aliases.push(baseExe);
      }
    } else {
      win32Map.set(targetPath, {
        id: `win32-${appName.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`,
        name: appName,
        rawName: raw.name || appName,
        type: "win32",
        launch: targetPath,
        target: targetPath,
        args: raw.args || "",
        iconLocation: raw.iconLocation || targetPath,
        publisher: raw.publisher || "",
        version: raw.version || "",
        aliases: [appName.toLowerCase(), baseExe],
        source: "start-menu",
        lastDiscovered: Date.now()
      });
    }
  }

  const combined = [...win32Map.values(), ...uwpMap.values()];

  // Sort alphabetically by name
  return combined.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * High-level coordinator that runs all discovery scanners concurrently.
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
async function discoverAllApplications(options = {}) {
  const [startMenuRes, registryRes, appPathsRes, uwpRes] = await Promise.allSettled([
    scanStartMenu(options),
    scanRegistry(options),
    scanAppPaths(options),
    scanUWP(options)
  ]);

  const raw = [
    ...(startMenuRes.status === "fulfilled" ? startMenuRes.value : []),
    ...(registryRes.status === "fulfilled" ? registryRes.value : []),
    ...(appPathsRes.status === "fulfilled" ? appPathsRes.value : []),
    ...(uwpRes.status === "fulfilled" ? uwpRes.value : [])
  ];

  return deduplicateCatalog(raw);
}

class AppDiscovery {
  constructor(options = {}) {
    this.options = options;
    this.cachedCatalog = [];
  }

  async getCatalog() {
    if (this.cachedCatalog && this.cachedCatalog.length > 0) {
      return this.cachedCatalog;
    }
    this.cachedCatalog = await discoverAllApplications(this.options);
    return this.cachedCatalog;
  }

  async reindex() {
    this.cachedCatalog = await discoverAllApplications(this.options);
    return this.cachedCatalog.length;
  }

  destroy() {
    this.cachedCatalog = [];
  }
}

module.exports = {
  AppDiscovery,
  discoverAllApplications,
  scanStartMenu,
  scanRegistry,
  scanAppPaths,
  scanUWP,
  deduplicateCatalog,
  normalizeExePath,
  normalizeAppName
};
