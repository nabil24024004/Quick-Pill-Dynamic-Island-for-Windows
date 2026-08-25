"use strict";
const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  shell,
  Tray,
  Menu,
  nativeImage,
  clipboard
} = require("electron");
const path = require("node:path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const http = require("http");
const crypto = require("crypto");
const { EventEmitter } = require("events");

if (process.platform === "linux") {
  app.commandLine.appendSwitch("enable-transparent-visuals");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.disableHardwareAcceleration();
}
let tray = null;
let mainWindow = null;

// --- Logging System ---
function getLogFilePath() {
  try {
    return path.join(app.getPath("userData"), "quick-pill.log");
  } catch (_) {
    return path.join(process.cwd(), "quick-pill.log");
  }
}

function logToFile(msg, err = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${msg}${err ? ` | Error: ${err.stack || err}` : ""}\n`;
  console.log(logLine.trim());
  try {
    const logPath = getLogFilePath();
    fs.appendFileSync(logPath, logLine, "utf8");
  } catch (_) {}
}

process.on("uncaughtException", (err) => {
  logToFile("UNCAUGHT EXCEPTION (Main Process)", err);
});

process.on("unhandledRejection", (reason) => {
  logToFile("UNHANDLED REJECTION (Main Process)", reason);
});

const { exec, execFile, spawn } = require('child_process');

function getPowershellEncodedCommand(script) {
  return Buffer.from(script, "utf16le").toString("base64");
}

// --- App discovery providers ---

// Scans Start Menu .lnk files and resolves them to Win32 exe paths.
// Skips shortcuts targeting explorer.exe (UWP launchers) or WindowsApps.
function discoverStartMenu() {
  return new Promise((resolve) => {
    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$shell   = New-Object -ComObject WScript.Shell
$dirs    = @("$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs","$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs")
$results = [System.Collections.Generic.List[object]]::new()
foreach ($dir in $dirs) {
  if (-not (Test-Path $dir)) { continue }
  Get-ChildItem $dir -Recurse -Filter '*.lnk' -EA SilentlyContinue | ForEach-Object {
    try {
      $target = $shell.CreateShortcut($_.FullName).TargetPath
      if ($target -and $target.EndsWith('.exe') -and
          $target -notlike '*\\\\explorer.exe' -and
          $target -notmatch 'WindowsApps' -and
          (Test-Path $target -EA SilentlyContinue)) {
        $results.Add([PSCustomObject]@{ name = $_.BaseName; type = 'win32'; path = $target })
      }
    } catch {}
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`;
    const enc = Buffer.from(script, "utf16le").toString("base64");
    exec(
      `powershell -NoProfile -EncodedCommand ${enc}`,
      { maxBuffer: 5 * 1024 * 1024 },
      (err, out) => {
        if (err || !out) return resolve([]);
        try {
          const d = JSON.parse(out.trim());
          resolve(Array.isArray(d) ? d : d ? [d] : []);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

// Gets UWP / Store apps via Get-StartApps.
// UWP entries have AppID in the form PackageFamilyName!AppId (contains '!').
function discoverUWP() {
  return new Promise((resolve) => {
    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$results = [System.Collections.Generic.List[object]]::new()
Get-StartApps -EA SilentlyContinue | ForEach-Object {
  if ($_.AppID -match '.+!.+') {
    $results.Add([PSCustomObject]@{ name = $_.Name; type = 'uwp'; appId = $_.AppID })
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`;
    const enc = Buffer.from(script, "utf16le").toString("base64");
    exec(
      `powershell -NoProfile -EncodedCommand ${enc}`,
      { maxBuffer: 2 * 1024 * 1024 },
      (err, out) => {
        if (err || !out) return resolve([]);
        try {
          const d = JSON.parse(out.trim());
          resolve(Array.isArray(d) ? d : d ? [d] : []);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

// Converts provider-specific shapes to { name, launch } and deduplicates.
// win32: launch = exe path   |   uwp: launch = shell:AppsFolder\\appId
async function buildCache() {
  const [startMenu, uwp] = await Promise.all([
    discoverStartMenu(),
    discoverUWP(),
  ]);
  const seen = new Set();
  const entries = [];
  for (const item of [...startMenu, ...uwp]) {
    if (!item.name || !(item.path || item.appId)) continue;
    const launch =
      item.type === "uwp" ? `shell:AppsFolder\\${item.appId}` : item.path;
    const key = launch.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      entries.push({ name: item.name, launch });
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

// Tokenizes an argument string, correctly handling mid-token quotes.
// --flag="hello world"  ->  ['--flag=hello world']
// "quoted arg" --bare   ->  ['quoted arg', '--bare']
function tokenizeArgs(str) {
  const args = [];
  let i = 0;
  while (i < str.length) {
    while (i < str.length && /\s/.test(str[i])) i++;
    if (i >= str.length) break;
    let token = "";
    while (i < str.length && !/\s/.test(str[i])) {
      if (str[i] === '"') {
        i++;
        while (i < str.length && str[i] !== '"') token += str[i++];
        if (i < str.length) i++; // consume closing quote
      } else {
        token += str[i++];
      }
    }
    if (token) args.push(token);
  }
  return args;
}

// Parses a Windows command string into { exe, args }.
// Normalizes forward slashes and expands %ENV_VAR% before splitting.
function parseCommand(input) {
  const prepared = input
    .replace(/\//g, "\\")
    .replace(/%([^%]+)%/g, (_, v) => process.env[v] || `%${v}%`);

  // Quoted exe path: "C:\path with spaces\app.exe" [args...]
  const quotedMatch = prepared.match(/^"([^"]+)"(.*)/);
  if (quotedMatch) {
    return {
      exe: quotedMatch[1],
      args: quotedMatch[2].trim() ? tokenizeArgs(quotedMatch[2].trim()) : [],
    };
  }

  // Unquoted path: find exe boundary by known extension so that spaces inside
  // the path (C:\Program Files\...) don't cause premature splitting.
  const extMatch = prepared.match(
    /^(.+?\.(?:exe|cmd|bat|com|ps1))(?:\s+(.*))?$/i,
  );
  if (extMatch) {
    return {
      exe: extMatch[1],
      args: extMatch[2] ? tokenizeArgs(extMatch[2]) : [],
    };
  }

  // No recognised extension (e.g. cmd, wt) — split on first whitespace.
  const spaceIdx = prepared.search(/\s/);
  if (spaceIdx === -1) return { exe: prepared, args: [] };
  return {
    exe: prepared.slice(0, spaceIdx),
    args: tokenizeArgs(prepared.slice(spaceIdx + 1).trim()),
  };
}

// --- Launch abstraction ---
function launchWindows(input) {
  const trimmed = input.trim();

  // UWP apps and schemes
  if (trimmed.startsWith("shell:")) {
    const safe = trimmed.replace(/'/g, "''");
    exec(
      `powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${safe}'"`,
    );
    return;
  }

  // Paths with slashes (ex: C:\Program Files\App.exe)
  if (/[\\\/]/.test(trimmed)) {
    const { exe, args } = parseCommand(trimmed);

    // If no arguments, use native OS approach for best compatibility
    if (args.length === 0) {
      if (exe.toLowerCase().endsWith(".url")) {
        try {
          const content = fs.readFileSync(exe, "utf8");
          const m = content.match(/^URL=(.+)$/im);
          if (m) shell.openExternal(m[1].trim());
        } catch {}
        return;
      }
      shell.openPath(exe).then((err) => {
        if (err) exec(`start "" "${exe}"`);
      });
      return;
    }

    // Arguments provided - spawn exactly to prevent execution escaping vulnerabilities
    const finalExe = /[\\/]/.test(exe) && !/\.[^\\.]+$/.test(exe) ? exe + ".exe" : exe;

    // cmd / bat scripts must run via cmd.exe
    if (/\.(cmd|bat)$/i.test(finalExe)) {
      const child = spawn("cmd.exe", ["/c", finalExe, ...args], {
        shell: false,
        detached: true,
        stdio: "ignore",
      });
      child.on("error", () => {});
      child.unref();
      return;
    }

    // powershell scripts
    if (/\.ps1$/i.test(finalExe)) {
      const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", finalExe, ...args],
        { shell: false, detached: true, stdio: "ignore" },
      );
      child.on("error", () => {});
      child.unref();
      return;
    }

    const child = spawn(finalExe, args, {
      shell: false,
      detached: true,
      stdio: "ignore",
    });
    child.on("error", () => {}); 
    child.unref();
    return;
  }

  // App Paths or raw executables
  if (trimmed.includes(" ")) {
    const safe = trimmed.replace(/'/g, "''");
    exec(
      `powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${safe}'"`,
    );
  } else {
    exec(`start "" ${trimmed}`);
  }
}

ipcMain.handle("log-message", (event, level, msg, details) => {
  logToFile(`[RENDERER ${String(level).toUpperCase()}] ${msg} ${details ? JSON.stringify(details) : ""}`);
});

ipcMain.handle("set-ignore-mouse-events", (event, ignore, forward) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      if (process.platform !== "linux") {
        const useForward = forward !== undefined ? forward : ignore;
        mainWindow.setIgnoreMouseEvents(ignore, { forward: useForward });
        logToFile(`setIgnoreMouseEvents(${ignore}, forward=${useForward}) executed`);
      } else {
        mainWindow.setIgnoreMouseEvents(ignore);
        logToFile(`setIgnoreMouseEvents(${ignore}) executed (linux)`);
      }
    } catch (e) {
      logToFile("Error in setIgnoreMouseEvents, falling back to forward=true", e);
      try {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
      } catch (_) {}
    }
  }
});

ipcMain.handle("focus-window", () => {
  if (mainWindow) {
    mainWindow.focus();
  }
});

ipcMain.handle("open-external", async (event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle("launch-app", async (event, appName) => {
  const platform = process.platform;
  if (platform === "darwin") {
    exec(`open -a "${appName}"`);
  } else if (platform === "win32") {
    launchWindows(appName);
  } else {
    exec(appName);
  }
});

ipcMain.handle("build-app-cache", async () => {
  if (process.platform !== "win32") return;
  const cacheFile = path.join(app.getPath("userData"), "app-cache.json");
  try {
    const entries = await buildCache();
    fs.writeFileSync(cacheFile, JSON.stringify(entries));
  } catch {
    // Silently ignore cache build failures
  }
});

ipcMain.handle("search-apps", async (event, query) => {
  if (process.platform !== "win32" || !query) return [];
  const cacheFile = path.join(app.getPath("userData"), "app-cache.json");
  try {
    if (!fs.existsSync(cacheFile)) return [];
    const data = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    const q = query.toLowerCase();
    return data
      .filter((a) => a.name && a.name.toLowerCase().includes(q))
      .slice(0, 8);
  } catch {
    return [];
  }
});

ipcMain.handle("get-displays", () => {
  const displays = screen.getAllDisplays();
  return displays.map((d) => ({
    id: d.id,
    label: d.label || `Display ${d.id}`,
    bounds: d.bounds,
  }));
});

ipcMain.handle("set-display", (event, displayId) => {
  if (mainWindow) {
    const displays = screen.getAllDisplays();
    const targetDisplay =
      displays.find((d) => d.id.toString() === displayId.toString()) ||
      screen.getPrimaryDisplay();

    const { x, y, width, height } = targetDisplay.bounds;
    const isLinux = process.platform === "linux";

    mainWindow.setBounds({ x, y, width, height });
    if (!isLinux) {
      // Avoid setFullScreen to prevent covering taskbars and causing focus issues
      // mainWindow.setFullScreen(true);
    }

    mainWindow.show();
  }
});

// update-window-position: intentionally a no-op.
// The island is positioned via CSS (position:fixed, left:X%, top:Ypx) inside a full-screen
// transparent overlay, so no OS window move is needed. The IPC call is kept for potential
// future use (e.g. shrinking the overlay window to a smaller bounding box).
ipcMain.handle("update-window-position", (event, xPerc, yPx) => {});

ipcMain.handle("set-auto-launch", (event, enable) => {
  if (process.platform === "linux") {
    const autostartPath = path.join(
      app.getPath("home"),
      ".config",
      "autostart",
    );
    const desktopFilePath = path.join(autostartPath, "quick-pill.desktop");

    try {
      if (enable) {
        if (!fs.existsSync(autostartPath)) {
          fs.mkdirSync(autostartPath, { recursive: true });
        }
        const desktopFileContent = `[Desktop Entry]
Type=Application
Version=1.0
Name=Quick Pill
Comment=Quick Pill Desktop Assistant
Exec="${app.getPath("exe")}"
Icon=${getIconPath()}
Terminal=false
`;
        fs.writeFileSync(desktopFilePath, desktopFileContent);
      } else {
        if (fs.existsSync(desktopFilePath)) {
          fs.unlinkSync(desktopFilePath);
        }
      }
    } catch (e) {
      console.error("Failed to set auto-launch on Linux:", e);
    }
  } else if (process.platform === "win32") {
    try {
      app.setLoginItemSettings({
        openAtLogin: enable,
        path: app.getPath("exe"),
      });
    } catch (e) {
      console.error("Failed to set login item settings on Windows:", e);
    }
  }
});

// --- Native Auto-Updater Engine ---
const DEFAULT_MANIFEST_URLS = [
  "https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json",
  "https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json",
  "https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"
];

class AppUpdater extends EventEmitter {
  constructor() {
    super();
    this.manifestUrls = [...DEFAULT_MANIFEST_URLS];
    this.currentVersion = app ? app.getVersion() : "5.1.0";
    this.status = "idle";
    this.updateInfo = null;
    this.downloadedFilePath = null;
    this.currentDownloadRequest = null;
    this.lastProgressEmit = 0;
  }

  compareVersions(v1, v2) {
    const cleanV1 = (v1 || "0.0.0").replace(/^v/i, "").trim();
    const cleanV2 = (v2 || "0.0.0").replace(/^v/i, "").trim();

    const [main1, pre1] = cleanV1.split("-");
    const [main2, pre2] = cleanV2.split("-");

    const parts1 = main1.split(".").map((n) => parseInt(n, 10) || 0);
    const parts2 = main2.split(".").map((n) => parseInt(n, 10) || 0);

    const maxLen = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < maxLen; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }

    if (!pre1 && pre2) return 1;
    if (pre1 && !pre2) return -1;
    if (pre1 && pre2) {
      return pre1.localeCompare(pre2);
    }

    return 0;
  }

  getPlatformKey() {
    const platform = process.platform;
    const arch = process.arch;
    return `${platform}-${arch}`;
  }

  fetchJson(url, timeoutMs = 12000, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        return reject(new Error("Too many redirects while fetching update manifest."));
      }

      const client = url.startsWith("https") ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            "User-Agent": `QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,
            Accept: "application/json, text/plain, */*",
          },
          timeout: timeoutMs,
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, url).href;
            return this.fetchJson(redirectUrl, timeoutMs, maxRedirects - 1)
              .then(resolve)
              .catch(reject);
          }

          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`Server returned HTTP ${res.statusCode}: ${res.statusMessage}`));
          }

          let rawData = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            rawData += chunk;
          });
          res.on("end", () => {
            try {
              const parsed = JSON.parse(rawData);
              resolve(parsed);
            } catch (e) {
              reject(new Error(`Invalid JSON received from update manifest: ${e.message}`));
            }
          });
        }
      );

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Connection timed out while checking for updates."));
      });

      req.on("error", (err) => {
        reject(err);
      });
    });
  }

  async checkForUpdates() {
    if (this.status === "checking" || this.status === "downloading") {
      return { status: this.status, updateInfo: this.updateInfo };
    }

    this.status = "checking";
    this.emit("checking");

    try {
      let manifest = null;
      let lastError = null;

      for (const url of this.manifestUrls) {
        try {
          const cacheBustUrl = `${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}`;
          const res = await this.fetchJson(cacheBustUrl);
          if (res && res.version) {
            manifest = res;
            break;
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (!manifest || !manifest.version) {
        throw lastError || new Error('Update manifest is missing required "version" field.');
      }

      const remoteVersion = manifest.version;
      const hasUpdate = this.compareVersions(remoteVersion, this.currentVersion) > 0;

      if (hasUpdate) {
        const platformKey = this.getPlatformKey();
        const platformData =
          manifest.platforms?.[platformKey] ||
          manifest.platforms?.[`${process.platform}-x64`] ||
          manifest.platforms?.["win32-x64"];

        const downloadUrl = platformData?.url || "";

        this.updateInfo = {
          version: remoteVersion,
          currentVersion: this.currentVersion,
          name: manifest.name || `Quick Pill v${remoteVersion}`,
          releaseDate: manifest.releaseDate || "",
          mandatory: !!manifest.mandatory,
          changelog: Array.isArray(manifest.changelog) ? manifest.changelog : [],
          downloadUrl: downloadUrl,
          sha256: platformData?.sha256 || "",
          size: platformData?.size || 0,
          installerType: platformData?.installerType || "nsis",
        };

        this.status = "available";
        this.emit("update-available", this.updateInfo);
        return { status: "available", updateInfo: this.updateInfo };
      } else {
        this.status = "not-available";
        const notAvailableInfo = { currentVersion: this.currentVersion, latestVersion: remoteVersion };
        this.emit("update-not-available", notAvailableInfo);
        return { status: "not-available", updateInfo: notAvailableInfo };
      }
    } catch (err) {
      this.status = "error";
      const errMsg = err.message || "Unknown error occurred while checking for updates.";
      this.emit("error", errMsg);
      return { status: "error", error: errMsg };
    }
  }

  startDownload() {
    if (!this.updateInfo || !this.updateInfo.downloadUrl) {
      const err = new Error("No update available or download URL is missing.");
      this.emit("error", err.message);
      return Promise.reject(err);
    }

    if (this.status === "downloading") {
      return Promise.resolve({ status: "downloading" });
    }

    this.status = "downloading";
    this.emit("download-started", this.updateInfo);

    const tempDir = app.getPath("temp");
    const ext = process.platform === "win32" ? ".exe" : process.platform === "darwin" ? ".dmg" : ".deb";
    const tempFileName = `quick-pill-update-v${this.updateInfo.version}${ext}`;
    const targetFilePath = path.join(tempDir, tempFileName);

    return new Promise((resolve, reject) => {
      if (fs.existsSync(targetFilePath)) {
        try {
          fs.unlinkSync(targetFilePath);
        } catch (_) {}
      }

      const fileStream = fs.createWriteStream(targetFilePath);
      let transferredBytes = 0;
      let totalBytes = this.updateInfo.size || 0;
      let lastBytes = 0;
      let lastTime = Date.now();
      let currentSpeed = 0;

      const downloadWithRedirects = (currentUrl, maxRedirects = 5) => {
        if (maxRedirects <= 0) {
          fileStream.close();
          const err = new Error("Too many redirects while downloading update binary.");
          this.status = "error";
          this.emit("error", err.message);
          return reject(err);
        }

        const client = currentUrl.startsWith("https") ? https : http;
        const req = client.get(
          currentUrl,
          {
            headers: {
              "User-Agent": `QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,
            },
          },
          (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              const redirectUrl = new URL(res.headers.location, currentUrl).href;
              return downloadWithRedirects(redirectUrl, maxRedirects - 1);
            }

            if (res.statusCode !== 200) {
              fileStream.close();
              try {
                fs.unlinkSync(targetFilePath);
              } catch (_) {}
              const err = new Error(`Download failed with status HTTP ${res.statusCode}: ${res.statusMessage}`);
              this.status = "error";
              this.emit("error", err.message);
              return reject(err);
            }

            const contentLength = parseInt(res.headers["content-length"], 10);
            if (!isNaN(contentLength) && contentLength > 0) {
              totalBytes = contentLength;
            }

            res.on("data", (chunk) => {
              transferredBytes += chunk.length;
              fileStream.write(chunk);

              const now = Date.now();
              if (now - this.lastProgressEmit >= 100 || transferredBytes === totalBytes) {
                const timeDelta = (now - lastTime) / 1000;
                if (timeDelta >= 0.5) {
                  currentSpeed = Math.round((transferredBytes - lastBytes) / timeDelta);
                  lastBytes = transferredBytes;
                  lastTime = now;
                }

                const percent =
                  totalBytes > 0 ? Math.min(100, Math.round((transferredBytes / totalBytes) * 1000) / 10) : 0;

                const progressData = {
                  percent,
                  transferredBytes,
                  totalBytes,
                  speedBytesPerSec: currentSpeed,
                };

                this.lastProgressEmit = now;
                this.emit("download-progress", progressData);
              }
            });

            res.on("end", () => {
              fileStream.end();
            });

            res.on("error", (err) => {
              fileStream.close();
              try {
                fs.unlinkSync(targetFilePath);
              } catch (_) {}
              this.status = "error";
              this.emit("error", err.message);
              reject(err);
            });
          }
        );

        this.currentDownloadRequest = req;

        req.on("error", (err) => {
          fileStream.close();
          try {
            fs.unlinkSync(targetFilePath);
          } catch (_) {}
          this.status = "error";
          this.emit("error", err.message);
          reject(err);
        });
      };

      fileStream.on("finish", () => {
        this.currentDownloadRequest = null;

        if (this.updateInfo.sha256 && this.updateInfo.sha256.trim() !== "") {
          try {
            const hash = crypto.createHash("sha256");
            const fileBuf = fs.readFileSync(targetFilePath);
            hash.update(fileBuf);
            const calculatedSha = hash.digest("hex");

            if (calculatedSha.toLowerCase() !== this.updateInfo.sha256.trim().toLowerCase()) {
              try {
                fs.unlinkSync(targetFilePath);
              } catch (_) {}
              const err = new Error(
                "Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted."
              );
              this.status = "error";
              this.emit("error", err.message);
              return reject(err);
            }
          } catch (hashErr) {
            console.warn("Could not verify SHA-256 checksum:", hashErr);
          }
        }

        this.downloadedFilePath = targetFilePath;
        this.status = "downloaded";
        const downloadResult = {
          version: this.updateInfo.version,
          filePath: targetFilePath,
        };
        this.emit("update-downloaded", downloadResult);
        resolve(downloadResult);
      });

      fileStream.on("error", (err) => {
        try {
          fs.unlinkSync(targetFilePath);
        } catch (_) {}
        this.status = "error";
        this.emit("error", err.message);
        reject(err);
      });

      downloadWithRedirects(this.updateInfo.downloadUrl);
    });
  }

  cancelDownload() {
    if (this.currentDownloadRequest) {
      try {
        this.currentDownloadRequest.destroy();
      } catch (_) {}
      this.currentDownloadRequest = null;
    }
    this.status = "idle";
    this.emit("download-cancelled");
  }

  installAndRelaunch() {
    if (!this.downloadedFilePath || !fs.existsSync(this.downloadedFilePath)) {
      const err = new Error("No downloaded update file found to install.");
      this.emit("error", err.message);
      return false;
    }

    const filePath = this.downloadedFilePath;
    const platform = process.platform;

    try {
      if (platform === "win32") {
        const child = spawn(filePath, ["/S"], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();

        setTimeout(() => {
          if (app) {
            app.isQuitting = true;
            app.quit();
          } else {
            process.exit(0);
          }
        }, 300);
        return true;
      } else if (platform === "darwin") {
        shell.openPath(filePath);
        setTimeout(() => {
          if (app) app.quit();
        }, 500);
        return true;
      } else {
        shell.openPath(filePath);
        setTimeout(() => {
          if (app) app.quit();
        }, 500);
        return true;
      }
    } catch (err) {
      this.emit("error", `Failed to launch installer: ${err.message}`);
      return false;
    }
  }
}

