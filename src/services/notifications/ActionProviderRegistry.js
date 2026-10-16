// @ts-check
const { NOTIFICATION_ACTION_TYPES } = require("./types");

class ActionProviderRegistry {
  /**
   * @param {import("./NotificationRegistry").NotificationRegistry} registry
   * @param {object} [options]
   */
  constructor(registry, options = {}) {
    this.registry = registry;
    this.options = options;
    /** @type {Map<string, object>} */
    this.providers = new Map();
  }

  /**
   * Registers an action provider
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
   * Executes a requested action on a notification
   * @param {string} notificationId 
   * @param {string} actionType 
   * @param {object} [params={}] 
   * @returns {Promise<{ success: boolean, message?: string, actionType: string }>}
   */
  async executeAction(notificationId, actionType, params = {}) {
    const notif = (typeof this.registry._findNotification === "function" ? this.registry._findNotification(notificationId) : null) ||
      this.registry.activeNotifications?.get(notificationId) ||
      this.registry.snoozedNotifications?.get(notificationId) ||
      this.registry.history?.find(h => h.id === notificationId || h.sourceNotificationId === String(notificationId));

    if (!notif) {
      return {
        success: false,
        message: "Notification not found",
        actionType,
      };
    }

    // Built-in Action: Local Snooze
    if (actionType === NOTIFICATION_ACTION_TYPES.SNOOZE_LOCAL) {
      const durationMs = params.durationMs || (params.minutes ? params.minutes * 60000 : 300000);
      const untilTimestamp = params.untilTimestamp || null;
      const success = this.registry.snooze(notificationId, durationMs, untilTimestamp);
      return {
        success,
        message: success ? `Snoozed for ${Math.round(durationMs / 60000)} minutes` : "Failed to snooze",
        actionType,
      };
    }

    // Built-in Action: Cancel Snooze
    if (actionType === "cancel-snooze") {
      const success = this.registry.cancelSnooze(notificationId);
      return {
        success,
        message: success ? "Snooze cancelled" : "Failed to cancel snooze",
        actionType,
      };
    }

    // Built-in Action: Local Mark Reviewed
    if (actionType === "mark-reviewed") {
      const success = this.registry.markReviewed(notificationId);
      return { success, actionType };
    }

    // Built-in Action: Dismiss
    if (actionType === NOTIFICATION_ACTION_TYPES.DISMISS) {
      // 1. Remove at Windows notification source if supported
      const dismissalProvider = this.providers.get("windows-dismissal");
      if (dismissalProvider && typeof dismissalProvider.dismissSource === "function" && notif.sourceNotificationId) {
        try {
          await dismissalProvider.dismissSource(notif.sourceNotificationId);
        } catch (_) {}
      }

      // 2. Remove locally from registry
      const dismissed = this.registry.dismiss(notificationId);
      return {
        success: Boolean(dismissed),
        actionType,
      };
    }

    // Find custom provider responsible for this action or providerId
    let targetProvider = this.providers.get(notif.providerId);
    if (!targetProvider) {
      // Check specialized providers
      if (notif.applicationName?.toLowerCase().includes("whatsapp") && this.providers.has("whatsapp-actions")) {
        targetProvider = this.providers.get("whatsapp-actions");
      } else if (this.providers.has("app-focus") && actionType === NOTIFICATION_ACTION_TYPES.OPEN) {
        targetProvider = this.providers.get("app-focus");
      }
    }

    if (targetProvider && typeof targetProvider.handleAction === "function") {
      // Mark action pending
      this.registry.updateActionState(notificationId, {
        actionType,
        status: "pending",
        message: "Processing…"
      });

      try {
        const result = await targetProvider.handleAction(notif, actionType, params);
        const success = Boolean(result?.success);

        this.registry.updateActionState(notificationId, {
          actionType,
          status: success ? "success" : "failed",
          message: result?.message || (success ? "Done" : "Action failed")
        });

        return {
          success,
          message: result?.message,
          actionType,
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.registry.updateActionState(notificationId, {
          actionType,
          status: "failed",
          message: errMsg
        });

        return {
          success: false,
          message: errMsg,
          actionType,
        };
      }
    }

    return {
      success: false,
      message: `Action ${actionType} is not supported for this notification`,
      actionType,
    };
  }

  destroy() {
    this.providers.clear();
  }
}

module.exports = {
  ActionProviderRegistry,
};
