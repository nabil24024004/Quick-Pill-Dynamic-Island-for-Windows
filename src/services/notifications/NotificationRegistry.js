// @ts-check
const { EventEmitter } = require("events");
const {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_LIFECYCLES,
  NOTIFICATION_READ_STATES,
  normalizeNotification,
  sanitizeString,
} = require("./types");

class NotificationRegistry extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {number} [options.maxHistory=100]
   * @param {number} [options.batchDelayMs=50]
   * @param {Function} [options.savePersistence]
   * @param {object} [options.initialPersistedData]
   */
  constructor(options = {}) {
    super();
    this.maxHistory = options.maxHistory || 100;
    this.batchDelayMs = options.batchDelayMs || 50;
    this.savePersistence = options.savePersistence || null;

    /** @type {Map<string, object>} */
    this.activeNotifications = new Map();

    /** @type {Map<string, object>} */
    this.snoozedNotifications = new Map();

    /** @type {Map<string, NodeJS.Timeout>} */
    this.snoozeTimers = new Map();

    /** @type {object[]} */
    this.history = [];

    /** @type {object[]} */
    this.recentDismissals = [];

    /** @type {Set<string>} */
    this.excludedApps = new Set();

    /** @type {boolean} */
    this.hidePreviews = false;

    this._pendingEmit = false;
    this._batchTimeout = null;

    // Load initial persisted data if present
    if (options.initialPersistedData) {
      this._loadInitialData(options.initialPersistedData);
    }
  }

  _loadInitialData(data) {
    try {
      if (Array.isArray(data.snoozed)) {
        for (const item of data.snoozed) {
          const norm = normalizeNotification(item, item.providerId);
          norm.lifecycle = NOTIFICATION_LIFECYCLES.SNOOZED;
          this.snoozedNotifications.set(norm.id, norm);
          this._scheduleSnoozeTimer(norm);
        }
      }
      if (Array.isArray(data.history)) {
        this.history = data.history.slice(0, this.maxHistory);
      }
      if (Array.isArray(data.excludedApps)) {
        this.excludedApps = new Set(data.excludedApps);
      }
      if (typeof data.hidePreviews === "boolean") {
        this.hidePreviews = data.hidePreviews;
      }
    } catch (e) {
      console.warn("Failed to load persisted notification data:", e);
    }
  }

  /**
   * Synchronizes incoming notifications from a capture source
   * @param {object[]} incomingRawList 
   * @param {string} [providerId="windows-notification-listener"] 
   * @returns {{ added: object[], updated: object[], removed: object[] }}
   */
  syncIncoming(incomingRawList, providerId = "windows-notification-listener") {
    const now = Date.now();
    const incomingNormalized = [];

    for (const raw of incomingRawList) {
      try {
        const notif = normalizeNotification(raw, providerId);
        // Exclude if app is in excluded list
        if (this.excludedApps.has(notif.applicationName.toLowerCase())) {
          continue;
        }
        incomingNormalized.push(notif);
      } catch (err) {
        // Skip malformed individual notification without crashing
      }
    }

    const added = [];
    const updated = [];
    const incomingIds = new Set();

    for (const notif of incomingNormalized) {
      incomingIds.add(notif.id);

      // If notification is currently snoozed, keep it snoozed
      if (this.snoozedNotifications.has(notif.id)) {
        continue;
      }

      if (this.activeNotifications.has(notif.id)) {
        // Update existing notification while preserving local state
        const existing = this.activeNotifications.get(notif.id);
        const hasContentChanged = existing.title !== notif.title || existing.body !== notif.body;

        existing.title = notif.title;
        existing.body = notif.body;
        existing.applicationIcon = notif.applicationIcon || existing.applicationIcon;
        existing.capabilities = notif.capabilities || existing.capabilities;
        existing.updatedAt = now;

        if (hasContentChanged) {
          existing.localReviewed = false;
        }

        updated.push(existing);
      } else {
        // New notification arrived
        this.activeNotifications.set(notif.id, notif);
        added.push(notif);
      }
    }

    // Identify active notifications that were removed at the Windows source
    const removed = [];
    for (const [id, notif] of this.activeNotifications.entries()) {
      if (notif.providerId === providerId && notif.sourceNotificationId && !incomingIds.has(id)) {
        this.activeNotifications.delete(id);
        notif.lifecycle = NOTIFICATION_LIFECYCLES.DISMISSED;
        notif.dismissedAt = now;
        this._addToHistory(notif);
        removed.push(notif);
      }
    }

    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      this._scheduleEmit(added.length > 0);
      this._persist();
    }

    return { added, updated, removed };
  }

  _findNotification(id) {
    if (!id) return null;
    const strId = String(id);
    if (this.activeNotifications.has(strId)) return this.activeNotifications.get(strId);
    if (this.snoozedNotifications.has(strId)) return this.snoozedNotifications.get(strId);
    for (const n of this.activeNotifications.values()) {
      if (n.sourceNotificationId === strId) return n;
    }
    for (const n of this.snoozedNotifications.values()) {
      if (n.sourceNotificationId === strId) return n;
    }
    return null;
  }

  /**
   * Snoozes a notification for a duration or until a timestamp
   * @param {string} id 
   * @param {number} [durationMs=300000] // Default 5 mins
   * @param {number} [untilTimestamp=null] 
   * @returns {boolean}
   */
  snooze(id, durationMs = 300000, untilTimestamp = null) {
    const notif = this._findNotification(id);
    if (!notif) return false;

    const actualId = notif.id;
    const deadline = untilTimestamp || (Date.now() + Math.max(10, durationMs));
    notif.lifecycle = NOTIFICATION_LIFECYCLES.SNOOZED;
    notif.snoozedUntil = deadline;
    notif.updatedAt = Date.now();

    this.activeNotifications.delete(actualId);
    this.snoozedNotifications.set(actualId, notif);

    this._scheduleSnoozeTimer(notif);
    this._scheduleEmit(true);
    this._persist();
    return true;
  }

  /**
   * Resurfaces a snoozed notification back to active
   * @param {string} id 
   * @returns {boolean}
   */
  cancelSnooze(id) {
    const notif = this._findNotification(id);
    if (!notif || notif.lifecycle !== NOTIFICATION_LIFECYCLES.SNOOZED) return false;
    const actualId = notif.id;

    if (this.snoozeTimers.has(actualId)) {
      clearTimeout(this.snoozeTimers.get(actualId));
      this.snoozeTimers.delete(actualId);
    }

    notif.lifecycle = NOTIFICATION_LIFECYCLES.ACTIVE;
    notif.snoozedUntil = null;
    notif.updatedAt = Date.now();

    this.snoozedNotifications.delete(actualId);
    this.activeNotifications.set(actualId, notif);

    this._scheduleEmit(true);
    this._persist();
    return true;
  }

  /**
   * Checks for due snoozed notifications and resurfaces them
   * Call on interval and on system resume
   */
  checkSnoozedDue() {
    const now = Date.now();
    let anyResurfaced = false;

    for (const [id, notif] of Array.from(this.snoozedNotifications.entries())) {
      if (notif.snoozedUntil && notif.snoozedUntil <= now) {
        if (this.snoozeTimers.has(id)) {
          clearTimeout(this.snoozeTimers.get(id));
          this.snoozeTimers.delete(id);
        }

        notif.lifecycle = NOTIFICATION_LIFECYCLES.ACTIVE;
        notif.snoozedUntil = null;
        notif.updatedAt = now;
        notif.localReviewed = false; // Trigger alert on resurface

        this.snoozedNotifications.delete(id);
        this.activeNotifications.set(id, notif);
        anyResurfaced = true;
      }
    }

    if (anyResurfaced) {
      this._scheduleEmit(true);
      this._persist();
    }
  }

  /**
   * Dismisses an individual notification
   * @param {string} id 
   * @returns {object|null} The dismissed notification
   */
  dismiss(id) {
    const notif = this._findNotification(id);
    if (!notif) return null;
    const actualId = notif.id;

    const fromActive = this.activeNotifications.has(actualId);
    if (fromActive) {
      this.activeNotifications.delete(actualId);
    } else {
      this.snoozedNotifications.delete(actualId);
      if (this.snoozeTimers.has(actualId)) {
        clearTimeout(this.snoozeTimers.get(actualId));
        this.snoozeTimers.delete(actualId);
      }
    }

    notif.lifecycle = NOTIFICATION_LIFECYCLES.DISMISSED;
    notif.dismissedAt = Date.now();

    this._addToHistory(notif);
    this.recentDismissals = [notif, ...this.recentDismissals.filter(d => d.id !== actualId)].slice(0, 10);

    this._scheduleEmit(true);
    this._persist();
    return notif;
  }

  /**
   * Undoes the most recent dismissal or a specific dismissal by ID
   * @param {string} [id] 
   * @returns {boolean}
   */
  undoDismiss(id) {
    let target = null;
    if (id) {
      target = this.recentDismissals.find(d => d.id === id);
    } else if (this.recentDismissals.length > 0) {
      target = this.recentDismissals[0];
    }

    if (!target) return false;

    this.recentDismissals = this.recentDismissals.filter(d => d.id !== target.id);
    this.history = this.history.filter(h => h.id !== target.id);

    target.lifecycle = NOTIFICATION_LIFECYCLES.ACTIVE;
    target.dismissedAt = null;
    target.updatedAt = Date.now();

    this.activeNotifications.set(target.id, target);
    this._scheduleEmit(true);
    this._persist();
    return true;
  }

  /**
   * Dismisses all notifications in a group
   * @param {string} groupId 
   * @returns {object[]} Dismissed notifications
   */
  dismissGroup(groupId) {
    const dismissed = [];
    for (const [id, notif] of Array.from(this.activeNotifications.entries())) {
      if (notif.groupId === groupId) {
        const d = this.dismiss(id);
        if (d) dismissed.push(d);
      }
    }
    return dismissed;
  }

  /**
   * Clears all active notifications
   * @returns {object[]}
   */
  clearAllActive() {
    const cleared = [];
    for (const id of Array.from(this.activeNotifications.keys())) {
      const d = this.dismiss(id);
      if (d) cleared.push(d);
    }
    return cleared;
  }

  /**
   * Marks a notification as reviewed locally in Quick Pill
   * @param {string} id 
   */
  markReviewed(id) {
    const notif = this._findNotification(id);
    if (notif && !notif.localReviewed) {
      notif.localReviewed = true;
      this._scheduleEmit(false);
      return true;
    }
    return false;
  }

  /**
   * Marks all notifications as reviewed locally
   */
  markAllReviewed() {
    let changed = false;
    for (const notif of this.activeNotifications.values()) {
      if (!notif.localReviewed) {
        notif.localReviewed = true;
        changed = true;
      }
    }
    if (changed) this._scheduleEmit(false);
  }

  /**
   * Updates an action's transient state (e.g. pending, success, failed)
   * @param {string} id 
   * @param {object} actionState 
   */
  updateActionState(id, actionState) {
    const notif = this._findNotification(id);
    if (notif) {
      notif.actionState = actionState;
      this._scheduleEmit(true);
      return true;
    }
    return false;
  }

  /**
   * Sets app exclusion
   * @param {string} appName 
   * @param {boolean} excluded 
   */
  setAppExcluded(appName, excluded) {
    const lower = appName.toLowerCase();
    if (excluded) {
      this.excludedApps.add(lower);
      // Remove any active notifications from this app
      for (const [id, notif] of Array.from(this.activeNotifications.entries())) {
        if (notif.applicationName.toLowerCase() === lower) {
          this.dismiss(id);
        }
      }
    } else {
      this.excludedApps.delete(lower);
    }
    this._persist();
    this._scheduleEmit(true);
  }

  /**
   * Sets preview hiding privacy setting
   * @param {boolean} hide 
   */
  setHidePreviews(hide) {
    this.hidePreviews = Boolean(hide);
    this._persist();
    this._scheduleEmit(true);
  }

  /**
   * Clears notification history
   */
  clearHistory() {
    this.history = [];
    this.recentDismissals = [];
    this._scheduleEmit(true);
    this._persist();
  }

  /**
   * Computes grouped notifications and stacks
   * @param {object[]} activeList 
   * @returns {{ standalone: object[], groups: object[] }}
   */
  computeGroups(activeList) {
    const groupMap = new Map();

    for (const notif of activeList) {
      // Calls are urgent and kept standalone
      if (notif.isCall) {
        continue;
      }

      const gid = notif.groupId || notif.applicationName;
      if (!groupMap.has(gid)) {
        groupMap.set(gid, []);
      }
      groupMap.get(gid).push(notif);
    }

    const groups = [];
    const groupedItemIds = new Set();

    for (const [groupId, items] of groupMap.entries()) {
      if (items.length > 1) {
        // Sort items by receivedAt desc
        items.sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
        const latest = items[0];
        
        let priority = NOTIFICATION_PRIORITIES.NORMAL;
        if (items.some(i => i.priority === NOTIFICATION_PRIORITIES.CRITICAL)) {
          priority = NOTIFICATION_PRIORITIES.CRITICAL;
        } else if (items.some(i => i.priority === NOTIFICATION_PRIORITIES.HIGH)) {
          priority = NOTIFICATION_PRIORITIES.HIGH;
        }

        groups.push({
          groupId,
          applicationName: latest.applicationName,
          applicationIcon: latest.applicationIcon,
          count: items.length,
          priority,
          latestItem: latest,
          items: [...items],
          unreviewedCount: items.filter(i => !i.localReviewed).length
        });

        for (const item of items) {
          groupedItemIds.add(item.id);
        }
      }
    }

    const standalone = activeList.filter(i => !groupedItemIds.has(i.id));

    return { standalone, groups };
  }

  /**
   * Formats a complete sanitized snapshot of the notification center
   * @returns {object}
   */
  getSnapshot() {
    const active = Array.from(this.activeNotifications.values());
    const snoozed = Array.from(this.snoozedNotifications.values());

    // Sort active notifications: calls first, then by priority, then by recency
    const priorityWeight = {
      [NOTIFICATION_PRIORITIES.CRITICAL]: 4,
      [NOTIFICATION_PRIORITIES.HIGH]: 3,
      [NOTIFICATION_PRIORITIES.NORMAL]: 2,
      [NOTIFICATION_PRIORITIES.LOW]: 1,
    };

    active.sort((a, b) => {
      if (a.isCall && !b.isCall) return -1;
      if (!a.isCall && b.isCall) return 1;
      const pwA = priorityWeight[a.priority] || 2;
      const pwB = priorityWeight[b.priority] || 2;
      if (pwA !== pwB) return pwB - pwA;
      return (b.receivedAt || 0) - (a.receivedAt || 0);
    });

    // Grouping
    const { standalone, groups } = this.computeGroups(active);

    // Low-priority collapsing: filter low priority items (except calls or critical)
    const lowPriorityItems = active.filter(i => i.priority === NOTIFICATION_PRIORITIES.LOW && !i.isCall);
    const lowPrioritySummary = {
      count: lowPriorityItems.length,
      items: lowPriorityItems.slice(0, 5),
    };

    const unreviewedCount = active.filter(i => !i.localReviewed).length;
    const criticalCount = active.filter(i => i.priority === NOTIFICATION_PRIORITIES.CRITICAL || i.isCall).length;
    const incomingCall = active.find(i => i.isCall) || null;

    // Apply privacy masking to snapshot if hidePreviews enabled
    const applyMask = (item) => {
      if (!this.hidePreviews) return item;
      return {
        ...item,
        title: item.isCall ? item.title : `${item.applicationName} Notification`,
        body: item.isCall ? item.body : "Notification content hidden by privacy setting",
        senderName: undefined,
      };
    };

    return {
      active: active.map(applyMask),
      standalone: standalone.map(applyMask),
      groups: groups.map(g => ({
        ...g,
        latestItem: applyMask(g.latestItem),
        items: g.items.map(applyMask)
      })),
      snoozed: snoozed.map(applyMask),
      history: this.history.slice(0, 50).map(applyMask),
      recentDismissals: this.recentDismissals.map(applyMask),
      lowPrioritySummary: {
        count: lowPrioritySummary.count,
        items: lowPrioritySummary.items.map(applyMask)
      },
      incomingCall: incomingCall ? applyMask(incomingCall) : null,
      settings: {
        hidePreviews: this.hidePreviews,
        excludedApps: Array.from(this.excludedApps),
      },
      stats: {
        totalActive: active.length,
        unreviewedCount,
        snoozedCount: snoozed.length,
        criticalCount,
        historyCount: this.history.length,
        hasUndo: this.recentDismissals.length > 0
      }
    };
  }

  _scheduleSnoozeTimer(notif) {
    if (!notif.snoozedUntil) return;
    if (this.snoozeTimers.has(notif.id)) {
      clearTimeout(this.snoozeTimers.get(notif.id));
    }

    const delay = Math.max(100, notif.snoozedUntil - Date.now());
    const timer = setTimeout(() => {
      this.checkSnoozedDue();
    }, delay);

    this.snoozeTimers.set(notif.id, timer);
  }

  _addToHistory(notif) {
    this.history = [notif, ...this.history.filter(h => h.id !== notif.id)].slice(0, this.maxHistory);
  }

  _persist() {
    if (typeof this.savePersistence === "function") {
      try {
        this.savePersistence({
          snoozed: Array.from(this.snoozedNotifications.values()),
          history: this.history.slice(0, 50),
          excludedApps: Array.from(this.excludedApps),
          hidePreviews: this.hidePreviews
        });
      } catch (err) {
        console.warn("Failed to persist notification state:", err);
      }
    }
  }

  _scheduleEmit(immediate = false) {
    if (immediate) {
      if (this._batchTimeout) {
        clearTimeout(this._batchTimeout);
        this._batchTimeout = null;
      }
      this._pendingEmit = false;
      this.emit("change", this.getSnapshot());
      return;
    }

    if (this._pendingEmit) return;
    this._pendingEmit = true;

    this._batchTimeout = setTimeout(() => {
      this._pendingEmit = false;
      this._batchTimeout = null;
      this.emit("change", this.getSnapshot());
    }, this.batchDelayMs);
  }

  destroy() {
    if (this._batchTimeout) clearTimeout(this._batchTimeout);
    for (const timer of this.snoozeTimers.values()) {
      clearTimeout(timer);
    }
    this.snoozeTimers.clear();
    this.activeNotifications.clear();
    this.snoozedNotifications.clear();
    this.history = [];
    this.recentDismissals = [];
    this.removeAllListeners();
  }
}

module.exports = {
  NotificationRegistry,
};