const autoUpdater = new AppUpdater();

// --- Auto-Updater IPC Handlers & Event Forwarding ---
function sendUpdaterEvent(eventName, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-event", { event: eventName, data });
  }
}

autoUpdater.on("checking", () => sendUpdaterEvent("checking"));
autoUpdater.on("update-available", (info) => sendUpdaterEvent("available", info));
autoUpdater.on("update-not-available", (info) => sendUpdaterEvent("not-available", info));
autoUpdater.on("download-started", (info) => sendUpdaterEvent("download-started", info));
autoUpdater.on("download-progress", (prog) => sendUpdaterEvent("download-progress", prog));
autoUpdater.on("update-downloaded", (res) => sendUpdaterEvent("downloaded", res));
autoUpdater.on("download-cancelled", () => sendUpdaterEvent("cancelled"));
autoUpdater.on("error", (err) => sendUpdaterEvent("error", err));

ipcMain.handle("check-for-updates", async () => {
  return await autoUpdater.checkForUpdates();
});

ipcMain.handle("start-update-download", async () => {
  return await autoUpdater.startDownload();
});

ipcMain.handle("cancel-update-download", () => {
  autoUpdater.cancelDownload();
  return true;
});

ipcMain.handle("install-update", () => {
  return autoUpdater.installAndRelaunch();
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

const getIconPath = (forceExt = null) => {
  const ext = forceExt || (process.platform === "win32" ? "ico" : process.platform === "darwin" ? "icns" : "png");

  // 1. Try app bundle directory (works in both dev & app.asar)
  try {
    const appDirIcon = path.join(app.getAppPath(), `src/assets/icons/icon.${ext}`);
    if (fs.existsSync(appDirIcon)) return appDirIcon;
  } catch (_) {}

  // 2. Try process.resourcesPath
  try {
    const resPath = path.join(process.resourcesPath, `icon.${ext}`);
    if (fs.existsSync(resPath)) return resPath;
    const assetsPath = path.join(process.resourcesPath, `assets/icons/icon.${ext}`);
    if (fs.existsSync(assetsPath)) return assetsPath;
  } catch (_) {}

  // 3. Fallback relative to __dirname
  return path.join(__dirname, `../../src/assets/icons/icon.${ext}`);
};

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;
  const isLinux = process.platform === "linux";
  const isWindows = process.platform === "win32";
  const isMac = process.platform === "darwin";

  const winWidth = width;
  const winHeight = height;
  const winX = x;
  const winY = y;

  const windowType = isWindows ? "toolbar" : "panel";

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: winX,
    y: winY,
    backgroundColor: "#00000000",
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    frame: false,
    ...(isWindows ? { thickFrame: false } : {}),
    hasShadow: false,
    skipTaskbar: true,
    icon: getIconPath(),
    ...(isMac ? { hiddenInMissionControl: true } : {}),
    ...(windowType ? { type: windowType } : {}),
    fullscreen: false,
    visibleOnFullScreen: true,
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: !app.isPackaged,
    },
    show: true,
  });

  if (!isLinux) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(true);
  }

  const showDelay = isLinux ? 500 : 0;

  mainWindow.once("ready-to-show", () => {
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.show();
        if (isLinux) {
          mainWindow.setAlwaysOnTop(true, "screen-saver");
        } else if (isMac) {
          mainWindow.setAlwaysOnTop(true, "pop-up-menu");
        } else {
          mainWindow.setAlwaysOnTop(true, "pop-up-menu");
        }
        mainWindow.focus();
      }
    }, showDelay);
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }, 5000);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  try {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch (_) {}

  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== "undefined" && MAIN_WINDOW_VITE_DEV_SERVER_URL && !app.isPackaged) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else if (!app.isPackaged && process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    const candidatePaths = [
      path.join(__dirname, "../renderer/main_window/index.html"),
      path.join(app.getAppPath(), ".vite/renderer/main_window/index.html"),
      path.join(app.getAppPath(), "dist/index.html"),
      path.join(__dirname, "index.html"),
      path.join(app.getAppPath(), "index.html")
    ];
    let loaded = false;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        logToFile(`Loading renderer from: ${p}`);
        mainWindow.loadFile(p);
        loaded = true;
        break;
      }
    }
    if (!loaded) {
      logToFile("No packaged renderer HTML found, falling back to localhost:5173");
      mainWindow.loadURL("http://localhost:5173");
    }
  }
};

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.neosparkx.quickpill");
  }
  if (process.platform === "darwin") {
    app.dock.hide();
  }
  createWindow();
  startKeyLockPolling();
  startUSBPolling();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  try {
    let iconPath = getIconPath();
    let icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      iconPath = getIconPath("png");
      icon = nativeImage.createFromPath(iconPath);
    }
    const trayIcon = icon.isEmpty() ? iconPath : icon.resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show/Hide Quick Pill",
        click: () => {
          if (mainWindow) {
            if (mainWindow.isVisible()) {
              mainWindow.hide();
            } else {
              mainWindow.show();
            }
          }
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          app.quit();
        },
      },
    ]);
    tray.setToolTip("Quick Pill");
    tray.setContextMenu(contextMenu);
  } catch (e) {
    console.error("Failed to create tray:", e);
  }

  // Check for updates 4 seconds after app boot so startup remains smooth
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      logToFile("Auto-update check on startup error:", err);
    });
  }, 4000);
});
const psMediaScriptPath = path.join(app.getPath("userData"), "get-media.ps1");
const psMediaScriptContent = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation') 
}[0]

