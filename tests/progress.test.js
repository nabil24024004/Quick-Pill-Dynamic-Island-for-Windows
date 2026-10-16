const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { EventEmitter } = require("node:events");

const {
  createProgressEngine,
  ProgressRegistry,
  ProgressCoordinator,
  PROGRESS_STATUSES,
  PROGRESS_CATEGORIES,
  clampProgress,
  normalizeOperationInput
} = require("../src/services/progress");

test("types & normalization - clamps and sanitizes values correctly", () => {
  assert.strictEqual(clampProgress(55.43), 55.4);
  assert.strictEqual(clampProgress(-10), 0);
  assert.strictEqual(clampProgress(120), 100);
  assert.strictEqual(clampProgress(undefined), null);
  assert.strictEqual(clampProgress("invalid"), null);

  const normalized = normalizeOperationInput({
    title: "  Long title that needs trimming   ",
    progress: 75.6,
    category: "download",
    status: "running"
  }, "test-provider");

  assert.strictEqual(normalized.title, "Long title that needs trimming");
  assert.strictEqual(normalized.progress, 75.6);
  assert.strictEqual(normalized.category, PROGRESS_CATEGORIES.DOWNLOAD);
  assert.strictEqual(normalized.status, PROGRESS_STATUSES.RUNNING);
  assert.strictEqual(normalized.providerId, "test-provider");
  assert.strictEqual(normalized.capabilities.canDismiss, true);
});

test("ProgressRegistry - registers, updates, and completes operations", (t, done) => {
  const registry = new ProgressRegistry({ batchDelayMs: 10, completionRetentionMs: 50 });
  
  const opId = registry.register({
    title: "Test Operation",
    totalBytes: 1000,
    bytesCompleted: 100,
    progress: 10
  }, "test-provider");

  assert.ok(opId);
  const snap1 = registry.getSnapshot();
  assert.strictEqual(snap1.active.length, 1);
  assert.strictEqual(snap1.active[0].id, opId);
  assert.strictEqual(snap1.active[0].progress, 10);

  // Update operation
  registry.update(opId, {
    progress: 50,
    bytesCompleted: 500,
    bytesPerSecond: 1000
  });

  const snap2 = registry.getSnapshot();
  assert.strictEqual(snap2.active[0].progress, 50);
  assert.strictEqual(snap2.active[0].bytesCompleted, 500);
  assert.strictEqual(snap2.summary.totalBytesPerSecond, 1000);

  // Complete operation
  registry.complete(opId);
  const snap3 = registry.getSnapshot();
  assert.strictEqual(snap3.active[0].status, PROGRESS_STATUSES.COMPLETED);
  assert.strictEqual(snap3.active[0].progress, 100);

  // Wait for auto-archive retention
  setTimeout(() => {
    const snap4 = registry.getSnapshot();
    assert.strictEqual(snap4.active.length, 0);
    assert.strictEqual(snap4.history.length, 1);
    assert.strictEqual(snap4.history[0].id, opId);
    registry.destroy();
    done();
  }, 100);
});

test("ProgressCoordinator - selects correct operation for compact island", () => {
  const registry = new ProgressRegistry({ batchDelayMs: 10 });
  const coordinator = new ProgressCoordinator(registry);

  // No operations
  assert.strictEqual(coordinator.selectCompactOperation([]), null);

  // Multiple operations: 1 running, 1 failed
  const op1 = {
    id: "op-1",
    status: PROGRESS_STATUSES.RUNNING,
    progress: 45,
    title: "Download",
    updatedAt: 1000
  };
  const op2 = {
    id: "op-2",
    status: PROGRESS_STATUSES.FAILED,
    progress: 20,
    title: "Upload",
    updatedAt: 2000
  };

  // Failed operations take priority for user attention
  const selected = coordinator.selectCompactOperation([op1, op2]);
  assert.strictEqual(selected.id, "op-2");

  // When all running, pick the one with active progress
  const op3 = {
    id: "op-3",
    status: PROGRESS_STATUSES.RUNNING,
    progress: null,
    title: "Preparing",
    updatedAt: 3000
  };
  const selectedRunning = coordinator.selectCompactOperation([op1, op3]);
  assert.strictEqual(selectedRunning.id, "op-1");

  registry.destroy();
  coordinator.destroy();
});

