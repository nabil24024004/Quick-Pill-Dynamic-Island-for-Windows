// @ts-check

class AppFocusProvider {
  /**
   * @param {Function} focusAppFn
   * @param {Function} [openExternalFn]
   */
  constructor(focusAppFn, openExternalFn) {
    this.providerId = "app-focus";
    this.focusAppFn = focusAppFn;
    this.openExternalFn = openExternalFn;
  }

  async handleAction(notif, actionType, params) {
    if (actionType === "open") {
      const appId = notif.applicationId || notif.applicationName;
      if (typeof this.focusAppFn === "function" && appId) {
        try {
          const focused = await this.focusAppFn(appId, notif.applicationName);
          if (focused) return { success: true };
        } catch (_) {}
      }

      // If opening via external protocol or app name fallback
      if (typeof this.openExternalFn === "function" && params.uri) {
        try {
          await this.openExternalFn(params.uri);
          return { success: true };
        } catch (e) {
          return { success: false, message: e.message };
        }
      }

      return { success: true, message: `Brought ${notif.applicationName} to foreground` };
    }

    return { success: false, message: `Unsupported action ${actionType}` };
  }
}

module.exports = {
  AppFocusProvider,
};