function Await-Operation($asyncOp, $type) {
    if (-not $asyncOp) { return $null }
    try {
        $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($asyncOp))
        $task.Wait()
        return $task.Result
    } catch {
        return $null
    }
}

function Get-AppIconBase64($appId) {
    try {
        $proc = $null
        if ($appId) {
            $cleanName = $appId.Split('!')[-1].Replace('.exe','')
            $proc = Get-Process | Where-Object { $_.ProcessName -eq $cleanName -or $cleanName -like "*$($_.ProcessName)*" } | Select-Object -First 1
        }
        if (-not $proc) {
            $proc = Get-Process | Where-Object { $_.MainWindowTitle -and ($_.ProcessName -match "chrome|msedge|brave|firefox|spotify|vlc|music") } | Select-Object -First 1
        }
        if ($proc) {
            $path = $proc.MainModule.FileName
            if ($path) {
                $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
                if ($icon) {
                    $bmp = $icon.ToBitmap()
                    $ms = New-Object System.IO.MemoryStream
                    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
                    $bytes = $ms.ToArray()
                    $ms.Close()
                    $bmp.Dispose()
                    $icon.Dispose()
                    if ($bytes.Length -gt 0) {
                        return "data:image/png;base64," + [Convert]::ToBase64String($bytes)
                    }
                }
            }
        }
    } catch {}
    return ""
}

