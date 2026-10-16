// @ts-check
const { NOTIFICATION_ACTION_TYPES } = require("../types");

class WhatsAppActionProvider {
  /**
   * @param {object} options
   * @param {Function} options.focusAppFn
   * @param {Function} [options.openExternalFn]
   */
  constructor(options) {
    this.providerId = "whatsapp-actions";
    this.focusAppFn = options.focusAppFn;
    this.openExternalFn = options.openExternalFn;
  }

  /**
   * Returns capabilities for WhatsApp notifications
   * @param {object} notif 
   */
  getCapabilities(notif) {
    if (notif.isCall) {
      return [
        { type: NOTIFICATION_ACTION_TYPES.OPEN, supported: true, label: "Open WhatsApp" },
        { type: NOTIFICATION_ACTION_TYPES.ANSWER_CALL, supported: true, label: "View Call" },
        { type: NOTIFICATION_ACTION_TYPES.DISMISS, supported: true, label: "Dismiss" },
      ];
    }

    return [
      { type: NOTIFICATION_ACTION_TYPES.OPEN, supported: true, label: "Open Chat" },
      { type: NOTIFICATION_ACTION_TYPES.REPLY, supported: true, label: "Reply" },
      { type: NOTIFICATION_ACTION_TYPES.SNOOZE_LOCAL, supported: true, label: "Snooze" },
      { type: NOTIFICATION_ACTION_TYPES.DISMISS, supported: true, label: "Dismiss" },
    ];
  }

  async handleAction(notif, actionType, params = {}) {
    // Open action
    if (actionType === NOTIFICATION_ACTION_TYPES.OPEN || actionType === NOTIFICATION_ACTION_TYPES.ANSWER_CALL) {
      if (typeof this.focusAppFn === "function") {
        await this.focusAppFn("WhatsApp");
      }
      if (typeof this.openExternalFn === "function") {
        try {
          await this.openExternalFn("whatsapp://");
        } catch (_) {}
      }
      return { success: true, message: "WhatsApp opened" };
    }

    // Reply action
    if (actionType === NOTIFICATION_ACTION_TYPES.REPLY) {
      const text = String(params.text || "").trim();
      if (!text) {
        return { success: false, message: "Reply text cannot be empty" };
      }

      // Open WhatsApp send link
      const targetPhone = params.phone || notif.conversationId || "";
      if (typeof this.openExternalFn === "function") {
        const query = targetPhone 
          ? `phone=${encodeURIComponent(targetPhone.replace(/[^0-9+]/g, ""))}&text=${encodeURIComponent(text)}`
          : `text=${encodeURIComponent(text)}`;
        const url = `whatsapp://send?${query}`;
        try {
          await this.openExternalFn(url);
          return {
            success: true,
            message: targetPhone ? "Reply launched in WhatsApp chat" : "Reply draft opened in WhatsApp",
          };
        } catch (e) {
          return { success: false, message: e.message };
        }
      }

      // Fallback: bring WhatsApp to foreground and explain limitation honestly
      if (typeof this.focusAppFn === "function") {
        await this.focusAppFn("WhatsApp");
      }
      return {
        success: false,
        message: "Direct background reply requires WhatsApp integration. Opened chat.",
      };
    }

    if (actionType === NOTIFICATION_ACTION_TYPES.DECLINE_CALL) {
      return {
        success: false,
        message: "Windows notification listener does not support declining third-party VoIP calls directly.",
      };
    }

    return { success: false, message: `Unsupported action ${actionType}` };
  }
}

module.exports = {
  WhatsAppActionProvider,
};
