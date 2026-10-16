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
  DEFAULT_WORKSPACES,
} = require("../src/services/launcher/workspaceManager");

test("validateLaunchTarget - validates types, protocols, and arguments", () => {
  // Valid URL
  const validUrl = validateLaunchTarget({
    name: "GitHub",
    type: "url",
    target: "https://github.com/trending",
  });
  assert.strictEqual(validUrl.type, "url");
  assert.strictEqual(validUrl.target, "https://github.com/trending");
  assert.strictEqual(validUrl.enabled, true);
  assert.ok(validUrl.id);

  // Disallowed URL protocols (javascript:, file:, data:)
  assert.throws(() => {
    validateLaunchTarget({ type: "url", target: "javascript:alert(1)" });
  }, /Disallowed URL protocol/);

  assert.throws(() => {
    validateLaunchTarget({ type: "url", target: "file:///C:/secret.txt" });
  }, /Disallowed URL protocol/);

  assert.throws(() => {
    validateLaunchTarget({ type: "url", target: "data:text/html,<h1>bad</h1>" });
  }, /Disallowed URL protocol/);

  // Malformed URL
  assert.throws(() => {
    validateLaunchTarget({ type: "url", target: "not-a-valid-url" });
  }, /Malformed URL target/);

  // Invalid target type
  assert.throws(() => {
    validateLaunchTarget({ type: "unknown", target: "notepad.exe" });
  }, /Invalid launch target type/);

  // Empty target
  assert.throws(() => {
    validateLaunchTarget({ type: "app", target: "   " });
  }, /Launch target must have a non-empty/);

  // Valid app target with args
  const validApp = validateLaunchTarget({
    name: "VS Code",
    type: "app",
    target: "code.exe",
    args: ["--new-window", "d:\\project"],
    enabled: false,
  });
  assert.strictEqual(validApp.type, "app");
  assert.strictEqual(validApp.target, "code.exe");
  assert.deepStrictEqual(validApp.args, ["--new-window", "d:\\project"]);
  assert.strictEqual(validApp.enabled, false);

  // Non-array args should throw
  assert.throws(() => {
    validateLaunchTarget({ type: "app", target: "calc.exe", args: "not-an-array" });
  }, /must be an array of strings/);
});

test("validateWorkspace - validates name, color, and properties", () => {
  // Valid workspace
  const ws = validateWorkspace({
    name: "Design Studio",
    icon: "Palette",
    color: "#EC4899",
    pinnedApps: ["photoshop.exe", "figma"],
    launchProfile: [
      { name: "Figma", type: "url", target: "https://figma.com" },
    ],
  });

  assert.strictEqual(ws.name, "Design Studio");
  assert.strictEqual(ws.icon, "Palette");
  assert.strictEqual(ws.color, "#EC4899");
  assert.strictEqual(ws.pinnedApps.length, 2);
  assert.strictEqual(ws.launchProfile.length, 1);
  assert.ok(ws.id);
  assert.ok(ws.createdAt);
  assert.ok(ws.updatedAt);

  // Empty name should throw
  assert.throws(() => {
    validateWorkspace({ name: "" });
  }, /Workspace name must be a non-empty string/);

  // Overlong name (> 60 chars) should throw
  assert.throws(() => {
    validateWorkspace({ name: "A".repeat(61) });
  }, /Workspace name cannot exceed 60 characters/);

  // Non-object should throw
  assert.throws(() => {
    validateWorkspace(null);
  }, /Workspace must be a non-null object/);

  // Invalid hex color falls back to default #3B82F6
  const badColorWs = validateWorkspace({ name: "Test", color: "red" });
  assert.strictEqual(badColorWs.color, "#3B82F6");
});

