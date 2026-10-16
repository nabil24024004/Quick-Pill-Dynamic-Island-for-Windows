"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile: defaultExecFile } = require("child_process");

const WINDOW_ACTIVATION_CODES = Object.freeze({
  SUCCESS: "SUCCESS",
  WINDOW_NOT_FOUND: "WINDOW_NOT_FOUND",
  ELEVATION_REQUIRED: "ELEVATION_REQUIRED",
  FOREGROUND_RESTRICTED: "FOREGROUND_RESTRICTED",
  FAILED: "FAILED",
});

// Standalone PowerShell C# Win32 P/Invoke script written to disk to avoid 8,191-char limit
const WINDOW_MANAGER_PS_SCRIPT = `
param (
    [string]$Action = "Enum",
    [string]$Hwnd = "0",
    [int]$SkipPid = 0
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$d = @"
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class QPWin {
    [DllImport("user32.dll")] public static extern bool EnumWindows(WNDENUMPROC f, IntPtr l);
    [DllImport("user32.dll")] public static extern bool EnumDesktopWindows(IntPtr h, WNDENUMPROC f, IntPtr l);
    [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr OpenDesktop(string d, uint f, bool i, uint a);
    [DllImport("user32.dll", SetLastError = true)] public static extern bool CloseDesktop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int m);
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)] public static extern int GetWindowTextLength(IntPtr h);
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
    [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint c);
    [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int s);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int p);
    [DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr OpenProcess(int a, bool i, int p);
    [DllImport("advapi32.dll", SetLastError = true)] public static extern bool OpenProcessToken(IntPtr p, int a, out IntPtr t);
    [DllImport("kernel32.dll", SetLastError = true)] public static extern bool CloseHandle(IntPtr h);
    [DllImport("advapi32.dll", SetLastError = true)] public static extern bool GetTokenInformation(IntPtr t, int c, IntPtr i, int l, out int r);

    public delegate bool WNDENUMPROC(IntPtr h, IntPtr l);
    public struct RECT { public int L, T, R, B; }
    public struct ELEV { public int E; }

    public class Item {
        public string hWnd;
        public string title;
        public uint pid;
        public string processName;
        public string className;
        public bool isMinimized;
    }

    public static List<Item> Enum(int skipPid) {
        var res = new List<Item>();
        WNDENUMPROC proc = (w, l) => {
            if (!IsWindowVisible(w)) return true;
            int len = GetWindowTextLength(w);
            if (len <= 0) return true;
            var sbT = new StringBuilder(len + 1);
            GetWindowText(w, sbT, sbT.Capacity);
            string t = sbT.ToString().Trim();
            if (t.Length == 0) return true;

            var sbC = new StringBuilder(256);
            GetClassName(w, sbC, 256);
            string c = sbC.ToString();
            if (c == "Progman" || c == "Shell_TrayWnd" || c == "Shell_SecondaryTrayWnd" || (c == "Windows.UI.Core.CoreWindow" && t == "Windows Input Experience")) return true;

            int ex = GetWindowLong(w, -20);
            if ((ex & 0x80) != 0 && (ex & 0x40000) == 0) return true;
            if (GetWindow(w, 4) != IntPtr.Zero && (ex & 0x40000) == 0) return true;

            int clk = 0;
            try { DwmGetWindowAttribute(w, 14, out clk, 4); } catch {}
            if (clk != 0) return true;

            uint pid = 0;
            GetWindowThreadProcessId(w, out pid);
            if (skipPid > 0 && pid == (uint)skipPid) return true;

            string n = "";
            try { using (var p = Process.GetProcessById((int)pid)) { n = p.ProcessName; } } catch {}
            if (n.Equals("Quick Pill", StringComparison.OrdinalIgnoreCase)) return true;

            bool m = IsIconic(w);
            RECT r;
            GetWindowRect(w, out r);
            if (!m && (r.R - r.L <= 0 || r.B - r.T <= 0)) return true;

            res.Add(new Item { hWnd = w.ToInt64().ToString(), title = t, pid = pid, processName = n, className = c, isMinimized = m });
            return true;
        };

        EnumWindows(proc, IntPtr.Zero);
        if (res.Count == 0) {
            IntPtr d = OpenDesktop("default", 0, false, 0x41);
            if (d != IntPtr.Zero) {
                try { EnumDesktopWindows(d, proc, IntPtr.Zero); } finally { CloseDesktop(d); }
            }
        }
        return res;
    }

    public static string Act(string hwndStr) {
        long hv = 0;
        if (!long.TryParse(hwndStr, out hv)) return "WINDOW_NOT_FOUND";
        IntPtr w = new IntPtr(hv);

        if (!IsWindow(w)) {
            bool found = false;
            WNDENUMPROC checkProc = (chkHwnd, l) => {
                if (chkHwnd == w) { found = true; return false; }
                return true;
            };
            EnumWindows(checkProc, IntPtr.Zero);
            if (!found) {
                IntPtr d = OpenDesktop("default", 0, false, 0x41);
                if (d != IntPtr.Zero) {
                    try { EnumDesktopWindows(d, checkProc, IntPtr.Zero); } finally { CloseDesktop(d); }
                }
            }
            if (!found) return "WINDOW_NOT_FOUND";
        }

        uint pid = 0;
        GetWindowThreadProcessId(w, out pid);

        AllowSetForegroundWindow(-1);
        if (IsIconic(w)) ShowWindow(w, 9); // SW_RESTORE

        bool ok = SetForegroundWindow(w);
        if (ok || GetForegroundWindow() == w) return "SUCCESS";

        IntPtr hp = OpenProcess(0x1000, false, (int)pid); // PROCESS_QUERY_LIMITED_INFORMATION
        if (hp == IntPtr.Zero) return "ELEVATION_REQUIRED";

        IntPtr ht = IntPtr.Zero;
        try {
            if (!OpenProcessToken(hp, 8, out ht)) { // TOKEN_QUERY
                return Marshal.GetLastWin32Error() == 5 ? "ELEVATION_REQUIRED" : "FOREGROUND_RESTRICTED";
            }
            IntPtr mem = Marshal.AllocHGlobal(4);
            try {
                int rlen = 0;
                if (GetTokenInformation(ht, 20, mem, 4, out rlen)) { // TokenElevation
                    ELEV el = (ELEV)Marshal.PtrToStructure(mem, typeof(ELEV));
                    if (el.E != 0) return "ELEVATION_REQUIRED";
                }
            } finally { Marshal.FreeHGlobal(mem); }
        } finally {
            if (ht != IntPtr.Zero) CloseHandle(ht);
            CloseHandle(hp);
        }
        return "FOREGROUND_RESTRICTED";
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'QPWin').Type) {
    Add-Type -TypeDefinition $d -Language CSharp
}

if ($Action -eq "Enum") {
    $w = [QPWin]::Enum($SkipPid)
    @($w) | ConvertTo-Json -Compress
} elseif ($Action -eq "Activate") {
    $res = [QPWin]::Act($Hwnd)
    [PSCustomObject]@{ code = $res } | ConvertTo-Json -Compress
}
`;

