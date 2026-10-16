"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("Safety Shield: ErrorBoundary component exists and exports properly", () => {
  const ebPath = path.join(__dirname, "../src/components/ErrorBoundary.jsx");
  assert.ok(fs.existsSync(ebPath), "ErrorBoundary.jsx must exist");
  const content = fs.readFileSync(ebPath, "utf8");
  assert.ok(content.includes("componentDidCatch"), "Must implement componentDidCatch");
  assert.ok(content.includes("getDerivedStateFromError"), "Must implement getDerivedStateFromError");
  assert.ok(content.includes("RotateCcw"), "Must render retry button");
});

test("Safety Shield: Island.jsx wraps Tab 14 and Tab 15 in ErrorBoundary with valid accentColor", () => {
  const islandPath = path.join(__dirname, "../src/Island.jsx");
  const content = fs.readFileSync(islandPath, "utf8");

  // Verify accentColor is NEVER passed as an undefined bare variable
  assert.strictEqual(
    content.includes("accentColor={accentColor}"),
    false,
    "accentColor={accentColor} must not exist as accentColor was never declared"
  );

  // Verify Tab 14 has ErrorBoundary and concrete accentColor
  assert.ok(
    content.includes('<ErrorBoundary tabName="App Launcher"'),
    "Tab 14 (App Launcher) must be wrapped in ErrorBoundary"
  );
  assert.ok(
    content.includes('accentColor="#38bdf8"'),
    "AppLauncher must receive concrete accentColor '#38bdf8'"
  );

  // Verify Tab 15 has ErrorBoundary and concrete accentColor
  assert.ok(
    content.includes('<ErrorBoundary tabName="Quick Notes"'),
    "Tab 15 (Quick Notes) must be wrapped in ErrorBoundary"
  );
  assert.ok(
    content.includes('accentColor="#10b981"'),
    "QuickNotes must receive concrete accentColor '#10b981'"
  );
});

test("Safety Shield: App.jsx wraps root in ErrorBoundary with window error protection", () => {
  const appPath = path.join(__dirname, "../src/App.jsx");
  const content = fs.readFileSync(appPath, "utf8");

  assert.ok(content.includes("<ErrorBoundary"), "App root must be wrapped in ErrorBoundary");
  assert.ok(content.includes("window.addEventListener('error'"), "Must listen to global window errors");
  assert.ok(content.includes("window.addEventListener('unhandledrejection'"), "Must listen to unhandled rejections");
});

test("Safety Shield: AppLauncher and QuickNotes contain scrollable class hooks", () => {
  const launcherPath = path.join(__dirname, "../src/components/AppLauncher.jsx");
  const notesPath = path.join(__dirname, "../src/components/QuickNotes.jsx");

  const launcherContent = fs.readFileSync(launcherPath, "utf8");
  const notesContent = fs.readFileSync(notesPath, "utf8");

  assert.ok(
    launcherContent.includes('className="launcher-scrollable"'),
    "AppLauncher must contain launcher-scrollable for smooth mouse wheel behavior"
  );
  assert.ok(
    notesContent.includes('className="notes-scrollable"'),
    "QuickNotes must contain notes-scrollable for smooth mouse wheel behavior"
  );
});

test("Safety Shield: main.js has renderer error IPC handler and webContents crash protection", () => {
  const mainPath = path.join(__dirname, "../src/main.js");
  const content = fs.readFileSync(mainPath, "utf8");

  assert.ok(
    content.includes('ipcMain.handle("log-renderer-error"'),
    "main.js must handle log-renderer-error IPC"
  );
  assert.ok(
    content.includes('mainWindow.webContents.on("render-process-gone"'),
    "main.js must listen for render-process-gone and reset mouse ignore"
  );
});
