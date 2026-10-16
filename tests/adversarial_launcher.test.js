"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { EventEmitter } = require("node:events");

const {
  WorkspaceManager,
  validateWorkspace,
  validateLaunchTarget,
} = require("../src/services/launcher/workspaceManager");

const {
  createWindowManager,
  WindowManager,
  WINDOW_ACTIVATION_CODES,
} = require("../src/services/launcher/windowManager");

// ---------------------------------------------------------------------------
// 1. Protocol Injection & Malformed URL Attacks
// ---------------------------------------------------------------------------
test("Adversarial: Protocol Injection - validateLaunchTarget strictly blocks non-http(s) schemes", () => {
  const dangerousUrls = [
    // JavaScript protocol injection
    "javascript:alert(1)",
    "javascript:void(0)",
    "JAVASCRIPT:alert(document.cookie)",
    "java\tscript:alert(1)",
    "javascript://alert(1)",

    // Local file disclosure / binary execution
    "file:///C:/Windows/System32/cmd.exe",
    "file:///C:/Windows/notepad.exe",
    "file:///etc/passwd",
    "FILE:///C:/secret.key",

    // VBScript
    "vbscript:msgbox(1)",
    "VBSCRIPT:Execute(chr(97))",

    // Data URLs
    "data:text/html,<script>alert(1)</script>",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "data:application/octet-stream;base64,AAAA",

    // Windows & Custom protocol handlers
    "ms-settings:privacy",
    "ms-windows-store://home",
    "shell:AppsFolder\\Microsoft.WindowsCalculator_8wekyb3d8bbwe!App",

    // Network protocols
    "ws://localhost:8080/exploit",
    "wss://secure.example.com",
    "ftp://ftp.example.com/exploit.exe",
    "ssh://git@github.com",
    "telnet://192.168.1.1",
    "mailto:victim@example.com",

    // Internal browser schemes
    "about:blank",
    "chrome://settings",
    "edge://settings",
  ];

  for (const url of dangerousUrls) {
    assert.throws(
      () => {
        validateLaunchTarget({
          name: "Test Target",
          type: "url",
          target: url,
        });
      },
      (err) => {
        const matches =
          /Disallowed URL protocol/i.test(err.message) ||
          /Malformed URL target/i.test(err.message);
        assert.ok(
          matches,
          `Expected disallowed protocol or malformed error for: ${url}, but got: ${err.message}`
        );
        return true;
      },
      `Should reject dangerous URL: ${url}`
    );
  }
});

test("Adversarial: Protocol Injection - validateLaunchTarget rejects malformed, empty, and pseudo-URLs", () => {
  const malformedUrls = [
    "not-a-url",
    "http//missing-colon",
    "https://",
    "http://:8080",
    "https://[invalid-ipv6",
    "http://example.com:invalidport",
    "https://example .com",
    "//protocol-relative-no-base.com",
    "",
    "   ",
    "\t\n",
  ];

  for (const url of malformedUrls) {
    assert.throws(
      () => {
        validateLaunchTarget({
          name: "Malformed",
          type: "url",
          target: url,
        });
      },
      (err) => {
        const matches =
          /Malformed URL target/i.test(err.message) ||
          /non-empty target path or URL/i.test(err.message);
        assert.ok(
          matches,
          `Expected malformed or non-empty error for: "${url}", but got: ${err.message}`
        );
        return true;
      },
      `Should reject malformed URL: "${url}"`
    );
  }
});

test("Adversarial: Protocol Injection - Valid http and https URLs are accepted across cases", () => {
  const validUrls = [
    "http://localhost:3000",
    "https://github.com/trending",
    "HTTP://EXAMPLE.COM/PATH",
    "HTTPS://Sub.Domain.Org:8443/api?query=1&foo=bar#hash",
    "https://user:pass@example.com/login",
  ];

  for (const url of validUrls) {
    const validated = validateLaunchTarget({
      name: "Valid URL",
      type: "url",
      target: url,
    });
    assert.strictEqual(validated.type, "url");
    assert.strictEqual(validated.target, url.trim());
    assert.strictEqual(validated.enabled, true);
  }
});