$inputInterface = [Windows.Storage.Streams.IInputStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asStreamMethod = [System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStreamForRead', [type[]]@($inputInterface))

$mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$propsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
$streamType = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$streamRefType = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]

$asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]::RequestAsync()
$manager = Await-Operation $asyncOp $mgrType

if ($manager) {
    $session = $manager.GetCurrentSession()
    if (-not $session) {
        $sessions = $manager.GetSessions()
        if ($sessions -and $sessions.Count -gt 0) {
            $session = $sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing } | Select-Object -First 1
            if (-not $session) { $session = $sessions[0] }
        }
    }
    if ($session) {
        $propsOp = $session.TryGetMediaPropertiesAsync()
        $props = Await-Operation $propsOp $propsType
        $playback = $session.GetPlaybackInfo()
        $status = if ($playback) { $playback.PlaybackStatus.ToString().ToLower() } else { "stopped" }

        $timeline = $session.GetTimelineProperties()
        $basePos = if ($timeline -and $timeline.Position) { $timeline.Position.TotalSeconds } else { 0 }
        if ($status -eq "playing" -and $timeline -and $timeline.LastUpdatedTime) {
            $elapsed = ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds
            if ($elapsed -gt 0 -and $elapsed -lt 86400) {
                $basePos += $elapsed
            }
        }
        $duration = if ($timeline -and $timeline.EndTime) { [math]::Round($timeline.EndTime.TotalSeconds) } else { 0 }
        if ($duration -gt 0 -and $basePos -gt $duration) { $basePos = $duration }
        $position = [math]::Round($basePos)

        $sourceApp = $session.SourceAppUserModelId
        $artwork = ""

        if ($props -and $props.Thumbnail) {
            try {
                $thumbOp = $props.Thumbnail.OpenReadAsync()
                $stream = Await-Operation $thumbOp $streamType
                if (-not $stream) {
                    $stream = Await-Operation $thumbOp $streamRefType
                }
                if ($stream) {
                    $netStream = $asStreamMethod.Invoke($null, @($stream))
                    if ($netStream) {
                        $mem = New-Object System.IO.MemoryStream
                        $netStream.CopyTo($mem)
                        $bytes = $mem.ToArray()
                        $mem.Close()
                        if ($bytes.Length -gt 0) {
                            $artwork = "data:image/png;base64," + [Convert]::ToBase64String($bytes)
                        }
                    }
                }
            } catch {}
        }

        if (-not $artwork) {
            $artwork = Get-AppIconBase64 $sourceApp
        }

        $info = @{
            Title = if ($props) { $props.Title } else { "" }
            Artist = if ($props) { $props.Artist } else { "" }
            Album = if ($props) { $props.AlbumTitle } else { "" }
            Status = $status
            Source = $sourceApp
            Artwork = $artwork
            Position = $position
            Duration = $duration
        }
        $info | ConvertTo-Json -Compress
        exit
    }
}
Write-Output "null"
`;

try {
  fs.writeFileSync(psMediaScriptPath, psMediaScriptContent, "utf8");
} catch (e) {
  console.error("Failed to write get-media.ps1 script:", e);
}

let mediaFetchInFlight = false;
ipcMain.handle("get-system-media", async () => {
  if (mediaFetchInFlight) return null;
  mediaFetchInFlight = true;
  return new Promise((resolve) => {
    const done = (val) => { mediaFetchInFlight = false; resolve(val); };
    const platform = process.platform;
    if (platform === "darwin") {
      const script = `
        tell application "System Events"
            set spotifyRunning to (name of every process) contains "Spotify"
            set musicRunning to (name of every process) contains "Music"
        end tell
        if spotifyRunning then
            tell application "Spotify"
                if player state is playing then
                    set trackName to name of current track
                    set artistName to artist of current track
                    set albumName to album of current track
                    set artworkUrl to artwork url of current track
                    set playerState to player state as string
                    return trackName & "||" & artistName & "||" & albumName & "||" & artworkUrl & "||" & playerState & "||Spotify"
                end if
            end tell
        else if musicRunning then
            tell application "Music"
                if player state is playing then
                    set trackName to name of current track
                    set artistName to artist of current track
                    set albumName to album of current track
                    set playerState to player state as string
                    return trackName & "||" & artistName & "||" & albumName & "||||" & playerState & "||Music"
                end if
            end tell
        end if
        return "null"
      `;
      execFile("osascript", ["-e", script], (error, stdout) => {
        if (error || !stdout || stdout.trim() === "null") {
          return done(null);
        }
        const parts = stdout.trim().split("||");
        if (parts.length >= 6) {
          done({
            name: parts[0],
            artist: parts[1],
            album: parts[2],
            artwork_url: parts[3] || null,
            state: parts[4] === "playing" ? "playing" : "paused",
            source: parts[5],
          });
        } else {
          done(null);
        }
      });
    } else if (platform === "win32") {
      execFile(
        "powershell",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psMediaScriptPath],
        { maxBuffer: 10 * 1024 * 1024, encoding: "utf8" },
        (error, stdout) => {
          if (
            error ||
            !stdout ||
            stdout.trim() === "null" ||
            stdout.trim() === "'null'"
          ) {
            exec(
              `powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,
              { encoding: "utf8" },
              (err, out) => {
                if (err || !out) return done(null);
                const title = out
                  .split("\n")
                  .find((l) => l.includes("-"))
                  ?.trim();
                if (title) {
                  const songParts = title.split(" - ");
                  let artist = "Unknown";
                  let song = title;
                  if (songParts.length > 1) {
                    artist = songParts[0].trim();
                    song = songParts.slice(1).join(" - ").trim();
                  }
                  done({
                    name: song || title,
                    artist: artist || "Unknown",
                    state: "playing",
                    source: "Spotify",
                    position: 0,
                    duration: 0
                  });
                } else {
                  done(null);
                }
              },
            );
            return;
          }

          try {
            const data = JSON.parse(stdout.trim());
            if (!data || (!data.Title && !data.Artist)) {
              return done(null);
            }
            done({
              name: data.Title || "Unknown Title",
              artist: data.Artist || "Unknown Artist",
              album: data.Album || "",
              artwork_url: data.Artwork || null,
              state: data.Status === "playing" ? "playing" : "paused",
              source: data.Source || "System",
              position: Number(data.Position) || 0,
              duration: Number(data.Duration) || 0
            });
          } catch (e) {
            done(null);
          }
        },
      );
    } else if (platform === "linux") {
      exec(
        'playerctl metadata --format "{{title}}||{{artist}}||{{album}}||{{status}}"',
        (err, stdout) => {
          if (err || !stdout) return done(null);
          const parts = stdout.trim().split("||");
          done({
            name: parts[0],
            artist: parts[1],
            album: parts[2],
            state: parts[3].toLowerCase(),
            source: "System",
          });
        },
      );
    } else {
      done(null);
    }
  });
});

