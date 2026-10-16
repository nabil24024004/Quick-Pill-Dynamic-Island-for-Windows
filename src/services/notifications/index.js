// @ts-check
const { NotificationRegistry } = require("./NotificationRegistry");
const { ActionProviderRegistry } = require("./ActionProviderRegistry");
const { WindowsDismissalProvider } = require("./providers/WindowsDismissalProvider");
const { AppFocusProvider } = require("./providers/AppFocusProvider");
const { WhatsAppActionProvider } = require("./providers/WhatsAppActionProvider");
const types = require("./types");

/**
 * Initializes and wires the complete Smart Notification Actions engine
 * @param {object} [options]
 * @param {Function} [options.removeNotificationSource]
 * @param {Function} [options.focusApp]
 * @param {Function} [options.openExternal]
 * @param {Function} [options.savePersistence]
 * @param {object} [options.initialPersistedData]
 */
function createNotificationEngine(options = {}) {
  const registry = new NotificationRegistry({
    savePersistence: options.savePersistence,
    initialPersistedData: options.initialPersistedData,
  });

  const actions = new ActionProviderRegistry(registry);

  const dismissalProvider = new WindowsDismissalProvider(options.removeNotificationSource);
  const focusProvider = new AppFocusProvider(options.focusApp, options.openExternal);
  const whatsAppProvider = new WhatsAppActionProvider({
    focusAppFn: options.focusApp,
    openExternalFn: options.openExternal,
  });

  actions.registerProvider("windows-dismissal", dismissalProvider);
  actions.registerProvider("app-focus", focusProvider);
  actions.registerProvider("whatsapp-actions", whatsAppProvider);

  // Forward registry changes
  registry.on("change", (snapshot) => {
    // Engine can emit updates directly
  });

  return {
    registry,
    actions,
    providers: {
      dismissal: dismissalProvider,
      focus: focusProvider,
      whatsApp: whatsAppProvider,
    },
    syncNotifications: (rawList, providerId) => registry.syncIncoming(rawList, providerId),
    executeAction: (id, actionType, params) => actions.executeAction(id, actionType, params),
    snooze: (id, durationMs, untilTimestamp) => registry.snooze(id, durationMs, untilTimestamp),
    cancelSnooze: (id) => registry.cancelSnooze(id),
    dismiss: (id) => actions.executeAction(id, types.NOTIFICATION_ACTION_TYPES.DISMISS),
    undoDismiss: (id) => registry.undoDismiss(id),
    dismissGroup: (groupId) => registry.dismissGroup(groupId),
    clearAllActive: () => registry.clearAllActive(),
    markReviewed: (id) => registry.markReviewed(id),
    markAllReviewed: () => registry.markAllReviewed(),
    getSnapshot: () => registry.getSnapshot(),
    setHidePreviews: (hide) => registry.setHidePreviews(hide),
    setAppExcluded: (app, excluded) => registry.setAppExcluded(app, excluded),
    clearHistory: () => registry.clearHistory(),
    destroy: () => {
      registry.destroy();
      actions.destroy();
    }
  };
}

module.exports = {
  createNotificationEngine,
  NotificationRegistry,
  ActionProviderRegistry,
  WindowsDismissalProvider,
  AppFocusProvider,
  WhatsAppActionProvider,
  ...types,
};
