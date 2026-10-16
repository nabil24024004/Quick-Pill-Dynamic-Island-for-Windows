"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

/**
 * @typedef {'app' | 'url'} LaunchTargetType
 *
 * @typedef {Object} LaunchProfileTarget
 * @property {string} id
 * @property {string} name
 * @property {LaunchTargetType} type
 * @property {string} target
 * @property {string[]} [args]
 * @property {boolean} [enabled]
 *
 * @typedef {Object} Workspace
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} color
 * @property {string[]} pinnedApps
 * @property {LaunchProfileTarget[]} launchProfile
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 *
 * @typedef {Object} LaunchResult
 * @property {string} [id]
 * @property {string} name
 * @property {LaunchTargetType} type
 * @property {string} target
 * @property {boolean} success
 * @property {string} [error]
 */

const DEFAULT_WORKSPACES = Object.freeze([
  {
    id: "ws-development",
    name: "Development",
    icon: "Code",
    color: "#3B82F6",
    pinnedApps: [],
    launchProfile: [
      { id: "dev-1", name: "Visual Studio Code", type: "app", target: "code", args: [], enabled: true },
      { id: "dev-2", name: "GitHub", type: "url", target: "https://github.com", args: [], enabled: true },
    ],
    createdAt: "2026-10-15T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
  },
  {
    id: "ws-study",
    name: "Study",
    icon: "BookOpen",
    color: "#10B981",
    pinnedApps: [],
    launchProfile: [
      { id: "study-1", name: "Notion", type: "url", target: "https://notion.so", args: [], enabled: true },
      { id: "study-2", name: "Google Scholar", type: "url", target: "https://scholar.google.com", args: [], enabled: true },
    ],
    createdAt: "2026-10-15T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
  },
  {
    id: "ws-meetings",
    name: "Meetings",
    icon: "Video",
    color: "#8B5CF6",
    pinnedApps: [],
    launchProfile: [
      { id: "meet-1", name: "Google Meet", type: "url", target: "https://meet.google.com", args: [], enabled: true },
      { id: "meet-2", name: "Slack", type: "url", target: "https://app.slack.com", args: [], enabled: true },
    ],
    createdAt: "2026-10-15T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
  },
]);

/**
 * Validates and normalizes a single launch target.
 * @param {any} target
 * @returns {LaunchProfileTarget}
 */