ipcMain.handle("get-bluetooth-status", async () => {
  return new Promise((resolve) => {
    const platform = process.platform;
    if (platform === "darwin") {
      exec("system_profiler SPBluetoothDataType -json", (error, stdout) => {
        if (error) return resolve(false);
        try {
          const data = JSON.parse(stdout);
          const bluetoothData = data.SPBluetoothDataType[0];
          const hasConnectedDevices =
            bluetoothData.device_connected &&
            bluetoothData.device_connected.length > 0;
          resolve(hasConnectedDevices);
        } catch (e) {
          resolve(false);
        }
      });
    } else if (platform === "win32") {
      const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`;
      const enc = Buffer.from(psScript, "utf16le").toString("base64");
      exec(`powershell -NoProfile -EncodedCommand ${enc}`, (error, stdout) => {
        if (error || !stdout) return resolve({ connected: false, devices: [] });
        try {
          const data = JSON.parse(stdout.trim());
          resolve({ connected: !!data.connected, devices: Array.isArray(data.devices) ? data.devices : data.devices ? [data.devices] : [] });
        } catch {
          resolve({ connected: false, devices: [] });
        }
      });
    } else if (platform === "linux") {
      exec("bluetoothctl devices Connected", (error, stdout) => {
        if (error) return resolve(false);
        resolve(stdout.trim().length > 0);
      });
    } else {
      resolve(false);
    }
  });
});

ipcMain.handle("get-camera-status", async () => {
  return new Promise((resolve) => {
    const platform = process.platform;
    if (platform === "darwin") {
      exec('ioreg -l | grep -E "FrontCameraActive|FrontCameraStreaming"', (error, stdout) => {
        resolve(stdout ? stdout.includes('= Yes') : false);
      });
    } else if (platform === "win32") {
      execFile("reg", ["query", "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam", "/s"], (error, stdout) => {
        if (error || !stdout) return resolve(false);
        const matches = stdout.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);
        resolve(!!matches);
      });
    } else if (platform === "linux") {
      exec("fuser /dev/video* 2>/dev/null", (error, stdout) => {
        resolve(stdout.trim().length > 0);
      });
    } else {
      resolve(false);
    }
  });
});

ipcMain.handle("get-microphone-status", async () => {
  return new Promise((resolve) => {
    const platform = process.platform;
    if (platform === "darwin") {
      exec('ioreg -l | grep -E "IOAudioStreamActive|IOAudioEngine|IOAudioStream" | grep -i "Yes"', (error, stdout) => {
        resolve(stdout ? stdout.trim().length > 0 : false);
      });
    } else if (platform === "win32") {
      execFile("reg", ["query", "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone", "/s"], (error, stdout) => {
        if (error || !stdout) return resolve(false);
        const matches = stdout.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);
        resolve(!!matches);
      });
    } else if (platform === "linux") {
      exec("pactl list source-outputs | grep -q 'Source #'", (error) => {
        resolve(!error);
      });
    } else {
      resolve(false);
    }
  });
});

app.on("window-all-closed", () => {
  // Quit whenever there is no tray icon keeping the app alive.
  // On macOS the 'activate' handler re-creates the window, matching expected behaviour.
  if (!tray) {
    app.quit();
  }
});

// System Media Controls Handler
ipcMain.handle("control-system-media", async (event, command) => {
  const platform = process.platform;
  if (platform === "darwin") {
    const script = `
        tell application "System Events"
            set spotifyRunning to (name of every process) contains "Spotify"
            set musicRunning to (name of every process) contains "Music"
        end tell
        if spotifyRunning then
            tell application "Spotify" to ${command} track
        else if musicRunning then
            tell application "Music" to ${command} track
        end if
        `;
    execFile("osascript", ["-e", script]);
  } else  if (platform === "win32") {
    // 'seek' is client-side only — there is no OS key for it. Return early to avoid
    // accidentally firing a VK keypress for unrecognised commands.
    if (!['playpause', 'next', 'previous'].includes(command)) return;
    let vkCode = "0xCD"; // VK_MEDIA_PLAY_PAUSE
    if (command === "next") vkCode = "0xB0"; // VK_MEDIA_NEXT_TRACK
    if (command === "previous") vkCode = "0xB1"; // VK_MEDIA_PREV_TRACK

    logToFile(`Executing media control: ${command} (${vkCode})`);

    const psScript = `
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinMediaKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${vkCode}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${vkCode}, 0, 2, [UIntPtr]::Zero)
`;
    const encCmd = getPowershellEncodedCommand(psScript);
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encCmd}`, (err) => {
      if (err) logToFile("Media control error:", err);
    });
  } else if (platform === "linux") {
    let cmd = command;
    if (command === "playpause") cmd = "play-pause";
    exec(`playerctl ${cmd}`);
  }
});

