const test = require("node:test");
const assert = require("node:assert");

const {
  createNotificationEngine,
  NotificationRegistry,
  ActionProviderRegistry,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_LIFECYCLES,
  NOTIFICATION_READ_STATES,
  NOTIFICATION_ACTION_TYPES,
  sanitizeString,
  detectCallInfo,
  classifyPriority,
  normalizeNotification,
} = require("../src/services/notifications");

test("types & sanitization - string sanitizing and call detection", () => {
  assert.strictEqual(sanitizeString("  hello world  "), "hello world");
  assert.strictEqual(sanitizeString("line 1\r\nline 2\t"), "line 1 line 2");
  assert.strictEqual(sanitizeString(null), "");

  // Voice call detection
  const waCall = detectCallInfo("WhatsApp", "Incoming call", "John Doe is calling you");
  assert.strictEqual(waCall.isCall, true);
  assert.strictEqual(waCall.callType, "voice");

  // Video call detection
  const teamsCall = detectCallInfo("Microsoft Teams", "Incoming video call", "Alice is calling");
  assert.strictEqual(teamsCall.isCall, true);
  assert.strictEqual(teamsCall.callType, "video");

  // Non-call notification
  const normalMsg = detectCallInfo("WhatsApp", "John Doe", "Hey, are you free?");
  assert.strictEqual(normalMsg.isCall, false);
  assert.strictEqual(normalMsg.callType, null);
});

test("priority classification - assigns correct priority tiers", () => {
  // Call -> Critical
  assert.strictEqual(
    classifyPriority({ isCall: true, applicationName: "WhatsApp" }),
    NOTIFICATION_PRIORITIES.CRITICAL
  );

  // Security alert -> Critical
  assert.strictEqual(
    classifyPriority({ applicationName: "Windows Security", title: "Critical security alert", body: "Threat detected" }),
    NOTIFICATION_PRIORITIES.CRITICAL
  );

  // Messaging -> High
  assert.strictEqual(
    classifyPriority({ applicationName: "Slack", title: "General", body: "Meeting starting" }),
    NOTIFICATION_PRIORITIES.HIGH
  );

  // Low priority -> Low
  assert.strictEqual(
    classifyPriority({ applicationName: "Store", title: "Daily digest and newsletter", body: "Promoted products" }),
    NOTIFICATION_PRIORITIES.LOW
  );

  // Default -> Normal
  assert.strictEqual(
    classifyPriority({ applicationName: "Spotify", title: "Now Playing", body: "Song Title" }),
    NOTIFICATION_PRIORITIES.NORMAL
  );
});

test("normalizeNotification - converts raw Windows toast to SmartNotification", () => {
  const raw = {
    Id: 42,
    AppName: "WhatsApp",
    Title: "Jane: Project update",
    Body: "All tests are passing nicely!",
    Timestamp: new Date().toISOString()
  };

  const norm = normalizeNotification(raw, "windows-notification-listener");
  assert.strictEqual(norm.id, "windows-notification-listener-42");
  assert.strictEqual(norm.sourceNotificationId, "42");
  assert.strictEqual(norm.applicationName, "WhatsApp");
  assert.strictEqual(norm.senderName, "Jane");
  assert.strictEqual(norm.title, "Jane: Project update");
  assert.strictEqual(norm.body, "All tests are passing nicely!");
  assert.strictEqual(norm.lifecycle, NOTIFICATION_LIFECYCLES.ACTIVE);
  assert.strictEqual(norm.readState, NOTIFICATION_READ_STATES.UNKNOWN);
  assert.strictEqual(norm.localReviewed, false);
});

test("NotificationRegistry - syncs incoming, tracks lifecycle, and groups into stacks", () => {
  const registry = new NotificationRegistry({ batchDelayMs: 5 });

  const rawList = [
    { Id: 1, AppName: "WhatsApp", Title: "Alice: Hello", Body: "How are you?" },
    { Id: 2, AppName: "WhatsApp", Title: "Alice: Followup", Body: "Let me know when free" },
    { Id: 3, AppName: "Spotify", Title: "Now Playing", Body: "Track 1" },
  ];

  const syncRes = registry.syncIncoming(rawList, "windows-notification-listener");
  assert.strictEqual(syncRes.added.length, 3);

  const snapshot = registry.getSnapshot();
  assert.strictEqual(snapshot.active.length, 3);
  assert.strictEqual(snapshot.stats.totalActive, 3);
  assert.strictEqual(snapshot.stats.unreviewedCount, 3);

  // Groups check: Alice's 2 WhatsApp notifications should form a group stack
  assert.strictEqual(snapshot.groups.length, 1);
  assert.strictEqual(snapshot.groups[0].count, 2);
  assert.strictEqual(snapshot.groups[0].applicationName, "WhatsApp");
  assert.strictEqual(snapshot.standalone.length, 1);
  assert.strictEqual(snapshot.standalone[0].applicationName, "Spotify");

  // Sync again with Id 3 removed
  const syncRes2 = registry.syncIncoming([rawList[0], rawList[1]], "windows-notification-listener");
  assert.strictEqual(syncRes2.removed.length, 1);
  assert.strictEqual(syncRes2.removed[0].applicationName, "Spotify");

  const snapshot2 = registry.getSnapshot();
  assert.strictEqual(snapshot2.active.length, 2);
  assert.strictEqual(snapshot2.history.length, 1);
});