test("Adversarial: LaunchTarget URL Execution - WorkspaceManager.launchTarget enforces protocol checks", async () => {
  const openedUrls = [];
  const mockShell = {
    openExternal: async (url) => {
      openedUrls.push(url);
      return true;
    },
  };

  const manager = new WorkspaceManager({ shell: mockShell });

  // 1. Explicit url type with dangerous protocols
  const disallowedTargetSpecs = [
    { type: "url", target: "javascript:alert(1)" },
    { type: "url", target: "file:///C:/secret.txt" },
    { type: "url", target: "data:text/html,<h1>attack</h1>" },
    { type: "url", target: "ftp://attacker.com/malware.exe" },
  ];

  for (const spec of disallowedTargetSpecs) {
    const res = await manager.launchTarget(spec);
    assert.strictEqual(res.success, false);
    assert.ok(
      /Disallowed URL protocol/i.test(res.error) || /Invalid URL/i.test(res.error),
      `Expected protocol rejection for ${spec.target}, got: ${res.error}`
    );
  }

  // 2. Malformed URL target with type "url"
  const malformedRes = await manager.launchTarget({ type: "url", target: "htp://broken" });
  assert.strictEqual(malformedRes.success, false);

  // 3. Verify no dangerous URLs reached shell.openExternal
  assert.strictEqual(openedUrls.length, 0);

  // 4. Valid https URL executes safely
  const validRes = await manager.launchTarget({ type: "url", target: "https://trusted.org" });
  assert.strictEqual(validRes.success, true);
  assert.strictEqual(openedUrls.length, 1);
  assert.strictEqual(openedUrls[0], "https://trusted.org");
});

// ---------------------------------------------------------------------------
// 2. Shell & Argument Injection Attacks
// ---------------------------------------------------------------------------
test("Adversarial: Shell Injection - WorkspaceManager uses safe spawn with array arguments, avoiding shell interpolation", async () => {
  const spawnedCalls = [];

  const mockSpawn = (cmd, args, opts) => {
    spawnedCalls.push({ cmd, args, opts });
    const emitter = new EventEmitter();
    emitter.unref = () => {};
    return emitter;
  };

  const manager = new WorkspaceManager({ spawn: mockSpawn });

  // Target specs containing dangerous shell metacharacters
  const adversarialTargets = [
    {
      name: "Command Chaining Ampersand",
      type: "app",
      target: "notepad",
      args: ["test.txt", "&", "calc.exe", "&&", "whoami"],
    },
    {
      name: "Pipes and Semicolons",
      type: "app",
      target: "notepad",
      args: ["| dir", "; rm -rf /", "`id`", "$(whoami)"],
    },
    {
      name: "Redirections and Variables",
      type: "app",
      target: "notepad",
      args: ["> C:\\evil.txt", "< input.txt", "%PATH%", "$env:TEMP"],
    },
    {
      name: "Quotes and Newlines in Arguments",
      type: "app",
      target: "notepad",
      args: ['" --injection="evil"', "first line\nsecond line", "line1\r\nline2"],
    },
    {
      name: "Spaces in Paths and Arguments",
      type: "app",
      target: "notepad",
      args: ["C:\\Program Files\\App Data\\config.json", "arg with multiple spaces"],
    },
  ];

  for (let i = 0; i < adversarialTargets.length; i++) {
    const res = await manager.launchTarget(adversarialTargets[i]);
    assert.strictEqual(res.success, true, `Expected successful spawn dispatch for index ${i}`);
  }

  assert.strictEqual(spawnedCalls.length, adversarialTargets.length);

  // Verify invariants on every spawned call:
  // 1. opts.shell must be explicitly false (preventing cmd.exe/sh shell wrapping)
  // 2. args must be preserved exactly as an array of discrete strings without shell string concatenation
  for (let i = 0; i < spawnedCalls.length; i++) {
    const call = spawnedCalls[i];
    const spec = adversarialTargets[i];

    assert.strictEqual(
      call.opts.shell,
      false,
      `Call ${i}: opts.shell must be strictly false to prevent shell metacharacter interpretation`
    );
    assert.strictEqual(call.cmd, "notepad");
    assert.deepStrictEqual(
      call.args,
      spec.args,
      `Call ${i}: arguments must remain isolated in argv array`
    );
  }
});

