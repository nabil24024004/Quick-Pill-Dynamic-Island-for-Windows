"use strict";

const path = require("path");
const { AppDiscovery, discoverAllApplications } = require("./discovery");
const {
  extractCatalogIcons,
  loadAppCache,
  saveAppCache,
  getFallbackIcon,
} = require("./iconExtractor");
const { createSearchEngine, SearchEngine } = require("./searchEngine");
const { createWindowManager, WindowManager, WINDOW_ACTIVATION_CODES } = require("./windowManager");
const { WorkspaceManager, DEFAULT_WORKSPACES } = require("./workspaceManager");

/**
 * Creates the unified Quick App Launcher & Workspaces engine.
 * Coordinates discovery, icon extraction, search ranking, running windows, and workspaces.
 *
 * @param {Object} [options]
 * @param {string} [options.userDataPath]
 * @param {string} [options.cachePath]
 * @param {Object} [options.shell] Electron shell module
 * @param {Function} [options.getFileIcon] Electron app.getFileIcon function
 * @param {Function} [options.spawn] Process spawn function
 * @param {any} [options.discovery] Custom AppDiscovery instance
 * @param {any} [options.searchEngine] Custom SearchEngine instance
 * @param {any} [options.windowManager] Custom WindowManager instance
 * @param {any} [options.workspaceManager] Custom WorkspaceManager instance
 */
function createLauncherEngine(options = {}) {
  const userDataPath = options.userDataPath || "";
  const cachePath =
    options.cachePath ||
    (userDataPath ? path.join(userDataPath, "app-cache.json") : "app-cache.json");
  const shell = options.shell || null;
  const getFileIcon = options.getFileIcon || null;
  const spawnFn = options.spawn || undefined;

  const workspaceManager =
    options.workspaceManager ||
    new WorkspaceManager({
      userDataPath,
      shell,
      spawn: spawnFn,
    });

  const discovery =
    options.discovery ||
    new AppDiscovery({
      userDataPath,
      getFileIcon,
    });

  const searchEngine = options.searchEngine || createSearchEngine();

  const windowManager =
    options.windowManager ||
    createWindowManager({
      userDataPath,
      execFile: options.execFile,
      mockWindows: options.mockWindows,
      mockActivate: options.mockActivate,
      iconResolver: async (processName) => {
        if (!processName) return null;
        const lower = processName.toLowerCase();
        const catalog = engine.getCatalogSync();
        const found = catalog.find(
          (a) =>
            (a.name && a.name.toLowerCase().includes(lower)) ||
            (a.target && a.target.toLowerCase().includes(lower)) ||
            (a.aliases && a.aliases.includes(lower))
        );
        return found?.icon || null;
      },
    });

  let catalog = [];
  let isReindexing = false;

  // Cold start initialization: read cached catalog synchronously from disk (< 5ms)
  const cached = loadAppCache(cachePath);
  if (cached && Array.isArray(cached.apps) && cached.apps.length > 0) {
    catalog = cached.apps;
  }

  const engine = {
    workspaceManager,
    discovery,
    searchEngine,
    windowManager,

    getCatalogSync() {
      return catalog;
    },

    async getCatalog() {
      if (catalog.length > 0) {
        return catalog;
      }
      // If catalog is empty on cold start, trigger reindex
      await this.reindexCatalog();
      return catalog;
    },

    async reindexCatalog() {
      if (isReindexing) {
        return { success: true, count: catalog.length };
      }
      isReindexing = true;
      try {
        const rawApps =
          typeof discovery.reindex === "function"
            ? await discovery.getCatalog()
            : await discoverAllApplications(options);

        const enriched = await extractCatalogIcons(rawApps, {
          getFileIcon,
          existingCatalog: catalog,
        });

        catalog = enriched;
        saveAppCache(cachePath, catalog);
        return { success: true, count: catalog.length };
      } catch (err) {
        return { success: false, count: catalog.length, error: err.message };
      } finally {
        isReindexing = false;
      }
    },

    async searchApps(query, searchOptions = {}) {
      const q = (query || "").trim();
      const cat = catalog.length > 0 ? catalog : await this.getCatalog();
      const runningWindows =
        windowManager && typeof windowManager.getRunningWindows === "function"
          ? await windowManager.getRunningWindows()
          : [];
      const launchStats = workspaceManager.getAllLaunchStats();
      const favorites = workspaceManager.getFavorites();

      if (typeof searchEngine.search === "function") {
        return searchEngine.search(q, cat, runningWindows, launchStats, favorites, searchOptions);
      }

      // Fallback simple search
      if (!q) {
        return cat.slice(0, 8);
      }
      const lower = q.toLowerCase();
      return cat
        .filter((a) => a.name && a.name.toLowerCase().includes(lower))
        .slice(0, 8);
    },

    async launchApp(target) {
      let resolvedTarget = target;
      if (typeof target === "string" && !/[\\/]/.test(target) && !/^(?:shell|https?):/i.test(target)) {
        const cat = catalog.length > 0 ? catalog : await this.getCatalog();
        const lower = target.toLowerCase().trim();
        const found = cat.find((a) => {
          if (!a) return false;
          const aName = (a.name || "").toLowerCase();
          if (aName === lower) return true;
          if (Array.isArray(a.aliases) && a.aliases.some((al) => (al || "").toLowerCase() === lower)) return true;
          const raw = a.launch || a.target || a.launchTarget || "";
          const exe = raw.split(/[/\\]/).pop().toLowerCase();
          if (exe === lower || exe === `${lower}.exe`) return true;
          return false;
        });

        if (found) {
          resolvedTarget = found.launch || found.target || found.launchTarget || target;
        }
      } else if (
        target &&
        typeof target === "object" &&
        typeof target.target === "string" &&
        !/[\\/]/.test(target.target) &&
        !/^(?:shell|https?):/i.test(target.target)
      ) {
        const cat = catalog.length > 0 ? catalog : await this.getCatalog();
        const lower = target.target.toLowerCase().trim();
        const found = cat.find((a) => {
          if (!a) return false;
          const aName = (a.name || "").toLowerCase();
          if (aName === lower) return true;
          if (Array.isArray(a.aliases) && a.aliases.some((al) => (al || "").toLowerCase() === lower)) return true;
          const raw = a.launch || a.target || a.launchTarget || "";
          const exe = raw.split(/[/\\]/).pop().toLowerCase();
          if (exe === lower || exe === `${lower}.exe`) return true;
          return false;
        });

        if (found) {
          resolvedTarget = {
            ...target,
            target: found.launch || found.target || found.launchTarget || target.target,
            type: found.type || target.type || (found.launch && found.launch.startsWith("shell:") ? "uwp" : "win32"),
          };
        }
      }

      return await workspaceManager.launchTarget(resolvedTarget);
    },

    async getRunningWindows(winOptions) {
      if (windowManager && typeof windowManager.getRunningWindows === "function") {
        return await windowManager.getRunningWindows(winOptions);
      }
      return [];
    },

    async activateWindow(hWnd) {
      if (windowManager && typeof windowManager.activateWindow === "function") {
        return await windowManager.activateWindow(hWnd);
      }
      return {
        success: false,
        code: WINDOW_ACTIVATION_CODES.FAILED,
        error: "WindowManager is unavailable",
      };
    },

    async getFavorites() {
      return workspaceManager.getFavorites();
    },

    async setFavorites(favorites) {
      return workspaceManager.setFavorites(favorites);
    },

    async getWorkspaces() {
      return workspaceManager.getWorkspaces();
    },

    async getWorkspace(id) {
      return workspaceManager.getWorkspace(id);
    },

    async saveWorkspace(workspace) {
      return workspaceManager.saveWorkspace(workspace);
    },

    async deleteWorkspace(id) {
      return workspaceManager.deleteWorkspace(id);
    },

    async launchWorkspace(id, wsOptions) {
      return await workspaceManager.launchWorkspace(id, wsOptions);
    },

    destroy() {
      if (discovery && typeof discovery.destroy === "function") discovery.destroy();
      if (windowManager && typeof windowManager.destroy === "function") windowManager.destroy();
    },
  };

  return engine;
}