let previousCpus = null;

function getCpuLoad() {
  const cpus = os.cpus();
  if (!cpus || cpus.length === 0) return 0;
  if (!previousCpus || previousCpus.length !== cpus.length) {
    previousCpus = cpus;
    return 0;
  }
  let totalIdle = 0;
  let totalTick = 0;
  for (let i = 0; i < cpus.length; i++) {
    const cpu = cpus[i];
    const prevCpu = previousCpus[i];
    let idle = cpu.times.idle - prevCpu.times.idle;
    let total = 0;
    for (const type in cpu.times) {
      total += cpu.times[type] - prevCpu.times[type];
    }
    totalIdle += idle;
    totalTick += total;
  }
  previousCpus = cpus;
  if (totalTick === 0) return 0;
  const idlePerc = totalIdle / totalTick;
  return Math.max(0, Math.min(100, Math.round((1 - idlePerc) * 100)));
}

function getRamLoad() {
  const total = os.totalmem();
  const free = os.freemem();
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round(((total - free) / total) * 100)));
}

ipcMain.handle("get-system-metrics", async () => {
  return {
    cpu: getCpuLoad(),
    ram: getRamLoad()
  };
});

ipcMain.handle("get-clipboard-text", async () => {
  try {
    return clipboard.readText();
  } catch {
    return "";
  }
});

