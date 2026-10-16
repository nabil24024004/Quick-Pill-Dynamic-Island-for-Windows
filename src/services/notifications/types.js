// @ts-check

/**
 * Notification priority levels
 */
const NOTIFICATION_PRIORITIES = Object.freeze({
  CRITICAL: "critical", // Urgent alarms, incoming voice/video calls, security alerts
  HIGH: "high",         // Direct messages, VIP contacts, immediate calendar events
  NORMAL: "normal",     // Standard notifications, emails, social alerts
  LOW: "low",           // Background sync, digests, promotional notices
});

/**
 * Notification lifecycle stages in Quick Pill
 */
const NOTIFICATION_LIFECYCLES = Object.freeze({
  ACTIVE: "active",
  SNOOZED: "snoozed",
  DISMISSED: "dismissed",
  ARCHIVED: "archived",
});

/**
 * Source application read state (must not be confused with local Quick Pill reviewed state)
 */
const NOTIFICATION_READ_STATES = Object.freeze({
  UNKNOWN: "unknown",
  UNREAD: "unread",
  READ: "read",
});

/**
 * Valid action types
 */
const NOTIFICATION_ACTION_TYPES = Object.freeze({
  OPEN: "open",
  REPLY: "reply",
  MARK_READ: "mark-read",
  SNOOZE_LOCAL: "snooze-local",
  SNOOZE_SOURCE: "snooze-source",
  DISMISS: "dismiss",
  ANSWER_CALL: "answer-call",
  DECLINE_CALL: "decline-call",
  CUSTOM: "custom",
});

/**
 * Sanitizes and trims string to prevent memory bloat or layout breakage
 * @param {any} val 
 * @param {number} [maxLength=200] 
 * @returns {string}
 */
function sanitizeString(val, maxLength = 200) {
  if (val === null || val === undefined) return "";
  const str = String(val).trim().replace(/[\r\n\t]+/g, " ");
  return str.length > maxLength ? str.slice(0, maxLength - 1) + "…" : str;
}

/**
 * Analyzes application name, title, and body to detect incoming voice or video calls
 * @param {string} appName 
 * @param {string} title 
 * @param {string} body 
 * @returns {{ isCall: boolean, callType: "voice" | "video" | null }}
 */
function detectCallInfo(appName = "", title = "", body = "") {
  const combined = `${appName} ${title} ${body}`.toLowerCase();
  const isWhatsApp = appName.toLowerCase().includes("whatsapp");
  const isDiscord = appName.toLowerCase().includes("discord");
  const isTeams = appName.toLowerCase().includes("teams");
  const isSkype = appName.toLowerCase().includes("skype");
  const isTelegram = appName.toLowerCase().includes("telegram");

  const callKeywords = ["incoming call", "voice call", "video call", "is calling", "incoming audio call", "call from"];
  const hasCallKeyword = callKeywords.some(k => combined.includes(k));

  if ((isWhatsApp || isDiscord || isTeams || isSkype || isTelegram) && hasCallKeyword) {
    const isVideo = combined.includes("video");
    return {
      isCall: true,
      callType: isVideo ? "video" : "voice"
    };
  }

  return { isCall: false, callType: null };
}

/**
 * Derives initial priority from notification content and application
 * @param {object} notif 
 * @returns {string}
 */
function classifyPriority(notif) {
  if (notif.isCall) return NOTIFICATION_PRIORITIES.CRITICAL;

  const appLower = (notif.applicationName || "").toLowerCase();
  const titleLower = (notif.title || "").toLowerCase();
  const bodyLower = (notif.body || "").toLowerCase();
  const combined = `${appLower} ${titleLower} ${bodyLower}`;

  // Security or urgent system alerts
  if (combined.includes("security alert") || combined.includes("critical") || combined.includes("battery low") || combined.includes("unauthorized")) {
    return NOTIFICATION_PRIORITIES.CRITICAL;
  }

  // Messaging / Direct communication apps
  if (appLower.includes("whatsapp") || appLower.includes("telegram") || appLower.includes("slack") || appLower.includes("discord") || appLower.includes("teams") || appLower.includes("signal")) {
    return NOTIFICATION_PRIORITIES.HIGH;
  }

  // Calendar / Reminder / Alarm
  if (combined.includes("reminder") || combined.includes("alarm") || combined.includes("meeting") || appLower.includes("calendar")) {
    return NOTIFICATION_PRIORITIES.HIGH;
  }

  // Low priority indicators: promotions, background sync, news
  if (combined.includes("promoted") || combined.includes("newsletter") || combined.includes("syncing in background") || combined.includes("daily digest") || combined.includes("trending")) {
    return NOTIFICATION_PRIORITIES.LOW;
  }

  return NOTIFICATION_PRIORITIES.NORMAL;
}