test("Adversarial: Shell Injection - validateLaunchTarget rejects non-array arguments and non-string types", () => {
  const invalidArgTargets = [
    { type: "app", target: "calc.exe", args: "string-not-array" },
    { type: "app", target: "calc.exe", args: 12345 },
    { type: "app", target: "calc.exe", args: { 0: "arg1", length: 1 } },
    { type: "app", target: "calc.exe", args: null }, // if provided, must be array
  ];

  for (const item of invalidArgTargets) {
    if (item.args === null) continue; // null is handled as undefined or checked
    assert.throws(
      () => validateLaunchTarget(item),
      /must be an array of strings/i,
      `Should reject non-array args: ${JSON.stringify(item.args)}`
    );
  }

  // Verify non-string items within args array are cleanly coerced to strings
  const coerced = validateLaunchTarget({
    name: "Coercion Test",
    type: "app",
    target: "calc.exe",
    args: [123, true, "string"],
  });
  assert.deepStrictEqual(coerced.args, ["123", "true", "string"]);
});

test("Adversarial: Path Traversal and Non-existent Executable Handling", async () => {
  const manager = new WorkspaceManager();

  // 1. Target with path separator that does not exist on disk
  const nonExistentPath = "C:\\Windows\\NonExistentDirectory\\EvilScript.exe";
  const res = await manager.launchTarget(nonExistentPath);
  assert.strictEqual(res.success, false);
  assert.ok(
    res.error.includes("Executable not found on disk"),
    `Expected disk check failure, got: ${res.error}`
  );

  // 2. Relative path traversal that does not exist
  const relativeTraversal = "..\\..\\..\\Windows\\System32\\fake.exe";
  const res2 = await manager.launchTarget(relativeTraversal);
  assert.strictEqual(res2.success, false);
  assert.ok(
    res2.error.includes("Executable not found on disk"),
    `Expected disk check failure for traversal, got: ${res2.error}`
  );

  // 3. Empty target string
  const emptyRes = await manager.launchTarget("");
  assert.strictEqual(emptyRes.success, false);
  assert.strictEqual(emptyRes.error, "Empty target specified");

  const whitespaceRes = await manager.launchTarget("    ");
  assert.strictEqual(whitespaceRes.success, false);
  assert.strictEqual(whitespaceRes.error, "Empty target specified");
});

// ---------------------------------------------------------------------------
// 3. Workspace Schema Edge Cases & Stress Tests
// ---------------------------------------------------------------------------
test("Adversarial: Workspace Schema - Empty, whitespace-only, and non-string names", () => {
  const invalidNames = ["", "   ", "\t\t", "\n\r\n", null, undefined, 12345, {}, []];

  for (const name of invalidNames) {
    assert.throws(
      () => validateWorkspace({ name }),
      (err) => /Workspace name must be a non-empty string/i.test(err.message),
      `Should reject invalid workspace name: ${JSON.stringify(name)}`
    );
  }
});

test("Adversarial: Workspace Schema - Boundary and overlong workspace names", () => {
  // Exact 60 characters -> valid
  const exact60 = "A".repeat(60);
  const ws60 = validateWorkspace({ name: exact60 });
  assert.strictEqual(ws60.name, exact60);

  // 61 characters -> rejected
  const over60 = "A".repeat(61);
  assert.throws(
    () => validateWorkspace({ name: over60 }),
    /cannot exceed 60 characters/i,
    "Should reject workspace name with 61 characters"
  );

  // 100 characters -> rejected
  const over100 = "B".repeat(100);
  assert.throws(
    () => validateWorkspace({ name: over100 }),
    /cannot exceed 60 characters/i,
    "Should reject workspace name with 100 characters"
  );

  // 10,000 characters (buffer stress) -> rejected
  const massiveName = "C".repeat(10000);
  assert.throws(
    () => validateWorkspace({ name: massiveName }),
    /cannot exceed 60 characters/i,
    "Should reject massive workspace name"
  );
});