test("WorkspaceManager - seeds default workspaces and recovers from corrupted store", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-ws-test-"));
  const wsPath = path.join(tmpDir, "workspaces.json");

  try {
    const manager = new WorkspaceManager({ workspacesPath: wsPath });

    // Cold start with missing file: should seed 3 defaults
    const initial = manager.getWorkspaces();
    assert.strictEqual(initial.length, 3);
    assert.strictEqual(initial[0].name, "Development");
    assert.strictEqual(initial[1].name, "Study");
    assert.strictEqual(initial[2].name, "Meetings");
    assert.ok(fs.existsSync(wsPath));

    // Corrupted file recovery
    fs.writeFileSync(wsPath, "{ this is not json }", "utf8");
    const recoveredManager = new WorkspaceManager({ workspacesPath: wsPath });
    const recovered = recoveredManager.getWorkspaces();
    assert.strictEqual(recovered.length, 3);
    assert.strictEqual(recovered[0].name, "Development");
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

test("WorkspaceManager - CRUD operations and reordering", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-crud-test-"));
  const wsPath = path.join(tmpDir, "workspaces.json");

  try {
    const manager = new WorkspaceManager({ workspacesPath: wsPath });

    // 1. Create / Save new workspace
    const saveRes = manager.saveWorkspace({
      id: "ws-custom",
      name: "Custom Space",
      icon: "Star",
      color: "#10B981",
      pinnedApps: ["app1"],
      launchProfile: [],
    });
    assert.strictEqual(saveRes.success, true);
    assert.strictEqual(saveRes.workspace.id, "ws-custom");

    // 2. Read by ID
    const retrieved = manager.getWorkspace("ws-custom");
    assert.ok(retrieved);
    assert.strictEqual(retrieved.name, "Custom Space");

    // 3. Update existing workspace
    manager.saveWorkspace({
      id: "ws-custom",
      name: "Renamed Space",
      icon: "Heart",
      color: "#F59E0B",
    });
    const updated = manager.getWorkspace("ws-custom");
    assert.strictEqual(updated.name, "Renamed Space");
    assert.strictEqual(updated.icon, "Heart");

    // 4. Reorder workspaces
    const current = manager.getWorkspaces();
    const reverseIds = current.map((w) => w.id).reverse();
    manager.reorderWorkspaces(reverseIds);
    const reordered = manager.getWorkspaces();
    assert.strictEqual(reordered[0].id, reverseIds[0]);

    // 5. Delete workspace
    const delRes = manager.deleteWorkspace("ws-custom");
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(manager.getWorkspace("ws-custom"), null);

    // Delete non-existent workspace returns false
    const delNonExistent = manager.deleteWorkspace("non-existent-id");
    assert.strictEqual(delNonExistent.success, false);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

test("WorkspaceManager - favorites management and launch history tracking", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-favs-test-"));
  const favsPath = path.join(tmpDir, "favorites.json");

  try {
    const manager = new WorkspaceManager({ favoritesPath: favsPath });

    // Initial favorites
    assert.deepStrictEqual(manager.getFavorites(), []);

    // Add and set favorites
    manager.setFavorites(["chrome.exe", "slack.exe", "chrome.exe"]); // Contains duplicate
    assert.deepStrictEqual(manager.getFavorites(), ["chrome.exe", "slack.exe"]);

    manager.addFavorite("spotify.exe");
    assert.deepStrictEqual(manager.getFavorites(), ["chrome.exe", "slack.exe", "spotify.exe"]);

    manager.removeFavorite("slack.exe");
    assert.deepStrictEqual(manager.getFavorites(), ["chrome.exe", "spotify.exe"]);

    // Track launches
    manager.trackLaunch("chrome.exe");
    manager.trackLaunch("chrome.exe");
    manager.trackLaunch("spotify.exe");

    const chromeStats = manager.getLaunchStats("chrome.exe");
    assert.strictEqual(chromeStats.launchCount, 2);
    assert.ok(chromeStats.lastLaunched);

    const allStats = manager.getAllLaunchStats();
    assert.strictEqual(allStats["chrome.exe"].launchCount, 2);
    assert.strictEqual(allStats["spotify.exe"].launchCount, 1);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

test("WorkspaceManager - launchTarget and launchWorkspace execution", async () => {
  const launchedUrls = [];
  const spawnedProcesses = [];

  const mockShell = {
    openExternal: async (url) => {
      launchedUrls.push(url);
      return true;
    },
  };

  const mockSpawn = (cmd, args, opts) => {
    spawnedProcesses.push({ cmd, args, opts });
    const emitter = new EventEmitter();
    emitter.unref = () => {};
    return emitter;
  };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-exec-test-"));

  try {
    const manager = new WorkspaceManager({
      userDataPath: tmpDir,
      shell: mockShell,
      spawn: mockSpawn,
    });

    // 1. Launch URL
    const urlRes = await manager.launchTarget("https://github.com");
    assert.strictEqual(urlRes.success, true);
    assert.strictEqual(launchedUrls[0], "https://github.com");

    // 2. Launch UWP app
    const uwpRes = await manager.launchTarget("shell:AppsFolder\\Microsoft.WindowsCalculator_8wekyb3d8bbwe!App");
    assert.strictEqual(uwpRes.success, true);
    assert.strictEqual(spawnedProcesses[0].cmd, "explorer.exe");
    assert.strictEqual(spawnedProcesses[0].args[0], "shell:AppsFolder\\Microsoft.WindowsCalculator_8wekyb3d8bbwe!App");
    assert.strictEqual(spawnedProcesses[0].opts.shell, false);

    // 3. Launch with arguments (Injection-proof array args)
    const appRes = await manager.launchTarget({
      name: "Editor",
      type: "app",
      target: "notepad",
      args: ["test.txt"],
    });
    assert.strictEqual(appRes.success, true);
    assert.strictEqual(spawnedProcesses[1].cmd, "notepad");
    assert.deepStrictEqual(spawnedProcesses[1].args, ["test.txt"]);
    assert.strictEqual(spawnedProcesses[1].opts.shell, false);

    // 4. Launch Workspace Profile
    manager.saveWorkspace({
      id: "ws-test-profile",
      name: "Test Profile",
      icon: "Code",
      color: "#3B82F6",
      pinnedApps: [],
      launchProfile: [
        { id: "t-1", name: "Doc", type: "url", target: "https://docs.github.com", enabled: true },
        { id: "t-2", name: "Terminal", type: "app", target: "cmd.exe", args: ["/k"], enabled: true },
        { id: "t-3", name: "Disabled App", type: "app", target: "calc.exe", enabled: false },
      ],
    });

    const profileRes = await manager.launchWorkspace("ws-test-profile");
    assert.strictEqual(profileRes.success, true);
    assert.strictEqual(profileRes.results.length, 2); // Only enabled targets run
    assert.strictEqual(profileRes.results[0].name, "Doc");
    assert.strictEqual(profileRes.results[0].success, true);
    assert.strictEqual(profileRes.results[1].name, "Terminal");
    assert.strictEqual(profileRes.results[1].success, true);

    // 5. Launch Workspace with specific target IDs (Confirmation modal preview selection)
    const partialRes = await manager.launchWorkspace("ws-test-profile", {
      targetIds: ["t-1"],
    });
    assert.strictEqual(partialRes.results.length, 1);
    assert.strictEqual(partialRes.results[0].id, "t-1");
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});