ipcMain.handle("write-clipboard-text", async (event, text) => {
  try {
    if (text) {
      clipboard.writeText(text);
    } else {
      clipboard.clear();
    }
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("clear-clipboard", async () => {
  try {
    clipboard.clear();
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("control-system-volume", async (event, action) => {
  if (process.platform === "win32") {
    let vkCode = "0xAF"; // VK_VOLUME_UP
    if (action === "down") vkCode = "0xAE"; // VK_VOLUME_DOWN
    if (action === "mute") vkCode = "0xAD"; // VK_VOLUME_MUTE
    // Use encoded command (same approach as media control) to avoid shell-quoting issues.
    const psScript = `
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${vkCode}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${vkCode}, 0, 2, [UIntPtr]::Zero)
`;
    const encCmd = getPowershellEncodedCommand(psScript);
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encCmd}`, (err) => {
      if (err) logToFile("Volume control error:", err);
    });
    return true;
  }
  return false;
});

// --- Feature: Key Lock Alerts (CapsLock / NumLock) ---
let lastCapsLock = null;
let lastNumLock = null;

function startKeyLockPolling() {
  if (process.platform !== "win32") return;
  let keyLockInFlight = false;
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (keyLockInFlight) return; // skip if previous call hasn't returned yet
    keyLockInFlight = true;
    exec('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"', (err, stdout) => {
      keyLockInFlight = false;
      if (err || !stdout) return;
      const lines = stdout.trim().split(/\r?\n/);
      const capsLock = lines[0]?.trim().toLowerCase() === "true";
      const numLock = lines[1]?.trim().toLowerCase() === "true";
      if (lastCapsLock !== null && capsLock !== lastCapsLock) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("key-lock-change", { key: "CapsLock", state: capsLock });
        }
      }
      if (lastNumLock !== null && numLock !== lastNumLock) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("key-lock-change", { key: "NumLock", state: numLock });
        }
      }
      lastCapsLock = capsLock;
      lastNumLock = numLock;
    });
  }, 2000); // 2s is plenty for key-lock detection; was 500ms which spawned 2 powershell/s
}

// --- Feature: USB Drive Detection ---
let knownUSBDrives = null;

function startUSBPolling() {
  if (process.platform !== "win32") return;
  let usbInFlight = false;
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (usbInFlight) return; // skip if wmic from previous tick hasn't finished yet
    usbInFlight = true;
    exec('wmic logicaldisk where drivetype=2 get name,volumename /format:csv', (err, stdout) => {
      usbInFlight = false;
      if (err) return;
      const currentDrives = new Map();
      const lines = stdout.trim().split(/\r?\n/).filter(l => l.trim() && !l.startsWith("Node"));
      for (const line of lines) {
        const parts = line.trim().split(",");
        if (parts.length >= 3) {
          const drive = parts[1]?.trim();
          const name = parts[2]?.trim() || "USB Drive";
          if (drive) currentDrives.set(drive, name);
        }
      }
      if (knownUSBDrives !== null && mainWindow && !mainWindow.isDestroyed()) {
        for (const [drive, name] of currentDrives) {
          if (!knownUSBDrives.has(drive)) {
            mainWindow.webContents.send("usb-change", { action: "connected", drive, name });
          }
        }
        for (const [drive] of knownUSBDrives) {
          if (!currentDrives.has(drive)) {
            mainWindow.webContents.send("usb-change", { action: "disconnected", drive, name: "USB Drive" });
          }
        }
      }
      knownUSBDrives = currentDrives;
    });
  }, 5000); // 5s is fine for USB detection; WMIC is slow — was 3000ms with no concurrency guard
}

// --- Feature: Notification Center (Windows) ---
const psNotificationsScriptPath = path.join(app.getPath("userData"), "get-notifications.ps1");
const psNotificationsScriptContent = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

[void][Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]
[void][Windows.UI.Notifications.UserNotification, Windows.UI.Notifications, ContentType = WindowsRuntime]

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation')
}[0]

function Await-Op($asyncOp, $type) {
    if (-not $asyncOp) { return $null }
    try {
        $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($asyncOp))
        [void]$task.Wait()
        return $task.Result
    } catch { return $null }
}

function Get-AppIconBase64($appId) {
    try {
        $proc = $null
        if ($appId) {
            # Try to derive process name from AppId (e.g. "com.squirrel.Spotify.Spotify" -> "Spotify")
            $cleanName = $appId.Split('!')[-1].Split('.')[-1].Replace('.exe','')
            $proc = Get-Process | Where-Object { $_.ProcessName -eq $cleanName -or $_.ProcessName -like "*$cleanName*" } | Select-Object -First 1
        }
        if (-not $proc) { return "" }
        $exePath = $proc.MainModule.FileName
        if (-not $exePath) { return "" }
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
        if (-not $icon) { return "" }
        $bmp = $icon.ToBitmap()
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bytes = $ms.ToArray()
        $ms.Close(); $bmp.Dispose(); $icon.Dispose()
        if ($bytes.Length -gt 0) {
            return "data:image/png;base64," + [Convert]::ToBase64String($bytes)
        }
    } catch {}
    return ""
}

try {
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current

    $accessType = [Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $access = Await-Op ($listener.RequestAccessAsync()) $accessType

    if ($access -ne [Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus]::Allowed) {
        Write-Output "[]"
        exit
    }

    $kinds = [Windows.UI.Notifications.NotificationKinds]::Toast
    $userNotifType = [Windows.UI.Notifications.UserNotification, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $readOnlyListType = [System.Collections.Generic.IReadOnlyList\`\`1].MakeGenericType($userNotifType)
    $notifsOp = $listener.GetNotificationsAsync($kinds)
    $task = $asTaskGeneric.MakeGenericMethod($readOnlyListType).Invoke($null, @($notifsOp))
    [void]$task.Wait(10000)
    $notifs = $task.Result

    if (-not $notifs) {
        Write-Output "[]"
        exit
    }

    $results = [System.Collections.Generic.List[object]]::new()
    foreach ($n in $notifs) {
        try {
            $toast = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
            if (-not $toast) { continue }
            $texts = $toast.GetTextElements()
            $title = ""
            $body = ""
            $i = 0
            foreach ($t in $texts) {
                if ($i -eq 0) { $title = $t.Text }
                elseif ($i -eq 1) { $body = $t.Text }
                $i++
            }
            $appName = ""
            $appId = ""
            try {
                $appName = $n.AppInfo.DisplayInfo.DisplayName
                $appId = $n.AppInfo.AppUserModelId
            } catch {}
            $icon = Get-AppIconBase64 $appId
            $results.Add([PSCustomObject]@{
                Id = $n.Id
                AppName = $appName
                AppId = $appId
                Title = $title
                Body = $body
                Timestamp = $n.CreationTime.ToString("o")
                Icon = $icon
            })
        } catch { continue }
    }
    @($results) | ConvertTo-Json -Compress -Depth 3
} catch {
    Write-Output "[]"
}
`;

try {
  fs.writeFileSync(psNotificationsScriptPath, psNotificationsScriptContent, "utf8");
} catch (e) {
  logToFile("Failed to write get-notifications.ps1:", e);
}

let notificationsFetchInFlight = false;
ipcMain.handle("get-notifications", async () => {
  if (process.platform !== "win32") return [];
  if (notificationsFetchInFlight) return []; // skip if previous powershell script is still running
  notificationsFetchInFlight = true;
  return new Promise((resolve) => {
    execFile(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psNotificationsScriptPath],
      { maxBuffer: 5 * 1024 * 1024, encoding: "utf8", timeout: 10000 },
      (error, stdout) => {
        notificationsFetchInFlight = false;
        if (error || !stdout) return resolve([]);
        try {
          const data = JSON.parse(stdout.trim());
          resolve(Array.isArray(data) ? data : data ? [data] : []);
        } catch {
          resolve([]);
        }
      }
    );
  });
});

ipcMain.handle("dismiss-notification", async (event, notifId) => {
  if (process.platform !== "win32") return false;
  return new Promise((resolve) => {
    const script = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation')
}[0]
function Await-Op($asyncOp, $type) {
    if (-not $asyncOp) { return $null }
    try { $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($asyncOp)); [void]$task.Wait(); return $task.Result } catch { return $null }
}
try {
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]::Current
    $listener.RemoveNotification(${notifId})
    Write-Output "true"
} catch { Write-Output "false" }
`;
    const enc = getPowershellEncodedCommand(script);
    exec(`powershell -NoProfile -EncodedCommand ${enc}`, (err, stdout) => {
      resolve(stdout?.trim() === "true");
    });
  });
});

ipcMain.handle("focus-notification-app", async (event, appId) => {
  if (process.platform !== "win32" || !appId) return false;
  return new Promise((resolve) => {
    const cleanName = appId.split("!")[0].split("_")[0].replace(/\./g, "");
    const script = `
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${cleanName}' -or $_.MainWindowTitle -match '${cleanName}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`;
    const enc = getPowershellEncodedCommand(script);
    exec(`powershell -NoProfile -EncodedCommand ${enc}`, (err, stdout) => {
      resolve(stdout?.trim() === "true");
    });
  });
});