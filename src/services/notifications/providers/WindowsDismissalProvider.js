// @ts-check

class WindowsDismissalProvider {
  /**
   * @param {Function} removeNotificationSourceFn
   */
  constructor(removeNotificationSourceFn) {
    this.providerId = "windows-dismissal";
    this.removeNotificationSourceFn = removeNotificationSourceFn;
  }

  /**
   * Removes notification from the Windows Action Center / Notification Listener
   * @param {string|number} sourceNotificationId 
   * @returns {Promise<boolean>}
   */
  async dismissSource(sourceNotificationId) {
    if (!sourceNotificationId || typeof this.removeNotificationSourceFn !== "function") {
      return false;
    }
    try {
      return await this.removeNotificationSourceFn(sourceNotificationId);
    } catch (err) {
      console.warn("Failed to remove notification at Windows source:", err);
      return false;
    }
  }

  async handleAction(notif, actionType, params) {
    if (actionType === "dismiss") {
      if (notif.sourceNotificationId) {
        await this.dismissSource(notif.sourceNotificationId);
      }
      return { success: true };
    }
    return { success: false, message: `Unsupported action ${actionType}` };
  }
}

module.exports = {
  WindowsDismissalProvider,
};