class LauncherEngine {
  constructor(options = {}) {
    this.engine = createLauncherEngine(options);
  }

  getCatalog() {
    return this.engine.getCatalog();
  }

  reindexCatalog() {
    return this.engine.reindexCatalog();
  }

  searchApps(query, options) {
    return this.engine.searchApps(query, options);
  }

  launchApp(target) {
    return this.engine.launchApp(target);
  }

  getRunningWindows(options) {
    return this.engine.getRunningWindows(options);
  }

  activateWindow(hWnd) {
    return this.engine.activateWindow(hWnd);
  }

  getFavorites() {
    return this.engine.getFavorites();
  }

  setFavorites(favorites) {
    return this.engine.setFavorites(favorites);
  }

  getWorkspaces() {
    return this.engine.getWorkspaces();
  }

  getWorkspace(id) {
    return this.engine.getWorkspace(id);
  }

  saveWorkspace(workspace) {
    return this.engine.saveWorkspace(workspace);
  }

  deleteWorkspace(id) {
    return this.engine.deleteWorkspace(id);
  }

  launchWorkspace(id, options) {
    return this.engine.launchWorkspace(id, options);
  }

  destroy() {
    this.engine.destroy();
  }
}

module.exports = {
  createLauncherEngine,
  LauncherEngine,
  AppDiscovery,
  SearchEngine,
  WindowManager,
  WorkspaceManager,
  WINDOW_ACTIVATION_CODES,
  DEFAULT_WORKSPACES,
  extractCatalogIcons,
  loadAppCache,
  saveAppCache,
  getFallbackIcon,
};
