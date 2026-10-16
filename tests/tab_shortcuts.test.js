"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// Mirror the DEFAULT_TAB_SHORTCUTS definition
const DEFAULT_TAB_SHORTCUTS = {
  0: "Alt+B",   // Browser Search
  1: "Alt+W",   // Weather
  2: "Alt+O",   // Overview
  11: "Alt+H",  // Battery Hub
  12: "Alt+A",  // Audio Mixer
  13: "Alt+P",  // Progress Island
  14: "Alt+L",  // App Launcher
  15: "Alt+Q",  // Quick Notes
  3: "Alt+M",   // Now Playing
  4: "Alt+C",   // Calendar
  5: "Alt+N",   // Notifications
  6: "Alt+G",   // Game / Stats
  7: "Alt+V",   // Clipboard
  8: "Alt+T",   // Tasks
  10: "Alt+R",  // Timer
  9: "Alt+S"    // Settings
};

// Mirror the IPC sanitization & registration guard logic from main.js
function sanitizeShortcuts(newShortcuts) {
  if (!newShortcuts || typeof newShortcuts !== "object") {
    return { success: false, error: "Invalid shortcuts object" };
  }
  const sanitized = {};
  for (const [tabId, accel] of Object.entries(newShortcuts)) {
    if (typeof accel === "string") {
      const upper = accel.toUpperCase();
      if (upper.includes("CTRL") || upper.includes("CONTROL")) {
        return { success: false, error: "Ctrl cannot be used in tab shortcuts (reserved for Click-Through)" };
      }
      sanitized[tabId] = accel.trim();
    }
  }
  const merged = { ...DEFAULT_TAB_SHORTCUTS, ...sanitized };
  return { success: true, shortcuts: merged };
}

test("Tab Shortcuts - Default Definition contains all 16 Quick Pill tabs", () => {
  const expectedTabIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  assert.equal(Object.keys(DEFAULT_TAB_SHORTCUTS).length, 16);
  for (const id of expectedTabIds) {
    assert.ok(
      DEFAULT_TAB_SHORTCUTS[id] !== undefined,
      `Tab ID ${id} must have a defined default shortcut`
    );
  }
});

test("Tab Shortcuts - Strict Prohibition of Ctrl/Control in all default shortcuts", () => {
  for (const [tabId, accel] of Object.entries(DEFAULT_TAB_SHORTCUTS)) {
    const upper = accel.toUpperCase();
    assert.ok(
      !upper.includes("CTRL"),
      `Tab ${tabId} shortcut (${accel}) must NOT contain Ctrl`
    );
    assert.ok(
      !upper.includes("CONTROL"),
      `Tab ${tabId} shortcut (${accel}) must NOT contain Control`
    );
  }
});

test("Tab Shortcuts - All default shortcuts use Alt+<Letter>", () => {
  for (const [tabId, accel] of Object.entries(DEFAULT_TAB_SHORTCUTS)) {
    assert.ok(
      accel.startsWith("Alt+"),
      `Tab ${tabId} shortcut (${accel}) must start with Alt+`
    );
    const key = accel.slice(4);
    assert.equal(key.length, 1, `Tab ${tabId} key (${key}) should be a single character`);
    assert.ok(/^[A-Z0-9]$/i.test(key), `Tab ${tabId} key (${key}) must be alphanumeric`);
  }
});

test("Tab Shortcuts - All 16 default shortcuts are completely unique (no collisions)", () => {
  const seen = new Set();
  for (const [tabId, accel] of Object.entries(DEFAULT_TAB_SHORTCUTS)) {
    const upper = accel.toUpperCase();
    assert.ok(!seen.has(upper), `Duplicate default shortcut found: ${accel} on tab ${tabId}`);
    seen.add(upper);
  }
  assert.equal(seen.size, 16);
});

test("Tab Shortcuts - First-letter mnemonic verification", () => {
  assert.equal(DEFAULT_TAB_SHORTCUTS[0], "Alt+B");  // Browser Search
  assert.equal(DEFAULT_TAB_SHORTCUTS[1], "Alt+W");  // Weather
  assert.equal(DEFAULT_TAB_SHORTCUTS[2], "Alt+O");  // Overview
  assert.equal(DEFAULT_TAB_SHORTCUTS[11], "Alt+H"); // Battery Hub
  assert.equal(DEFAULT_TAB_SHORTCUTS[12], "Alt+A"); // Audio Mixer
  assert.equal(DEFAULT_TAB_SHORTCUTS[13], "Alt+P"); // Progress Island
  assert.equal(DEFAULT_TAB_SHORTCUTS[14], "Alt+L"); // App Launcher
  assert.equal(DEFAULT_TAB_SHORTCUTS[15], "Alt+Q"); // Quick Notes
  assert.equal(DEFAULT_TAB_SHORTCUTS[3], "Alt+M");  // Music / Now Playing
  assert.equal(DEFAULT_TAB_SHORTCUTS[4], "Alt+C");  // Calendar
  assert.equal(DEFAULT_TAB_SHORTCUTS[5], "Alt+N");  // Notifications
  assert.equal(DEFAULT_TAB_SHORTCUTS[6], "Alt+G");  // Game / Stats
  assert.equal(DEFAULT_TAB_SHORTCUTS[7], "Alt+V");  // Clipboard (Paste mnemonic)
  assert.equal(DEFAULT_TAB_SHORTCUTS[8], "Alt+T");  // Tasks
  assert.equal(DEFAULT_TAB_SHORTCUTS[10], "Alt+R"); // Timer / Reminders
  assert.equal(DEFAULT_TAB_SHORTCUTS[9], "Alt+S");  // Settings
});

test("Tab Shortcuts - Sanitizer strictly rejects Ctrl, Control, and combinations", () => {
  const rejected1 = sanitizeShortcuts({ 0: "Ctrl+B" });
  assert.equal(rejected1.success, false);
  assert.match(rejected1.error, /Ctrl cannot be used/);

  const rejected2 = sanitizeShortcuts({ 14: "Ctrl+Alt+L" });
  assert.equal(rejected2.success, false);
  assert.match(rejected2.error, /Ctrl cannot be used/);

  const rejected3 = sanitizeShortcuts({ 15: "Control+N" });
  assert.equal(rejected3.success, false);
  assert.match(rejected3.error, /Ctrl cannot be used/);
});

test("Tab Shortcuts - Sanitizer accepts valid custom Alt shortcuts and merges", () => {
  const result = sanitizeShortcuts({
    14: "Alt+K",
    15: "Alt+J"
  });
  assert.equal(result.success, true);
  assert.equal(result.shortcuts[14], "Alt+K");
  assert.equal(result.shortcuts[15], "Alt+J");
  // Untouched tabs retain defaults
  assert.equal(result.shortcuts[0], "Alt+B");
  assert.equal(result.shortcuts[9], "Alt+S");
});