test("FileOperationsProvider - genuinely copies a file and reports progress", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-progress-test-"));
  const srcFile = path.join(tempDir, "source.txt");
  const dstFile = path.join(tempDir, "dest.txt");

  // Create a 500KB test file
  const testBuffer = Buffer.alloc(500 * 1024, "A");
  fs.writeFileSync(srcFile, testBuffer);

  const engine = createProgressEngine({ batchDelayMs: 10 });
  
  const opId = await engine.fileOpsProvider.startCopy({
    sourcePath: srcFile,
    destinationPath: dstFile
  });

  assert.ok(opId);

  // Wait until file is copied
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const snap = engine.registry.getSnapshot();
      const op = snap.active.find(o => o.id === opId) || snap.history.find(h => h.id === opId);
      if (op && op.status === PROGRESS_STATUSES.COMPLETED) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 50);
  });

  assert.ok(fs.existsSync(dstFile));
  assert.strictEqual(fs.statSync(dstFile).size, 500 * 1024);

  // Clean up test files
  fs.rmSync(tempDir, { recursive: true, force: true });
  engine.registry.destroy();
});

test("QuickPillUpdaterProvider - responds to updater events", () => {
  const mockUpdater = new EventEmitter();
  const engine = createProgressEngine({ autoUpdater: mockUpdater, batchDelayMs: 5 });

  // Simulate updater starting download
  mockUpdater.emit("download-started", { version: "2.3.0", size: 1000000 });
  let snap = engine.registry.getSnapshot();
  assert.strictEqual(snap.active.length, 1);
  assert.strictEqual(snap.active[0].title, "Quick Pill Update v2.3.0");
  assert.strictEqual(snap.active[0].status, PROGRESS_STATUSES.RUNNING);

  // Simulate progress
  mockUpdater.emit("download-progress", {
    percent: 65.5,
    transferredBytes: 655000,
    totalBytes: 1000000,
    speedBytesPerSec: 150000
  });

  snap = engine.registry.getSnapshot();
  assert.strictEqual(snap.active[0].progress, 65.5);
  assert.strictEqual(snap.active[0].bytesCompleted, 655000);

  // Simulate downloaded
  mockUpdater.emit("update-downloaded", {
    version: "2.3.0",
    filePath: "C:\\temp\\update.exe"
  });

  snap = engine.registry.getSnapshot();
  assert.strictEqual(snap.active[0].status, PROGRESS_STATUSES.COMPLETED);
  assert.strictEqual(snap.active[0].destinationPath, "C:\\temp\\update.exe");

  engine.registry.destroy();
});

test("FileOperationsProvider - handles pause, resume, and cancel actions", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-progress-cancel-"));
  const srcFile = path.join(tempDir, "large_source.bin");
  const dstFile = path.join(tempDir, "large_dest.bin");

  // Create a 2MB test file
  const testBuffer = Buffer.alloc(2 * 1024 * 1024, "Z");
  fs.writeFileSync(srcFile, testBuffer);

  const engine = createProgressEngine({ batchDelayMs: 5 });

  const opId = await engine.fileOpsProvider.startCopy({
    sourcePath: srcFile,
    destinationPath: dstFile
  });

  // Pause
  const pauseRes = await engine.coordinator.executeAction(opId, "pause");
  assert.strictEqual(pauseRes.success, true);
  let snap = engine.registry.getSnapshot();
  let op = snap.active.find(o => o.id === opId);
  assert.strictEqual(op.status, PROGRESS_STATUSES.PAUSED);

  // Resume
  const resumeRes = await engine.coordinator.executeAction(opId, "resume");
  assert.strictEqual(resumeRes.success, true);
  snap = engine.registry.getSnapshot();
  op = snap.active.find(o => o.id === opId);
  assert.strictEqual(op.status, PROGRESS_STATUSES.RUNNING);

  // Cancel
  const cancelRes = await engine.coordinator.executeAction(opId, "cancel");
  assert.strictEqual(cancelRes.success, true);
  snap = engine.registry.getSnapshot();
  op = snap.active.find(o => o.id === opId);
  assert.strictEqual(op.status, PROGRESS_STATUSES.CANCELLED);

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
  engine.registry.destroy();
});

