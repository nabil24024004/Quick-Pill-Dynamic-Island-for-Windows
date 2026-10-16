// @ts-check
const { EventEmitter } = require("events");
const { PROGRESS_STATUSES, PROGRESS_CATEGORIES } = require("./types");

/**
 * Coordinates progress providers, action routing, and compact island selection.
 */
class ProgressCoordinator extends EventEmitter {
  /**
   * @param {import("./ProgressRegistry").ProgressRegistry} registry
   * @param {object} [options]
   */
  constructor(registry, options = {}) {
    super();
    this.registry = registry;
    this.options = options;
    
    /** @type {Map<string, object>} */
    this.providers = new Map();

    // Listen to registry changes and re-emit enriched snapshots
    this.registry.on("change", (snapshot) => {
      const enriched = this._enrichSnapshot(snapshot);
      this.emit("update", enriched);
    });
  }

  /**
   * Registers a provider instance
   * @param {string} providerId 
   * @param {object} provider 
   */
  registerProvider(providerId, provider) {
    if (!providerId || !provider) {
      throw new Error("Provider ID and provider instance are required");
    }
    this.providers.set(providerId, provider);
  }

  /**
   * Unregisters a provider instance
   * @param {string} providerId 
   */
  unregisterProvider(providerId) {
    this.providers.delete(providerId);
  }

  /**
   * Gets a registered provider
   * @param {string} providerId 
   * @returns {object|undefined}
   */
  getProvider(providerId) {
    return this.providers.get(providerId);
  }

  /**
   * Executes an action on an operation (pause, resume, cancel, retry, openDestination, dismiss)
   * @param {string} operationId 
   * @param {string} action 
   * @param {any} [params] 
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async executeAction(operationId, action, params = {}) {
    const op = this.registry.activeOperations.get(operationId) || 
      this.registry.history.find(h => h.id === operationId);

    if (!op) {
      return { success: false, message: `Operation ${operationId} not found` };
    }

    // Dismissal can be handled directly by registry
    if (action === "dismiss") {
      const dismissed = this.registry.dismiss(operationId);
      return { success: dismissed };
    }

    // Check if the provider handles this custom action
    const provider = this.providers.get(op.providerId);
    if (provider && typeof provider.handleAction === "function") {
      try {
        const result = await provider.handleAction(operationId, action, params, op);
        if (result !== undefined) {
          return typeof result === "boolean" ? { success: result } : result;
        }
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : String(err)
        };
      }
    }

    // Built-in fallback routing to registry
    switch (action) {
      case "pause":
        return { success: this.registry.pause(operationId) };
      case "resume":
        return { success: this.registry.resume(operationId) };
      case "cancel":
        return { success: this.registry.cancel(operationId) };
      case "openDestination":
        if (op.destinationPath && this.options.openPath) {
          try {
            await this.options.openPath(op.destinationPath);
            return { success: true };
          } catch (e) {
            return { success: false, message: e.message };
          }
        }
        return { success: false, message: "No destination path available" };
      default:
        return { success: false, message: `Action ${action} is not supported` };
    }
  }

  /**
   * Selects the most important operation to display in compact / idle island mode
   * @param {object[]} activeOperations 
   * @returns {object|null}
   */
  selectCompactOperation(activeOperations) {
    if (!activeOperations || activeOperations.length === 0) {
      return null;
    }

    // 1. High priority: Failed operations (user needs to know something broke)
    const failed = activeOperations.find(o => o.status === PROGRESS_STATUSES.FAILED);
    if (failed) return failed;

    // 2. Active running operations
    const running = activeOperations.filter(o => o.status === PROGRESS_STATUSES.RUNNING);
    if (running.length > 0) {
      // Sort running operations:
      // Operations with actual progress percentage first, then by most recently updated
      return running.sort((a, b) => {
        const aHasProg = typeof a.progress === "number";
        const bHasProg = typeof b.progress === "number";
        if (aHasProg && !bHasProg) return -1;
        if (!aHasProg && bHasProg) return 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      })[0];
    }

    // 3. Paused operations
    const paused = activeOperations.find(o => o.status === PROGRESS_STATUSES.PAUSED);
    if (paused) return paused;

    // 4. Recently completed operations (still in active buffer)
    const completed = activeOperations.find(o => o.status === PROGRESS_STATUSES.COMPLETED);
    if (completed) return completed;

    // 5. Any remaining active operation
    return activeOperations[0];
  }

  /**
   * Enriches registry snapshot with compact display metadata
   * @param {object} snapshot 
   * @returns {object}
   * @private
   */
  _enrichSnapshot(snapshot) {
    const compactOp = this.selectCompactOperation(snapshot.active);
    let compactDisplay = null;

    if (compactOp) {
      const extraCount = Math.max(0, snapshot.active.length - 1);
      
      let formattedProgress = "";
      if (typeof compactOp.progress === "number") {
        formattedProgress = `${Math.round(compactOp.progress)}%`;
      } else if (compactOp.status === PROGRESS_STATUSES.INDETERMINATE || compactOp.status === PROGRESS_STATUSES.RUNNING) {
        formattedProgress = "Working…";
      } else if (compactOp.status === PROGRESS_STATUSES.PAUSED) {
        formattedProgress = "Paused";
      } else if (compactOp.status === PROGRESS_STATUSES.COMPLETED) {
        formattedProgress = "Done";
      } else if (compactOp.status === PROGRESS_STATUSES.FAILED) {
        formattedProgress = "Failed";
      }

      compactDisplay = {
        operationId: compactOp.id,
        title: compactOp.title,
        subtitle: compactOp.subtitle || compactOp.applicationName || "",
        category: compactOp.category,
        status: compactOp.status,
        progress: compactOp.progress,
        formattedProgress,
        bytesPerSecond: compactOp.bytesPerSecond || 0,
        extraCount,
        hasMultiple: extraCount > 0,
        badgeText: extraCount > 0 ? `+${extraCount}` : null
      };
    }

    return {
      ...snapshot,
      compactDisplay
    };
  }

  /**
   * Retrieves enriched snapshot
   * @returns {object}
   */
  getSnapshot() {
    return this._enrichSnapshot(this.registry.getSnapshot());
  }

  destroy() {
    this.providers.clear();
    this.removeAllListeners();
  }
}

module.exports = {
  ProgressCoordinator
};