test("NotificationRegistry - local snooze and resurfacing", () => {
  const registry = new NotificationRegistry({ batchDelayMs: 5 });
  registry.syncIncoming([
    { Id: 10, AppName: "Calendar", Title: "Meeting", Body: "Starting in 10 mins" }
  ]);

  const notifId = "windows-notification-listener-10";
  assert.strictEqual(registry.activeNotifications.size, 1);

  // Snooze for 50ms
  const snoozed = registry.snooze(notifId, 50);
  assert.strictEqual(snoozed, true);
  assert.strictEqual(registry.activeNotifications.size, 0);
  assert.strictEqual(registry.snoozedNotifications.size, 1);

  const snapSnoozed = registry.getSnapshot();
  assert.strictEqual(snapSnoozed.snoozed.length, 1);
  assert.strictEqual(snapSnoozed.snoozed[0].lifecycle, NOTIFICATION_LIFECYCLES.SNOOZED);

  // Force time check after delay
  return new Promise((resolve) => {
    setTimeout(() => {
      registry.checkSnoozedDue();
      const snapResurfaced = registry.getSnapshot();
      assert.strictEqual(snapResurfaced.active.length, 1);
      assert.strictEqual(snapResurfaced.snoozed.length, 0);
      assert.strictEqual(snapResurfaced.active[0].lifecycle, NOTIFICATION_LIFECYCLES.ACTIVE);
      assert.strictEqual(snapResurfaced.active[0].localReviewed, false); // Resurfaced item alerts user
      resolve();
    }, 80);
  });
});

test("NotificationRegistry - dismiss, dismissGroup, and undo dismissal", () => {
  const registry = new NotificationRegistry({ batchDelayMs: 5 });
  registry.syncIncoming([
    { Id: 101, AppName: "Slack", Title: "Team: Design review", Body: "Ready" },
    { Id: 102, AppName: "Slack", Title: "Team: Design review", Body: "Link updated" },
    { Id: 103, AppName: "GitHub", Title: "PR Merged", Body: "Feature #99" },
  ]);

  const snap = registry.getSnapshot();
  assert.strictEqual(snap.groups.length, 1);
  const groupId = snap.groups[0].groupId;

  // Dismiss group
  const dismissedGroup = registry.dismissGroup(groupId);
  assert.strictEqual(dismissedGroup.length, 2);
  assert.strictEqual(registry.getSnapshot().active.length, 1);

  // Dismiss remaining
  const remaining = registry.getSnapshot().active[0];
  registry.dismiss(remaining.id);
  assert.strictEqual(registry.getSnapshot().active.length, 0);
  assert.strictEqual(registry.getSnapshot().stats.hasUndo, true);

  // Undo dismissal
  const undone = registry.undoDismiss(remaining.id);
  assert.strictEqual(undone, true);
  assert.strictEqual(registry.getSnapshot().active.length, 1);
  assert.strictEqual(registry.getSnapshot().active[0].id, remaining.id);
});

test("NotificationRegistry - privacy masking hides title and body while preserving structure", () => {
  const registry = new NotificationRegistry({ batchDelayMs: 5 });
  registry.syncIncoming([
    { Id: 201, AppName: "WhatsApp", Title: "Secret Contact: Sensitive Info", Body: "Top secret details" },
    { Id: 202, AppName: "WhatsApp", Title: "Incoming call", Body: "Alice is calling you" }
  ]);

  // Turn on hidePreviews
  registry.setHidePreviews(true);
  const snapMasked = registry.getSnapshot();

  const msgNotif = snapMasked.active.find(i => !i.isCall);
  assert.strictEqual(msgNotif.title, "WhatsApp Notification");
  assert.strictEqual(msgNotif.body, "Notification content hidden by privacy setting");
  assert.strictEqual(msgNotif.senderName, undefined);

  // Calls are not blinded completely so user knows an incoming call is active
  const callNotif = snapMasked.active.find(i => i.isCall);
  assert.ok(callNotif);
  assert.strictEqual(callNotif.isCall, true);
});

test("ActionProviderRegistry & WhatsApp Provider - honest capabilities and deep-link execution", async () => {
  let focusedApp = null;
  let openedUrl = null;
  let dismissedSourceId = null;

  const engine = createNotificationEngine({
    removeNotificationSource: async (id) => { dismissedSourceId = id; return true; },
    focusApp: async (app) => { focusedApp = app; return true; },
    openExternal: async (url) => { openedUrl = url; return true; },
  });

  engine.syncNotifications([
    { Id: 501, AppName: "WhatsApp", Title: "Bob: Hey there", Body: "Testing inline reply" }
  ]);

  const snap = engine.getSnapshot();
  const notif = snap.active[0];
  assert.ok(notif);

  // Open App action
  const openRes = await engine.executeAction(notif.id, NOTIFICATION_ACTION_TYPES.OPEN);
  assert.strictEqual(openRes.success, true);
  assert.strictEqual(focusedApp, "WhatsApp");

  // Reply action (uses verified deep-link or opens chat without reporting fake delivery)
  const replyRes = await engine.executeAction(notif.id, NOTIFICATION_ACTION_TYPES.REPLY, {
    text: "Here is my response"
  });
  assert.strictEqual(replyRes.success, true);
  assert.ok(openedUrl && openedUrl.startsWith("whatsapp://send"));

  // Dismiss action delegates to source removal and local removal
  const dismissRes = await engine.dismiss(notif.id);
  assert.strictEqual(dismissRes.success, true);
  assert.strictEqual(dismissedSourceId, "501");
  assert.strictEqual(engine.getSnapshot().active.length, 0);

  engine.destroy();
});