test("Adversarial: Workspace Schema - Hex color validation and fallbacks", () => {
  // Valid hex colors: 3 to 8 hex digits
  const validColors = ["#FFF", "#fff", "#10B981", "#3b82f6", "#10B981AA", "#12345678"];
  for (const color of validColors) {
    const ws = validateWorkspace({ name: "Color Test", color });
    assert.strictEqual(ws.color, color);
  }

  // Invalid colors: should safely fall back to default "#3B82F6" without crashing
  const invalidColors = [
    "red",
    "blue",
    "#",
    "#1",
    "#12", // too short (2 digits)
    "#123456789", // too long (9 digits)
    "rgb(255, 0, 0)",
    "rgba(0,0,0,1)",
    "hsl(120, 100%, 50%)",
    "#GGGGGG", // non-hex characters
    "<script>alert(1)</script>", // XSS payload
    "transparent",
    "",
    null,
    undefined,
    12345,
  ];

  for (const color of invalidColors) {
    const ws = validateWorkspace({ name: "Fallback Test", color });
    assert.strictEqual(
      ws.color,
      "#3B82F6",
      `Color "${color}" should fall back to default #3B82F6`
    );
  }
});

test("Adversarial: Workspace Schema - Missing, empty, and corrupt launch profiles", () => {
  // Missing launchProfile -> defaults to empty array
  const wsNoProfile = validateWorkspace({ name: "No Profile" });
  assert.deepStrictEqual(wsNoProfile.launchProfile, []);

  // launchProfile is non-array -> defaults to empty array
  const wsStringProfile = validateWorkspace({ name: "String Profile", launchProfile: "corrupt" });
  assert.deepStrictEqual(wsStringProfile.launchProfile, []);

  // launchProfile with invalid target -> throws validation error
  assert.throws(() => {
    validateWorkspace({
      name: "Corrupt Profile Item",
      launchProfile: [null],
    });
  }, /Launch target must be a non-null object/i);

  assert.throws(() => {
    validateWorkspace({
      name: "Disallowed Protocol in Profile",
      launchProfile: [
        { name: "Evil", type: "url", target: "javascript:alert(1)" },
      ],
    });
  }, /Disallowed URL protocol/i);
});