function createWindowManager({
  userDataPath = os.tmpdir(),
  ownPid = process.pid,
  iconResolver = null,
  execFile = defaultExecFile,
  mockWindows = null,
  mockActivate = null,
} = {}) {
  const scriptPath = path.join(userDataPath, "qp_window_manager.ps1");
  let scriptEnsured = false;

  let cacheTimestamp = 0;
  let cachedWindows = [];
  let inFlightEnum = null;

  function ensureScript() {
    if (scriptEnsured && fs.existsSync(scriptPath)) return;
    try {
      const dir = path.dirname(scriptPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(scriptPath, WINDOW_MANAGER_PS_SCRIPT, "utf8");
      scriptEnsured = true;
    } catch (err) {
      // In constrained testing environments, ignore script write failures
    }
  }

  async function getRunningWindows({ forceRefresh = false, cacheTtlMs = 1500 } = {}) {
    if (mockWindows !== null) {
      return typeof mockWindows === "function" ? await mockWindows() : mockWindows;
    }

    if (process.platform !== "win32") return [];

    const now = Date.now();
    if (!forceRefresh && cachedWindows.length > 0 && now - cacheTimestamp < cacheTtlMs) {
      return cachedWindows;
    }

    if (inFlightEnum) {
      return inFlightEnum;
    }

    ensureScript();

    inFlightEnum = new Promise((resolve) => {
      execFile(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          scriptPath,
          "-Action",
          "Enum",
          "-SkipPid",
          String(ownPid),
        ],
        { maxBuffer: 10 * 1024 * 1024, windowsHide: true },
        async (err, stdout) => {
          inFlightEnum = null;
          if (err || !stdout) {
            return resolve(cachedWindows);
          }

          try {
            const raw = JSON.parse(stdout.trim());
            const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

            // Augment with base64 icons if iconResolver is provided
            const augmented = await Promise.all(
              list.map(async (win) => {
                let icon = null;
                if (iconResolver && typeof iconResolver === "function") {
                  try {
                    icon = await iconResolver(win.processName);
                  } catch (_) {}
                }
                return {
                  hWnd: String(win.hWnd),
                  title: win.title,
                  pid: win.pid,
                  processName: win.processName,
                  className: win.className,
                  isMinimized: Boolean(win.isMinimized),
                  icon,
                };
              })
            );

            cachedWindows = augmented;
            cacheTimestamp = Date.now();
            resolve(augmented);
          } catch (_) {
            resolve(cachedWindows);
          }
        }
      );
    });

    return inFlightEnum;
  }

  async function activateWindow(hWnd) {
    if (mockActivate !== null) {
      return typeof mockActivate === "function" ? await mockActivate(hWnd) : mockActivate;
    }

    if (process.platform !== "win32") {
      return { success: false, code: WINDOW_ACTIVATION_CODES.FAILED, error: "Not supported on this platform" };
    }

    if (!hWnd) {
      return { success: false, code: WINDOW_ACTIVATION_CODES.WINDOW_NOT_FOUND, error: "Invalid window handle" };
    }

    ensureScript();

    return new Promise((resolve) => {
      execFile(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          scriptPath,
          "-Action",
          "Activate",
          "-Hwnd",
          String(hWnd),
        ],
        { windowsHide: true },
        (err, stdout) => {
          if (err || !stdout) {
            return resolve({
              success: false,
              code: WINDOW_ACTIVATION_CODES.FAILED,
              error: err?.message || "Failed to execute window activation",
            });
          }

          try {
            const res = JSON.parse(stdout.trim());
            const code = res.code || WINDOW_ACTIVATION_CODES.FAILED;

            if (code === WINDOW_ACTIVATION_CODES.SUCCESS) {
              return resolve({ success: true, code });
            }

            let error = "Unable to activate window";
            if (code === WINDOW_ACTIVATION_CODES.ELEVATION_REQUIRED) {
              error =
                "Target window is running as Administrator. Run Quick Pill as Administrator to activate elevated windows.";
            } else if (code === WINDOW_ACTIVATION_CODES.FOREGROUND_RESTRICTED) {
              error =
                "Windows foreground lock prevented direct activation. The window icon may be flashing on your taskbar.";
            } else if (code === WINDOW_ACTIVATION_CODES.WINDOW_NOT_FOUND) {
              error = "The requested window was closed or is no longer available.";
            }

            resolve({ success: false, code, error });
          } catch (parseErr) {
            resolve({ success: false, code: WINDOW_ACTIVATION_CODES.FAILED, error: parseErr.message });
          }
        }
      );
    });
  }

  function destroy() {
    cachedWindows = [];
    cacheTimestamp = 0;
    inFlightEnum = null;
  }

  return {
    getRunningWindows,
    activateWindow,
    destroy,
    WINDOW_ACTIVATION_CODES,
  };
}

class WindowManager {
  constructor(options = {}) {
    this.manager = createWindowManager(options);
  }

  getRunningWindows(options) {
    return this.manager.getRunningWindows(options);
  }

  activateWindow(hWnd) {
    return this.manager.activateWindow(hWnd);
  }

  destroy() {
    this.manager.destroy();
  }
}

module.exports = {
  createWindowManager,
  WindowManager,
  WINDOW_ACTIVATION_CODES,
};