function validateLaunchTarget(target) {
  if (!target || typeof target !== "object") {
    throw new Error("Launch target must be a non-null object");
  }
  if (target.type !== "app" && target.type !== "url") {
    throw new Error(`Invalid launch target type: ${target.type}. Must be 'app' or 'url'`);
  }
  if (typeof target.target !== "string" || !target.target.trim()) {
    throw new Error("Launch target must have a non-empty target path or URL");
  }

  const trimmedTarget = target.target.trim();

  if (target.type === "url") {
    let parsed;
    try {
      parsed = new URL(trimmedTarget);
    } catch (_) {
      throw new Error(`Malformed URL target: ${trimmedTarget}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Disallowed URL protocol: ${parsed.protocol}. Only http: and https: are permitted.`);
    }
  }

  if (target.args !== undefined && !Array.isArray(target.args)) {
    throw new Error("Launch target args must be an array of strings");
  }

  return {
    id:
      typeof target.id === "string" && target.id.trim()
        ? target.id.trim()
        : `target-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: typeof target.name === "string" && target.name.trim() ? target.name.trim() : trimmedTarget,
    type: target.type,
    target: trimmedTarget,
    args: Array.isArray(target.args) ? target.args.map((a) => String(a)) : [],
    enabled: target.enabled !== false,
  };
}

/**
 * Validates and normalizes a workspace entity.
 * @param {any} ws
 * @returns {Workspace}
 */
function validateWorkspace(ws) {
  if (!ws || typeof ws !== "object") {
    throw new Error("Workspace must be a non-null object");
  }
  if (typeof ws.name !== "string" || !ws.name.trim()) {
    throw new Error("Workspace name must be a non-empty string");
  }
  const trimmedName = ws.name.trim();
  if (trimmedName.length > 60) {
    throw new Error("Workspace name cannot exceed 60 characters");
  }

  const id =
    typeof ws.id === "string" && ws.id.trim()
      ? ws.id.trim()
      : `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const icon = typeof ws.icon === "string" && ws.icon.trim() ? ws.icon.trim() : "Briefcase";

  const color =
    typeof ws.color === "string" && /^#([0-9a-fA-F]{3,8})$/.test(ws.color.trim())
      ? ws.color.trim()
      : "#3B82F6";

  const pinnedApps = Array.isArray(ws.pinnedApps)
    ? ws.pinnedApps.filter((app) => typeof app === "string" && app.trim()).map((app) => app.trim())
    : [];

  const launchProfile = Array.isArray(ws.launchProfile)
    ? ws.launchProfile.map(validateLaunchTarget)
    : [];

  return {
    id,
    name: trimmedName,
    icon,
    color,
    pinnedApps,
    launchProfile,
    createdAt: ws.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Atomically writes JSON data to a file with Windows file-lock retry protection.
 * @param {string} filePath
 * @param {any} data
 */
function atomicWriteJsonSync(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const jsonContent = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmpPath, jsonContent, "utf8");

  let retries = 3;
  while (retries > 0) {
    try {
      fs.renameSync(tmpPath, filePath);
      return;
    } catch (_) {
      retries--;
      if (retries === 0) {
        try {
          fs.copyFileSync(tmpPath, filePath);
          fs.unlinkSync(tmpPath);
          return;
        } catch (copyErr) {
          try {
            fs.unlinkSync(tmpPath);
          } catch (_) {}
          throw copyErr;
        }
      }
      const waitTill = Date.now() + 20;
      while (Date.now() < waitTill) {}
    }
  }
}

class WorkspaceManager {
  /**
   * @param {Object} [options]
   * @param {string} [options.userDataPath]
   * @param {string} [options.workspacesPath]
   * @param {string} [options.favoritesPath]
   * @param {Object} [options.shell] Electron shell module
   * @param {Function} [options.spawn] Child process spawn function
   */
  constructor(options = {}) {
    this.userDataPath = options.userDataPath || "";
    this.workspacesPath =
      options.workspacesPath ||
      (this.userDataPath ? path.join(this.userDataPath, "workspaces.json") : "workspaces.json");
    this.favoritesPath =
      options.favoritesPath ||
      (this.userDataPath ? path.join(this.userDataPath, "favorites.json") : "favorites.json");
    this.shell = options.shell || null;
    this.spawn = options.spawn || spawn;

    /** @type {Workspace[] | null} */
    this._workspacesCache = null;
    /** @type {string[] | null} */
    this._favoritesCache = null;
    /** @type {Record<string, { launchCount: number, lastLaunched: string }> | null} */
    this._launchHistoryCache = null;
  }

  // --- Workspaces Persistence & CRUD ---

  /**
   * Loads all workspaces from disk or returns defaults.
   * @returns {Workspace[]}
   */
  getWorkspaces() {
    if (this._workspacesCache) {
      return [...this._workspacesCache];
    }

    try {
      if (fs.existsSync(this.workspacesPath)) {
        const raw = fs.readFileSync(this.workspacesPath, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this._workspacesCache = parsed.map(validateWorkspace);
          return [...this._workspacesCache];
        }
      }
    } catch (_) {
      // JSON corrupt or read failure, fall back to defaults
    }

    // Seed defaults
    this._workspacesCache = DEFAULT_WORKSPACES.map(validateWorkspace);
    try {
      atomicWriteJsonSync(this.workspacesPath, this._workspacesCache);
    } catch (_) {}
    return [...this._workspacesCache];
  }

  /**
   * Gets a specific workspace by ID.
   * @param {string} id
   * @returns {Workspace | null}
   */
  getWorkspace(id) {
    const list = this.getWorkspaces();
    return list.find((w) => w.id === id) || null;
  }

  /**
   * Saves or creates a workspace.
   * @param {any} rawWorkspace
   * @returns {{ success: boolean, workspace: Workspace }}
   */
  saveWorkspace(rawWorkspace) {
    const validated = validateWorkspace(rawWorkspace);
    const list = this.getWorkspaces();
    const existingIndex = list.findIndex((w) => w.id === validated.id);

    if (existingIndex >= 0) {
      validated.createdAt = list[existingIndex].createdAt;
      list[existingIndex] = validated;
    } else {
      list.push(validated);
    }

    this._workspacesCache = list;
    atomicWriteJsonSync(this.workspacesPath, list);
    return { success: true, workspace: validated };
  }

  /**
   * Deletes a workspace by ID.
   * @param {string} id
   * @returns {{ success: boolean, error?: string }}
   */
  deleteWorkspace(id) {
    const list = this.getWorkspaces();
    const filtered = list.filter((w) => w.id !== id);

    if (filtered.length === list.length) {
      return { success: false, error: `Workspace not found: ${id}` };
    }

    this._workspacesCache = filtered;
    atomicWriteJsonSync(this.workspacesPath, filtered);
    return { success: true };
  }

  /**
   * Reorders workspaces according to an array of workspace IDs.
   * @param {string[]} orderedIds
   * @returns {{ success: boolean }}
   */
  reorderWorkspaces(orderedIds) {
    if (!Array.isArray(orderedIds)) {
      throw new Error("orderedIds must be an array of IDs");
    }
    const current = this.getWorkspaces();
    const map = new Map(current.map((w) => [w.id, w]));
    const reordered = [];

    for (const id of orderedIds) {
      if (map.has(id)) {
        reordered.push(map.get(id));
        map.delete(id);
      }
    }
    // Append remaining workspaces not explicitly listed
    for (const remaining of map.values()) {
      reordered.push(remaining);
    }

    this._workspacesCache = reordered;
    atomicWriteJsonSync(this.workspacesPath, reordered);
    return { success: true };
  }

  // --- Favorites & Launch Tracking ---

  _ensureFavoritesLoaded() {
    if (this._favoritesCache && this._launchHistoryCache) return;

    try {
      if (fs.existsSync(this.favoritesPath)) {
        const raw = fs.readFileSync(this.favoritesPath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          this._favoritesCache = Array.isArray(parsed.favorites)
            ? parsed.favorites.filter((f) => typeof f === "string")
            : [];
          this._launchHistoryCache =
            parsed.history && typeof parsed.history === "object" ? parsed.history : {};
          return;
        }
      }
    } catch (_) {}

    this._favoritesCache = [];
    this._launchHistoryCache = {};
  }

  _persistFavorites() {
    this._ensureFavoritesLoaded();
    const payload = {
      favorites: this._favoritesCache,
      history: this._launchHistoryCache,
    };
    atomicWriteJsonSync(this.favoritesPath, payload);
  }

  /**
   * Returns list of favorite application targets in order.
   * @returns {string[]}
   */
  getFavorites() {
    this._ensureFavoritesLoaded();
    return [...(this._favoritesCache || [])];
  }

  /**
   * Sets the ordered list of favorites.
   * @param {string[]} favorites
   * @returns {{ success: boolean }}
   */
  setFavorites(favorites) {
    if (!Array.isArray(favorites)) {
      throw new Error("favorites must be an array of strings");
    }
    this._ensureFavoritesLoaded();
    const seen = new Set();
    const cleanList = [];
    for (const item of favorites) {
      if (typeof item === "string" && item.trim()) {
        const key = item.trim();
        if (!seen.has(key)) {
          seen.add(key);
          cleanList.push(key);
        }
      }
    }
    this._favoritesCache = cleanList;
    this._persistFavorites();
    return { success: true };
  }

  /**
   * Adds an item to favorites.
   * @param {string} target
   * @returns {{ success: boolean }}
   */
  addFavorite(target) {
    if (typeof target !== "string" || !target.trim()) {
      throw new Error("target must be a non-empty string");
    }
    const clean = target.trim();
    const list = this.getFavorites();
    if (!list.includes(clean)) {
      list.push(clean);
      this.setFavorites(list);
    }
    return { success: true };
  }

  /**
   * Removes an item from favorites.
   * @param {string} target
   * @returns {{ success: boolean }}
   */
  removeFavorite(target) {
    if (typeof target !== "string" || !target.trim()) return { success: false };
    const clean = target.trim();
    const list = this.getFavorites().filter((f) => f !== clean);
    this.setFavorites(list);
    return { success: true };
  }

  /**
   * Increments the launch count and records the last launch timestamp.
   * @param {string} target
   */
  trackLaunch(target) {
    if (typeof target !== "string" || !target.trim()) return;
    this._ensureFavoritesLoaded();
    const clean = target.trim();
    const current = this._launchHistoryCache[clean] || { launchCount: 0, lastLaunched: null };
    this._launchHistoryCache[clean] = {
      launchCount: (current.launchCount || 0) + 1,
      lastLaunched: new Date().toISOString(),
    };
    this._persistFavorites();
  }

  /**
   * Returns launch statistics for a specific target.
   * @param {string} target
   * @returns {{ launchCount: number, lastLaunched: string | null }}
   */
  getLaunchStats(target) {
    if (typeof target !== "string" || !target.trim()) return { launchCount: 0, lastLaunched: null };
    this._ensureFavoritesLoaded();
    const clean = target.trim();
    return this._launchHistoryCache[clean] || { launchCount: 0, lastLaunched: null };
  }

  /**
   * Returns all launch statistics for search recency & frequency scoring.
   * @returns {Record<string, { launchCount: number, lastLaunched: string }>}
   */
  getAllLaunchStats() {
    this._ensureFavoritesLoaded();
    return { ...this._launchHistoryCache };
  }

  // --- Launch Profile Executor & Process Spawning ---

  /**
   * Safely launches an individual target (app or URL) without shell string interpolation.
   * @param {string | LaunchProfileTarget} targetSpec
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async launchTarget(targetSpec) {
    let type = "app";
    let target = "";
    let args = [];

    if (typeof targetSpec === "string") {
      target = targetSpec.trim();
      if (/^https?:\/\//i.test(target)) {
        type = "url";
      }
    } else if (targetSpec && typeof targetSpec === "object") {
      type = targetSpec.type || "app";
      target = (targetSpec.target || "").trim();
      args = Array.isArray(targetSpec.args) ? targetSpec.args.map((a) => String(a)) : [];
    }

    if (!target) {
      return { success: false, error: "Empty target specified" };
    }

    // 1. Web URL Launching
    if (type === "url" || /^https?:\/\//i.test(target)) {
      try {
        const parsed = new URL(target);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return { success: false, error: `Disallowed URL protocol: ${parsed.protocol}` };
        }
        if (this.shell && typeof this.shell.openExternal === "function") {
          await this.shell.openExternal(target);
          this.trackLaunch(target);
          return { success: true };
        } else {
          return { success: false, error: "Shell openExternal is not available" };
        }
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // 2. UWP App Launching (shell:AppsFolder\PackageFamilyName!AppId)
    if (target.toLowerCase().startsWith("shell:appsfolder\\")) {
      try {
        const child = this.spawn("explorer.exe", [target], {
          shell: false,
          detached: true,
          stdio: "ignore",
        });
        if (child && typeof child.unref === "function") child.unref();
        this.trackLaunch(target);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // 3. Command / Batch script (.bat, .cmd)
    if (/\.(cmd|bat)$/i.test(target)) {
      try {
        const child = this.spawn("cmd.exe", ["/c", target, ...args], {
          shell: false,
          detached: true,
          stdio: "ignore",
        });
        if (child && typeof child.unref === "function") child.unref();
        this.trackLaunch(target);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // 4. PowerShell script (.ps1)
    if (/\.ps1$/i.test(target)) {
      try {
        const child = this.spawn(
          "powershell.exe",
          ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", target, ...args],
          { shell: false, detached: true, stdio: "ignore" }
        );
        if (child && typeof child.unref === "function") child.unref();
        this.trackLaunch(target);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // 5. Standard Win32 Executable (.exe or PATH executable)
    try {
      // If target contains path separators, verify file exists
      if (/[\\/]/.test(target) && !fs.existsSync(target)) {
        return { success: false, error: `Executable not found on disk: ${target}` };
      }

      const child = this.spawn(target, args, {
        shell: false,
        detached: true,
        stdio: "ignore",
      });

      return new Promise((resolve) => {
        let settled = false;
        if (child && typeof child.on === "function") {
          child.on("error", (err) => {
            if (!settled) {
              settled = true;
              resolve({ success: false, error: err.message });
            }
          });
        }

        // Allow micro-tick for synchronous spawn errors (e.g. ENOENT on PATH)
        setTimeout(() => {
          if (!settled) {
            settled = true;
            if (child && typeof child.unref === "function") child.unref();
            this.trackLaunch(target);
            resolve({ success: true });
          }
        }, 50);
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Executes a workspace launch profile with per-item status tracking.
   * @param {string} workspaceId
   * @param {Object} [options]
   * @param {boolean} [options.skipConfirmation]
   * @param {string[]} [options.targetIds] Optional specific targets to launch
   * @returns {Promise<{ success: boolean, results: LaunchResult[] }>}
   */
  async launchWorkspace(workspaceId, options = {}) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      return {
        success: false,
        results: [
          {
            name: workspaceId,
            type: "app",
            target: workspaceId,
            success: false,
            error: "Workspace not found",
          },
        ],
      };
    }

    let targetsToLaunch = workspace.launchProfile;
    if (Array.isArray(options.targetIds) && options.targetIds.length > 0) {
      targetsToLaunch = targetsToLaunch.filter((t) => options.targetIds.includes(t.id));
    } else {
      targetsToLaunch = targetsToLaunch.filter((t) => t.enabled !== false);
    }

    /** @type {LaunchResult[]} */
    const results = [];

    for (const item of targetsToLaunch) {
      const res = await this.launchTarget(item);
      results.push({
        id: item.id,
        name: item.name,
        type: item.type,
        target: item.target,
        success: res.success,
        error: res.error,
      });
    }

    const overallSuccess = results.length > 0 ? results.some((r) => r.success) : true;
    return { success: overallSuccess, results };
  }
}

module.exports = {
  WorkspaceManager,
  validateWorkspace,
  validateLaunchTarget,
  atomicWriteJsonSync,
  DEFAULT_WORKSPACES,
};