test("Adversarial: WorkspaceManager - Duplicate workspace IDs update cleanly without duplication", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-ws-dup-test-"));
  const wsPath = path.join(tmpDir, "workspaces.json");

  try {
    const manager = new WorkspaceManager({ workspacesPath: wsPath });

    // 1. Create first workspace
    manager.saveWorkspace({
      id: "ws-unique-1",
      name: "Original Name",
      color: "#10B981",
    });

    let list = manager.getWorkspaces();
    assert.strictEqual(list.some((w) => w.id === "ws-unique-1"), true);
    const initialCount = list.length;

    // 2. Save again with identical ID (update semantics)
    manager.saveWorkspace({
      id: "ws-unique-1",
      name: "Updated Name",
      color: "#EF4444",
    });

    list = manager.getWorkspaces();
    assert.strictEqual(list.length, initialCount, "Count should not increase on duplicate ID");
    const matching = list.filter((w) => w.id === "ws-unique-1");
    assert.strictEqual(matching.length, 1, "Exactly one workspace must have ID ws-unique-1");
    assert.strictEqual(matching[0].name, "Updated Name");
    assert.strictEqual(matching[0].color, "#EF4444");

    // 3. Reordering with duplicate IDs in request array
    manager.reorderWorkspaces(["ws-unique-1", "ws-unique-1", "ws-development"]);
    const reordered = manager.getWorkspaces();
    const ids = reordered.map((w) => w.id);
    const idSet = new Set(ids);
    assert.strictEqual(ids.length, idSet.size, "Reordering must not produce duplicate entries");
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

// ---------------------------------------------------------------------------
// 4. Window Manager Adversarial & Structured Error Code Tests
// ---------------------------------------------------------------------------
test("Adversarial: WindowManager - Invalid and boundary window handles return WINDOW_NOT_FOUND", async () => {
  const manager = createWindowManager();

  const invalidHandles = [
    null,
    undefined,
    "",
    0,
    "0",
    -1,
    "-1",
    -9999999,
    "-9999999",
    999999999,
    "999999999",
    "not_a_valid_number",
    "0xDEADBEEF",
    "12345; calc.exe", // injection attempt in handle
    "$(Get-Process)", // powershell injection attempt in handle
    "`whoami`",
    "123\n456",
  ];

  for (const handle of invalidHandles) {
    const res = await manager.activateWindow(handle);
    assert.strictEqual(
      res.success,
      false,
      `Handle ${JSON.stringify(handle)} should fail activation`
    );
    assert.strictEqual(
      res.code,
      WINDOW_ACTIVATION_CODES.WINDOW_NOT_FOUND,
      `Handle ${JSON.stringify(handle)} must return code WINDOW_NOT_FOUND, got: ${res.code}`
    );
    assert.ok(
      typeof res.error === "string" && res.error.length > 0,
      `Handle ${JSON.stringify(handle)} must include a descriptive error string`
    );
  }
});

test("Adversarial: WindowManager - Structured Error Codes are consistent and comprehensive", () => {
  // Verify all expected error codes exist in enum
  assert.strictEqual(WINDOW_ACTIVATION_CODES.SUCCESS, "SUCCESS");
  assert.strictEqual(WINDOW_ACTIVATION_CODES.WINDOW_NOT_FOUND, "WINDOW_NOT_FOUND");
  assert.strictEqual(WINDOW_ACTIVATION_CODES.ELEVATION_REQUIRED, "ELEVATION_REQUIRED");
  assert.strictEqual(WINDOW_ACTIVATION_CODES.FOREGROUND_RESTRICTED, "FOREGROUND_RESTRICTED");
  assert.strictEqual(WINDOW_ACTIVATION_CODES.FAILED, "FAILED");

  // Verify code mapping for all non-success branches
  const mockManager = createWindowManager({
    mockActivate: (hWnd) => {
      if (hWnd === "elevated") return { success: false, code: WINDOW_ACTIVATION_CODES.ELEVATION_REQUIRED };
      if (hWnd === "restricted") return { success: false, code: WINDOW_ACTIVATION_CODES.FOREGROUND_RESTRICTED };
      if (hWnd === "failed") return { success: false, code: WINDOW_ACTIVATION_CODES.FAILED };
      return { success: false, code: WINDOW_ACTIVATION_CODES.WINDOW_NOT_FOUND };
    },
  });

  return Promise.all([
    mockManager.activateWindow("elevated").then((r) => {
      assert.strictEqual(r.code, WINDOW_ACTIVATION_CODES.ELEVATION_REQUIRED);
    }),
    mockManager.activateWindow("restricted").then((r) => {
      assert.strictEqual(r.code, WINDOW_ACTIVATION_CODES.FOREGROUND_RESTRICTED);
    }),
    mockManager.activateWindow("failed").then((r) => {
      assert.strictEqual(r.code, WINDOW_ACTIVATION_CODES.FAILED);
    }),
  ]);
});

test("Empirical Live: WindowManager - Real Win32 window enumeration and live activation on Windows", async () => {
  if (process.platform !== "win32") {
    return; // Win32-specific live execution
  }

  const manager = createWindowManager({ ownPid: process.pid });

  try {
    // 1. Enumerate live running windows
    const windows = await manager.getRunningWindows({ forceRefresh: true });
    assert.ok(Array.isArray(windows), "Running windows must be an array");
    assert.ok(windows.length > 0, "Expected at least 1 top-level window on active Windows desktop");

    // Check schema of live window items
    for (const win of windows) {
      assert.strictEqual(typeof win.hWnd, "string", "hWnd must be a string");
      assert.strictEqual(typeof win.title, "string", "title must be a string");
      assert.strictEqual(typeof win.pid, "number", "pid must be a number");
      assert.strictEqual(typeof win.processName, "string", "processName must be a string");
      assert.strictEqual(typeof win.className, "string", "className must be a string");
      assert.strictEqual(typeof win.isMinimized, "boolean", "isMinimized must be a boolean");

      // Verify filters: Quick Pill and Progman should not appear
      assert.notStrictEqual(win.processName.toLowerCase(), "quick pill");
      assert.notStrictEqual(win.className, "Progman");
      assert.notStrictEqual(win.className, "Shell_TrayWnd");
    }

    // 2. Real activation of completely bogus handle
    const bogusActivation = await manager.activateWindow("88888888");
    assert.strictEqual(bogusActivation.success, false);
    assert.strictEqual(bogusActivation.code, WINDOW_ACTIVATION_CODES.WINDOW_NOT_FOUND);

    // 3. In-flight enum deduplication test
    const [enum1, enum2] = await Promise.all([
      manager.getRunningWindows({ forceRefresh: true }),
      manager.getRunningWindows(),
    ]);
    assert.strictEqual(enum1.length, enum2.length);
  } finally {
    manager.destroy();
  }
});
