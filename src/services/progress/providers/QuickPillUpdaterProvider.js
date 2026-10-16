// @ts-check
const { PROGRESS_CATEGORIES, PROGRESS_STATUSES } = require("../types");

class QuickPillUpdaterProvider {
  /**
   * @param {import("../ProgressRegistry").ProgressRegistry} registry
   * @param {object} autoUpdater
   */
  constructor(registry, autoUpdater) {
    this.providerId = "quick-pill-updater";
    this.registry = registry;
    this.autoUpdater = autoUpdater;
    this.currentOperationId = null;

    if (this.autoUpdater) {
      this._wireEvents();
    }
  }

  _wireEvents() {
    this.autoUpdater.on("download-started", (updateInfo) => {
      const version = updateInfo?.version || "new version";
      const totalBytes = updateInfo?.size || 0;

      this.currentOperationId = `update-${version}`;
      this.registry.register({
        id: this.currentOperationId,
        title: `Quick Pill Update v${version}`,
        subtitle: "Downloading update package…",
        applicationName: "Quick Pill Updater",
        category: PROGRESS_CATEGORIES.UPDATE,
        status: PROGRESS_STATUSES.RUNNING,
        progress: 0,
        bytesCompleted: 0,
        totalBytes: totalBytes > 0 ? totalBytes : undefined,
        capabilities: {
          canPause: false,
          canResume: false,
          canCancel: true,
          canRetry: false,
          canOpenDestination: false,
          canDismiss: true
        },
        metadata: {
          version,
          downloadUrl: updateInfo?.downloadUrl
        }
      }, this.providerId);
    });

    this.autoUpdater.on("download-progress", (data) => {
      if (!this.currentOperationId) return;

      this.registry.update(this.currentOperationId, {
        progress: data.percent,
        bytesCompleted: data.transferredBytes,
        totalBytes: data.totalBytes,
        bytesPerSecond: data.speedBytesPerSec,
        subtitle: `Downloading update… ${Math.round(data.percent)}%`
      }, this.providerId);
    });

    this.autoUpdater.on("update-downloaded", (data) => {
      if (!this.currentOperationId) return;

      this.registry.update(this.currentOperationId, {
        status: PROGRESS_STATUSES.COMPLETED,
        progress: 100,
        subtitle: "Download complete. Ready to install.",
        destinationPath: data.filePath,
        capabilities: {
          canCancel: false,
          canRetry: false,
          canOpenDestination: true,
          canDismiss: true
        }
      }, this.providerId);
    });

    this.autoUpdater.on("download-cancelled", () => {
      if (!this.currentOperationId) return;
      this.registry.cancel(this.currentOperationId, this.providerId);
    });

    this.autoUpdater.on("error", (errorMessage) => {
      if (!this.currentOperationId) {
        // If an update error happened without a formal start, register a brief failed operation
        const id = `update-err-${Date.now()}`;
        this.registry.register({
          id,
          title: "Quick Pill Update Check",
          subtitle: "Update failed",
          applicationName: "Quick Pill Updater",
          category: PROGRESS_CATEGORIES.UPDATE,
          status: PROGRESS_STATUSES.FAILED,
          errorMessage: String(errorMessage || "Update failed"),
          capabilities: {
            canRetry: true,
            canDismiss: true
          }
        }, this.providerId);
        return;
      }

      this.registry.fail(this.currentOperationId, errorMessage || "Update download failed", this.providerId);
      this.registry.update(this.currentOperationId, {
        capabilities: {
          canRetry: true,
          canDismiss: true
        }
      }, this.providerId);
    });
  }

  /**
   * Handles actions targeting the updater
   * @param {string} operationId 
   * @param {string} action 
   * @param {any} params 
   * @param {object} op 
   */
  async handleAction(operationId, action, params, op) {
    if (action === "cancel") {
      if (typeof this.autoUpdater?.cancelDownload === "function") {
        this.autoUpdater.cancelDownload();
        return { success: true };
      }
    }

    if (action === "retry") {
      if (typeof this.autoUpdater?.checkForUpdates === "function") {
        try {
          await this.autoUpdater.checkForUpdates();
          return { success: true };
        } catch (e) {
          return { success: false, message: e.message };
        }
      }
    }

    if (action === "install") {
      if (typeof this.autoUpdater?.installAndRelaunch === "function") {
        this.autoUpdater.installAndRelaunch();
        return { success: true };
      }
    }

    return undefined; // fallback to default handler
  }
}

module.exports = {
  QuickPillUpdaterProvider
};