/**
 * Normalizes raw notification input from Windows or internal sources
 * @param {object} raw 
 * @param {string} [providerId="windows-notification-listener"] 
 * @returns {object} Normalized SmartNotification
 */
function normalizeNotification(raw, providerId = "windows-notification-listener") {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid notification input: must be an object");
  }

  const sourceNotificationId = raw.Id !== undefined ? String(raw.Id) : raw.sourceNotificationId ? String(raw.sourceNotificationId) : null;
  const id = raw.id ? String(raw.id) : (sourceNotificationId ? `${providerId}-${sourceNotificationId}` : `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  const applicationName = sanitizeString(raw.AppName || raw.applicationName || "Application", 60);
  const applicationId = raw.AppId || raw.applicationId || "";
  const title = sanitizeString(raw.Title || raw.title || "", 120);
  const body = sanitizeString(raw.Body || raw.body || "", 300);
  const icon = raw.Icon || raw.icon || raw.applicationIcon || "";

  // Call detection
  const { isCall, callType } = detectCallInfo(applicationName, title, body);

  // Sender extraction (e.g. "John: Hello there")
  let senderName = raw.senderName || "";
  let conversationId = raw.conversationId || "";
  if (!senderName && title.includes(":")) {
    const parts = title.split(":");
    senderName = parts[0].trim();
  }

  // Grouping ID: Default to application and sender/title stack
  const groupId = raw.groupId || `${applicationName.toLowerCase().replace(/[^a-z0-9]/g, "-")}::${(senderName || title).toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30)}`;

  let receivedAt = Date.now();
  if (raw.Timestamp) {
    const parsed = new Date(raw.Timestamp).getTime();
    if (!isNaN(parsed) && parsed > 0) receivedAt = parsed;
  } else if (typeof raw.receivedAt === "number") {
    receivedAt = raw.receivedAt;
  }

  const priority = raw.priority || classifyPriority({ isCall, applicationName, title, body });

  // Default capabilities
  const capabilities = Array.isArray(raw.capabilities) ? raw.capabilities : [
    { type: NOTIFICATION_ACTION_TYPES.OPEN, supported: true, label: "Open App" },
    { type: NOTIFICATION_ACTION_TYPES.DISMISS, supported: true, label: "Dismiss" },
    { type: NOTIFICATION_ACTION_TYPES.SNOOZE_LOCAL, supported: true, label: "Snooze" },
  ];

  return {
    id,
    sourceNotificationId,
    providerId: String(providerId),
    applicationId,
    applicationName,
    applicationIcon: icon,
    title,
    body,
    senderName: senderName || undefined,
    conversationId: conversationId || undefined,
    isCall,
    callType,
    receivedAt,
    updatedAt: Date.now(),
    priority,
    readState: raw.readState || NOTIFICATION_READ_STATES.UNKNOWN,
    localReviewed: Boolean(raw.localReviewed),
    lifecycle: raw.lifecycle || NOTIFICATION_LIFECYCLES.ACTIVE,
    groupId,
    capabilities,
    snoozedUntil: raw.snoozedUntil ? Number(raw.snoozedUntil) : null,
    dismissedAt: raw.dismissedAt ? Number(raw.dismissedAt) : null,
    actionState: raw.actionState || null,
  };
}

module.exports = {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_LIFECYCLES,
  NOTIFICATION_READ_STATES,
  NOTIFICATION_ACTION_TYPES,
  sanitizeString,
  detectCallInfo,
  classifyPriority,
  normalizeNotification,
};
