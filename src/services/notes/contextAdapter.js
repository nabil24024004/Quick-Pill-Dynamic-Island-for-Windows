"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile: defaultExecFile } = require("child_process");
const { CAPTURE_ERROR_CODES, GUARD_LIMITS } = require("./types");

const CONTEXT_CAPTURE_PS_SCRIPT = `
param (
    [int]$SkipPid = 0
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$code = @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class ContextCaptureWin {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int m);
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)] public static extern int GetWindowTextLength(IntPtr h);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);

    public class WinInfo {
        public string hWnd;
        public string title;
        public uint pid;
        public string processName;
        public string appName;
    }

    public static WinInfo GetForeground(int skipPid) {
        IntPtr w = GetForegroundWindow();
        if (w == IntPtr.Zero) return null;

        uint pid = 0;
        GetWindowThreadProcessId(w, out pid);
        if (skipPid > 0 && pid == (uint)skipPid) return null;

        int len = GetWindowTextLength(w);
        string t = "";
        if (len > 0) {
            var sb = new StringBuilder(len + 1);
            GetWindowText(w, sb, sb.Capacity);
            t = sb.ToString().Trim();
        }

        string pName = "";
        string fName = "";
        try {
            using (var p = Process.GetProcessById((int)pid)) {
                pName = p.ProcessName;
                try {
                    fName = p.MainModule.FileVersionInfo.FileDescription;
                } catch {}
            }
        } catch {}

        string app = !string.IsNullOrEmpty(fName) ? fName : pName;

        return new WinInfo {
            hWnd = w.ToInt64().ToString(),
            title = t,
            pid = pid,
            processName = !string.IsNullOrEmpty(pName) ? pName + ".exe" : "unknown.exe",
            appName = !string.IsNullOrEmpty(app) ? app : "Unknown Application"
        };
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'ContextCaptureWin').Type) {
    Add-Type -TypeDefinition $code -Language CSharp
}

$info = [ContextCaptureWin]::GetForeground($SkipPid)
if ($null -ne $info) {
    $info | ConvertTo-Json -Compress
} else {
    "{}"
}
`;

/**
 * Cleans and normalizes text content.
 * Normalizes CRLF -> LF, collapses excessive blank lines, strips trailing line whitespace.
 * @param {string} raw
 * @returns {string}
 */
function cleanTextContent(raw) {
  if (raw === null || raw === undefined) return "";
  const str = typeof raw === "string" ? raw : String(raw);
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // Strip non-printable control chars except \t and \n
    .replace(/[ \t]+$/gm, "") // Strip trailing whitespace on each line
    .replace(/\n{3,}/g, "\n\n") // Collapse 3+ newlines to double newline
    .trim();
}

/**
 * Derives an auto-generated title from the first sentence or heading of content.
 * Strips markdown formatting (#, *, -, 1., >, checkboxes).
 * @param {string} content
 * @param {string} [explicitTitle='']
 * @returns {string}
 */
function deriveAutoTitle(content, explicitTitle = "") {
  if (explicitTitle && typeof explicitTitle === "string" && explicitTitle.trim().length > 0) {
    return explicitTitle.trim().slice(0, 100);
  }

  const cleaned = cleanTextContent(content);
  if (!cleaned) return "Untitled Note";

  const firstLine = cleaned.split("\n").find((line) => line.trim().length > 0) || "";
  if (!firstLine) return "Untitled Note";

  // Strip markdown prefixes and wrappers
  let candidate = firstLine
    .replace(/^(\s*#{1,6}\s+|\s*[-*+]\s+|\s*\d+[\.\)]\s+|>\s*|\[[ xX]\]\s*)+/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^__|_$/g, "")
    .trim();

  if (!candidate) return "Untitled Note";

  // Match first sentence ending in . ! ? or CJK full-width 。 ！ ？
  const sentenceMatch = candidate.match(/^(.+?)(?:[.!?](?=\s|$)|[。！？]|$)/);
  let sentence = sentenceMatch ? sentenceMatch[1].trim() : candidate;

  // Add the punctuation mark back if matched cleanly
  const punctMatch = candidate.slice(sentence.length).match(/^[.!?。！？]/);
  if (punctMatch && sentence.length < GUARD_LIMITS.MAX_TITLE_CHARS) {
    sentence += punctMatch[0];
  }

  if (sentence.length > GUARD_LIMITS.MAX_TITLE_CHARS) {
    let truncated = sentence.slice(0, GUARD_LIMITS.MAX_TITLE_CHARS);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 30) {
      truncated = truncated.slice(0, lastSpace);
    }
    return truncated.trim() + "...";
  }

  return sentence || "Untitled Note";
}

/**
 * Evaluates the large-content guard (>300 chars or >1KB).
 * @param {string} text
 * @param {Object} [options]
 * @returns {Object}
 */
function evaluateContentGuard(text, options = {}) {
  const str = typeof text === "string" ? text : (text != null ? String(text) : "");
  const charThreshold = options.charThreshold || GUARD_LIMITS.CHAR_THRESHOLD;
  const byteThreshold = options.byteThreshold || GUARD_LIMITS.BYTE_THRESHOLD;
  const maxBytes = options.maxBytes || GUARD_LIMITS.MAX_ALLOWED_BYTES;

  const charCount = str.length;
  const byteCount = str ? Buffer.byteLength(str, "utf8") : 0;

  if (byteCount > maxBytes) {
    return {
      isAllowed: false,
      requiresConfirmation: false,
      isLarge: true,
      code: CAPTURE_ERROR_CODES.PAYLOAD_TOO_LARGE,
      message: `Payload exceeds maximum allowed size of 5 MB (${byteCount} bytes).`,
      charCount,
      byteCount,
      preview: "",
      isTruncated: false,
      rawText: "",
    };
  }

  const isLarge = charCount > charThreshold || byteCount > byteThreshold;

  if (!isLarge) {
    return {
      isAllowed: true,
      requiresConfirmation: false,
      isLarge: false,
      charCount,
      byteCount,
      preview: str,
      isTruncated: false,
      rawText: str,
    };
  }

  // Generate truncated preview (up to 300 chars, word-bounded)
  let preview = str.slice(0, GUARD_LIMITS.PREVIEW_CHARS);
  const lastSpace = preview.lastIndexOf(" ");
  if (lastSpace > 240) {
    preview = preview.slice(0, lastSpace);
  }
  preview = preview.trim() + "...";

  return {
    isAllowed: true,
    requiresConfirmation: true,
    isLarge: true,
    charCount,
    byteCount,
    preview,
    isTruncated: true,
    rawText: str,
  };
}

/**
 * Creates the Contextual Capture Adapter.
 * @param {Object} [config]
 * @returns {Object}
 */
function createContextAdapter({
  userDataPath = os.tmpdir(),
  clipboard = null,
  execFile = defaultExecFile,
  ownPid = process.pid,
  mockForeground = null,
  mockClipboard = null,
} = {}) {
  const scriptPath = path.join(userDataPath, "qp_context_capture.ps1");
  let scriptEnsured = false;

  function ensureScript() {
    if (scriptEnsured && fs.existsSync(scriptPath)) return;
    try {
      const dir = path.dirname(scriptPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(scriptPath, CONTEXT_CAPTURE_PS_SCRIPT, "utf8");
      scriptEnsured = true;
    } catch (_) {}
  }

  async function detectForegroundWindow() {
    if (mockForeground !== null) {
      return typeof mockForeground === "function" ? await mockForeground() : mockForeground;
    }

    if (process.platform !== "win32") return null;

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
          "-SkipPid",
          String(ownPid),
        ],
        { windowsHide: true },
        (err, stdout) => {
          if (err || !stdout) return resolve(null);
          try {
            const raw = JSON.parse(stdout.trim());
            if (!raw || (!raw.title && !raw.processName)) return resolve(null);
            resolve({
              appName: raw.appName || "Unknown Application",
              windowTitle: raw.title || "Untitled Window",
              processName: raw.processName || "unknown.exe",
              pid: raw.pid || 0,
              timestamp: new Date().toISOString(),
            });
          } catch (_) {
            resolve(null);
          }
        }
      );
    });
  }

  function readClipboardSafely() {
    if (mockClipboard !== null) {
      if (typeof mockClipboard === "function") return mockClipboard();
      return mockClipboard;
    }

    if (!clipboard || typeof clipboard.readText !== "function") {
      return {
        success: false,
        code: CAPTURE_ERROR_CODES.CLIPBOARD_ACCESS_ERROR,
        message: "Clipboard module not available",
        text: "",
      };
    }

    try {
      const text = clipboard.readText();
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          code: CAPTURE_ERROR_CODES.EMPTY_OR_NON_TEXT,
          message: "Clipboard does not contain readable text. Please copy text first or use manual capture.",
          text: "",
        };
      }
      return { success: true, code: CAPTURE_ERROR_CODES.SUCCESS, text };
    } catch (err) {
      return {
        success: false,
        code: CAPTURE_ERROR_CODES.CLIPBOARD_ACCESS_ERROR,
        message: "Unable to access system clipboard. Another application may have locked it.",
        text: "",
      };
    }
  }

  async function manualCapture(rawContent, title = "") {
    const cleaned = cleanTextContent(rawContent);
    if (!cleaned) {
      return {
        success: false,
        code: CAPTURE_ERROR_CODES.EMPTY_CONTENT,
        message: "Note content cannot be empty",
        content: "",
        suggestedTitle: "Untitled Note",
        guard: null,
        sourceMetadata: null,
      };
    }

    const guard = evaluateContentGuard(cleaned);
    if (!guard.isAllowed) {
      return {
        success: false,
        code: guard.code,
        message: guard.message,
        content: "",
        suggestedTitle: "",
        guard,
        sourceMetadata: null,
      };
    }

    const suggestedTitle = deriveAutoTitle(cleaned, title);
    return {
      success: true,
      method: "manual",
      code: CAPTURE_ERROR_CODES.SUCCESS,
      content: cleaned,
      suggestedTitle,
      guard,
      sourceMetadata: null,
    };
  }

  async function captureClipboard() {
    const clipRes = readClipboardSafely();
    const sourceMetadata = await detectForegroundWindow();

    if (!clipRes.success) {
      return {
        success: false,
        method: "clipboard",
        code: clipRes.code,
        message: clipRes.message,
        content: "",
        suggestedTitle: "Untitled Note",
        guard: null,
        sourceMetadata,
      };
    }

    const cleaned = cleanTextContent(clipRes.text);
    const guard = evaluateContentGuard(cleaned);

    if (!guard.isAllowed) {
      return {
        success: false,
        method: "clipboard",
        code: guard.code,
        message: guard.message,
        content: "",
        suggestedTitle: "",
        guard,
        sourceMetadata,
      };
    }

    const suggestedTitle = deriveAutoTitle(cleaned);
    return {
      success: true,
      method: "clipboard",
      code: CAPTURE_ERROR_CODES.SUCCESS,
      content: cleaned,
      suggestedTitle,
      guard,
      sourceMetadata,
    };
  }

  async function getContextualCapture({
    method = "external_selection",
    fallbackToClipboard = true,
  } = {}) {
    if (method === "manual") {
      return manualCapture("");
    }

    if (method === "clipboard") {
      return captureClipboard();
    }

    // method === "external_selection"
    // Direct selection reading is restricted on Windows by UIPI and accessibility boundaries.
    const sourceMetadata = await detectForegroundWindow();

    if (!fallbackToClipboard) {
      return {
        success: false,
        method: "external_selection",
        code: CAPTURE_ERROR_CODES.SELECTION_UNAVAILABLE_UIPI,
        message:
          "Direct text selection cannot be read due to Windows UIPI security boundaries. Falling back to clipboard capture.",
        fallback: "clipboard",
        sourceMetadata,
        content: "",
        suggestedTitle: "Untitled Note",
        guard: null,
      };
    }

    // Fall back to user-initiated clipboard capture while reporting honest capability code
    const clipCapture = await captureClipboard();
    return {
      ...clipCapture,
      code: CAPTURE_ERROR_CODES.SELECTION_UNAVAILABLE_UIPI,
      fallbackUsed: true,
      fallbackMessage:
        "Direct text selection cannot be read due to Windows UIPI security boundaries. Captured from clipboard instead.",
      sourceMetadata: sourceMetadata || clipCapture.sourceMetadata,
    };
  }

  return {
    cleanTextContent,
    deriveAutoTitle,
    evaluateContentGuard,
    detectForegroundWindow,
    readClipboardSafely,
    manualCapture,
    captureClipboard,
    getContextualCapture,
  };
}

module.exports = {
  createContextAdapter,
  cleanTextContent,
  deriveAutoTitle,
  evaluateContentGuard,
};
