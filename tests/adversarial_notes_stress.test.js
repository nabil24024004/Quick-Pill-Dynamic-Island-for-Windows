"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const {
  NotesStorage,
  validateNote,
  extractTitleFromContent,
  atomicWriteJsonSync,
  safeReadNotes,
} = require("../src/services/notes/notesStorage");
const { DraftRecovery, normalizeDraft } = require("../src/services/notes/draftRecovery");
const { createNotesEngine } = require("../src/services/notes/index");

// Isolated sandbox environment helper
function createTempEnv(prefix = "qp-stress-") {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    tmpDir,
    notesPath: path.join(tmpDir, "notes.json"),
    draftPath: path.join(tmpDir, "draft-recovery.json"),
    cleanup() {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (_) {}
    },
  };
}

// =========================================================================
// SUITE 1: Storage Corruption & Backup Restoration
// =========================================================================

test("Adversarial Storage: 0-byte notes.json with valid backup restores backup cleanly", () => {
  const env = createTempEnv("qp-corrupt-0byte-");
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });
    const n1 = storage.saveNote({ title: "Important Note", content: "Valid backup payload #backup" });

    const backupPath = `${env.notesPath}.bak`;
    assert.ok(fs.existsSync(backupPath), "Backup file notes.json.bak should exist");

    // Overwrite primary file with 0-byte file
    fs.writeFileSync(env.notesPath, "", "utf8");
    assert.strictEqual(fs.statSync(env.notesPath).size, 0, "Primary file should be 0 bytes");

    // Re-initialize storage
    const recoveredStorage = new NotesStorage({ notesPath: env.notesPath });
    const notes = recoveredStorage.getNotes("all");

    assert.strictEqual(notes.length, 1, "Should recover 1 note from backup");
    assert.strictEqual(notes[0].id, n1.id);
    assert.strictEqual(notes[0].content, "Valid backup payload #backup");

    // Verify notes.json was repaired on disk
    assert.ok(fs.statSync(env.notesPath).size > 0, "notes.json should be restored to non-zero size");
    const onDisk = JSON.parse(fs.readFileSync(env.notesPath, "utf8"));
    assert.strictEqual(onDisk.length, 1);
  } finally {
    env.cleanup();
  }
});

test("Adversarial Storage: Whitespace-only notes.json triggers backup restoration", () => {
  const env = createTempEnv("qp-corrupt-space-");
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });
    storage.saveNote({ title: "Keep Alive", content: "Content should survive" });

    // Corrupt with various whitespaces
    fs.writeFileSync(env.notesPath, "   \r\n\t  \n  ", "utf8");

    const recovered = new NotesStorage({ notesPath: env.notesPath });
    const notes = recovered.getNotes("all");
    assert.strictEqual(notes.length, 1);
    assert.strictEqual(notes[0].title, "Keep Alive");
  } finally {
    env.cleanup();
  }
});

test("Adversarial Storage: Truncated JSON at varying cut points restores from backup", () => {
  const env = createTempEnv("qp-corrupt-trunc-");
  try {
    const backupNotes = [
      validateNote({ title: "Note 2", content: "Body 2" }),
      validateNote({ title: "Note 1", content: "Body 1" }),
    ];
    fs.writeFileSync(`${env.notesPath}.bak`, JSON.stringify(backupNotes, null, 2), "utf8");

    const cutPoints = [
      "[",
      '[{"id":',
      '[{"id":"test"',
      '[{"id":"test","title":"Truncated',
      '{"notes": [',
      '{"notes": [{"id":"1"}',
    ];

    for (const cut of cutPoints) {
      fs.writeFileSync(env.notesPath, cut, "utf8");
      // Ensure backup is restored fresh for each test iteration
      fs.writeFileSync(`${env.notesPath}.bak`, JSON.stringify(backupNotes, null, 2), "utf8");

      const recovered = new NotesStorage({ notesPath: env.notesPath });
      const notes = recovered.getNotes("all");
      assert.strictEqual(notes.length, 2, `Failed on cut: ${cut}`);
      assert.strictEqual(notes[0].title, "Note 2");
      assert.strictEqual(notes[1].title, "Note 1");
    }
  } finally {
    env.cleanup();
  }
});

test("Adversarial Storage: Invalid JSON types (object, primitive, array with nulls) recover from backup", () => {
  const env = createTempEnv("qp-corrupt-types-");
  try {
    const backupNotes = [validateNote({ title: "Base Note", content: "Preserve me" })];
    fs.writeFileSync(`${env.notesPath}.bak`, JSON.stringify(backupNotes, null, 2), "utf8");

    const invalidBodies = [
      JSON.stringify({ notNotes: 123 }),
      JSON.stringify(42),
      JSON.stringify("a plain string"),
      JSON.stringify(true),
      JSON.stringify([null, { title: "partial" }]),
      JSON.stringify(["invalid string item"]),
    ];

    for (const body of invalidBodies) {
      fs.writeFileSync(env.notesPath, body, "utf8");
      fs.writeFileSync(`${env.notesPath}.bak`, JSON.stringify(backupNotes, null, 2), "utf8");

      const recovered = new NotesStorage({ notesPath: env.notesPath });
      const notes = recovered.getNotes("all");
      assert.strictEqual(notes.length, 1, `Failed to recover from invalid body: ${body}`);
      assert.strictEqual(notes[0].title, "Base Note");
    }
  } finally {
    env.cleanup();
  }
});

test("Adversarial Storage: 0-byte notes.json with NO backup safely initializes empty store", () => {
  const env = createTempEnv("qp-corrupt-nobak-");
  try {
    fs.writeFileSync(env.notesPath, "", "utf8");
    assert.strictEqual(fs.existsSync(`${env.notesPath}.bak`), false);

    const storage = new NotesStorage({ notesPath: env.notesPath });
    const notes = storage.getNotes("all");
    assert.deepStrictEqual(notes, []);

    // Verify notes.json was re-initialized to valid empty JSON array
    const raw = fs.readFileSync(env.notesPath, "utf8");
    assert.deepStrictEqual(JSON.parse(raw), []);
  } finally {
    env.cleanup();
  }
});

test("Adversarial Storage: Total corruption (both primary and backup corrupt) quarantines and reinitializes", () => {
  const env = createTempEnv("qp-corrupt-total-");
  try {
    fs.writeFileSync(env.notesPath, "FATAL_PRIMARY_CORRUPTION_@@##", "utf8");
    fs.writeFileSync(`${env.notesPath}.bak`, "FATAL_BACKUP_CORRUPTION_@@##", "utf8");

    const storage = new NotesStorage({ notesPath: env.notesPath });
    const notes = storage.getNotes("all");
    assert.deepStrictEqual(notes, []);

    // Check that quarantine file was created
    const files = fs.readdirSync(env.tmpDir);
    const quarantined = files.filter((f) => f.includes(".corrupt."));
    assert.strictEqual(quarantined.length, 1);

    const quarantinedContent = fs.readFileSync(path.join(env.tmpDir, quarantined[0]), "utf8");
    assert.strictEqual(quarantinedContent, "FATAL_PRIMARY_CORRUPTION_@@##");

    // Check that primary file is now valid empty store
    const primary = JSON.parse(fs.readFileSync(env.notesPath, "utf8"));
    assert.deepStrictEqual(primary, []);
  } finally {
    env.cleanup();
  }
});

// =========================================================================
// SUITE 2: High Concurrency Rapid Saves (100+ Sequential & Concurrent Writes)
// =========================================================================

test("Adversarial Concurrency: 120 rapid sequential saves preserve all notes and order", () => {
  const env = createTempEnv("qp-rapid-seq-");
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });
    const count = 120;
    const start = Date.now();

    for (let i = 0; i < count; i++) {
      storage.saveNote({
        title: `Note ${i.toString().padStart(3, "0")}`,
        content: `Body content for note iteration ${i} with #tag-${i % 5}`,
      });
    }

    const elapsed = Date.now() - start;
    // Query with explicit limit to retrieve all 120
    const notes = storage.getNotes("all", { limit: 200 });
    assert.strictEqual(notes.length, count, `Should contain exactly ${count} notes`);

    // Verify LIFO order (latest saved is at index 0)
    assert.strictEqual(notes[0].title, "Note 119");
    assert.strictEqual(notes[count - 1].title, "Note 000");

    // Verify on disk integrity
    const diskNotes = JSON.parse(fs.readFileSync(env.notesPath, "utf8"));
    assert.strictEqual(diskNotes.length, count);

    // Verify backup exists and is valid
    const backupNotes = JSON.parse(fs.readFileSync(`${env.notesPath}.bak`, "utf8"));
    assert.ok(backupNotes.length >= count - 1);

    // Verify no temporary files leaked
    const tmpFiles = fs.readdirSync(env.tmpDir).filter((f) => f.includes(".tmp."));
    assert.strictEqual(tmpFiles.length, 0, "No temp files should remain");
  } finally {
    env.cleanup();
  }
});

test("Adversarial Concurrency: 100 rapid sequential updates to the same note", () => {
  const env = createTempEnv("qp-rapid-update-");
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });
    const initial = storage.saveNote({ title: "Mutable Note", content: "Initial version" });

    const iterations = 100;
    for (let i = 1; i <= iterations; i++) {
      storage.saveNote({
        id: initial.id,
        title: "Mutable Note",
        content: `Version ${i} update`,
        tags: [`v${i}`],
      });
    }

    const notes = storage.getNotes("all");
    assert.strictEqual(notes.length, 1, "Should still be exactly 1 note");
    assert.strictEqual(notes[0].id, initial.id);
    assert.strictEqual(notes[0].content, `Version ${iterations} update`);
    assert.strictEqual(notes[0].createdAt, initial.createdAt, "createdAt must remain unchanged");
    assert.ok(notes[0].updatedAt >= initial.updatedAt, "updatedAt must advance");

    const diskNotes = JSON.parse(fs.readFileSync(env.notesPath, "utf8"));
    assert.strictEqual(diskNotes.length, 1);
    assert.strictEqual(diskNotes[0].content, `Version ${iterations} update`);
  } finally {
    env.cleanup();
  }
});

test("Adversarial Concurrency: 100 rapid concurrent atomic writes via atomicWriteJsonSync", async () => {
  const env = createTempEnv("qp-rapid-atomic-");
  try {
    const targetFile = env.notesPath;
    const writeCount = 100;

    // Concurrently trigger 100 atomic writes to the same destination
    const promises = Array.from({ length: writeCount }, (_, i) => {
      return new Promise((resolve, reject) => {
        setImmediate(() => {
          try {
            atomicWriteJsonSync(targetFile, {
              writerId: i,
              timestamp: Date.now(),
              payload: `Payload ${i}`.repeat(50),
            }, {
              maxRetries: 20,
              retryDelayMs: 10,
            });
            resolve({ id: i, success: true });
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    const results = await Promise.all(promises);
    assert.strictEqual(results.length, writeCount);
    assert.ok(results.every((r) => r.success));

    // Target file must exist and be valid JSON
    assert.ok(fs.existsSync(targetFile));
    const content = JSON.parse(fs.readFileSync(targetFile, "utf8"));
    assert.ok(typeof content.writerId === "number");
    assert.ok(content.payload.length > 0);

    // Verify no temporary files leaked
    const tmpFiles = fs.readdirSync(env.tmpDir).filter((f) => f.includes(".tmp."));
    assert.strictEqual(tmpFiles.length, 0, "All tmp files must be cleaned up");
  } finally {
    env.cleanup();
  }
});

test("Adversarial Concurrency: Interleaved CRUD operations under high pressure", () => {
  const env = createTempEnv("qp-crud-stress-");
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });
    const createdIds = [];

    // Interleave 40 creates, 20 updates, 10 deletes, 5 pins, 5 archives, and undo
    for (let i = 0; i < 40; i++) {
      const note = storage.saveNote({
        title: `Stress Note ${i}`,
        content: `Body for ${i} with #tag-${i % 3}`,
      });
      createdIds.push(note.id);

      if (i > 5 && i % 2 === 0) {
        // Update an earlier note
        const targetId = createdIds[i - 3];
        storage.saveNote({
          id: targetId,
          content: `Updated body ${i} for note ${targetId}`,
        });
      }

      if (i > 10 && i % 4 === 0) {
        // Pin an earlier note
        storage.togglePin(createdIds[i - 5]);
      }

      if (i > 15 && i % 6 === 0) {
        // Archive an earlier note
        storage.toggleArchive(createdIds[i - 8]);
      }

      if (i > 20 && i % 7 === 0) {
        // Delete an earlier note
        const delId = createdIds[i - 10];
        storage.deleteNote(delId);
      }
    }

    // Verify storage stability and on-disk parity
    const memoryNotes = storage.getNotes("all", { limit: 100 });
    const freshStorage = new NotesStorage({ notesPath: env.notesPath });
    const diskNotes = freshStorage.getNotes("all", { limit: 100 });

    assert.strictEqual(memoryNotes.length, diskNotes.length);
    assert.deepStrictEqual(
      memoryNotes.map((n) => n.id),
      diskNotes.map((n) => n.id)
    );

    const tmpFiles = fs.readdirSync(env.tmpDir).filter((f) => f.includes(".tmp."));
    assert.strictEqual(tmpFiles.length, 0);
  } finally {
    env.cleanup();
  }
});

// =========================================================================
// SUITE 3: Draft Recovery Debouncing & Crash Simulation
// =========================================================================

test("Adversarial Draft: 150 rapid keystrokes within 100ms collapse to exactly 1 write", async () => {
  const env = createTempEnv("qp-draft-keystroke-");
  try {
    const draft = new DraftRecovery({
      draftPath: env.draftPath,
      debounceMs: 60,
    });

    assert.strictEqual(fs.existsSync(env.draftPath), false);

    // Simulate 150 rapid keystrokes
    for (let i = 1; i <= 150; i++) {
      draft.saveDraft({
        title: "Draft In Flight",
        content: `Typing letter ${i} ` + "a".repeat(i),
      });
    }

    // Immediately after typing, disk file must NOT exist (still debouncing)
    assert.strictEqual(
      fs.existsSync(env.draftPath),
      false,
      "draft-recovery.json must NOT be written before debounce interval"
    );

    // Wait for debounce timer to fire
    await new Promise((r) => setTimeout(r, 100));

    // Now disk file must exist with final keystroke state
    assert.ok(fs.existsSync(env.draftPath));
    const saved = JSON.parse(fs.readFileSync(env.draftPath, "utf8"));
    assert.strictEqual(saved.title, "Draft In Flight");
    assert.strictEqual(saved.content, "Typing letter 150 " + "a".repeat(150));
    assert.strictEqual(saved.isDirty, true);

    draft.destroy();
  } finally {
    env.cleanup();
  }
});

test("Adversarial Draft: Sudden process restart restores dirty draft across sessions", () => {
  const env = createTempEnv("qp-draft-crash-");
  try {
    // Process 1: User types draft and explicitly or automatically flushes
    const session1 = new DraftRecovery({ draftPath: env.draftPath });
    session1.saveDraft({
      title: "Critical Crash Notes",
      content: "These thoughts were saved right before power loss",
      tags: ["urgent", "incident"],
      sourceMetadata: {
        appName: "Visual Studio Code",
        windowTitle: "quick-pill - VSCode",
        pid: 9999,
      },
    });

    const flushRes = session1.flushDraft();
    assert.strictEqual(flushRes.success, true);
    assert.strictEqual(flushRes.written, true);

    // Simulate sudden process termination: drop session1 without clearDraft
    session1.destroy();

    // Process 2: App restarts after crash, launches fresh DraftRecovery
    const session2 = new DraftRecovery({ draftPath: env.draftPath });
    const restored = session2.getDraft();

    assert.ok(restored, "Restored draft should not be null");
    assert.strictEqual(restored.title, "Critical Crash Notes");
    assert.strictEqual(restored.content, "These thoughts were saved right before power loss");
    assert.strictEqual(restored.isDirty, true);
    assert.deepStrictEqual(restored.tags, ["urgent", "incident"]);
    assert.strictEqual(restored.sourceMetadata.appName, "Visual Studio Code");

    // Clean commit on save note
    session2.clearDraft();
    assert.strictEqual(fs.existsSync(env.draftPath), false);
    assert.strictEqual(session2.getDraft(), null);
  } finally {
    env.cleanup();
  }
});

test("Adversarial Draft: Corrupted or 0-byte draft file on startup degrades gracefully", () => {
  const env = createTempEnv("qp-draft-corrupt-");
  try {
    // 0-byte draft file
    fs.writeFileSync(env.draftPath, "", "utf8");
    const sessionZero = new DraftRecovery({ draftPath: env.draftPath });
    assert.strictEqual(sessionZero.getDraft(), null);

    // Malformed JSON draft file
    fs.writeFileSync(env.draftPath, '{"title": "Broken', "utf8");
    const sessionBroken = new DraftRecovery({ draftPath: env.draftPath });
    assert.strictEqual(sessionBroken.getDraft(), null);

    // Valid JSON but isDirty is false
    fs.writeFileSync(env.draftPath, JSON.stringify({ isDirty: false, content: "clean" }), "utf8");
    const sessionClean = new DraftRecovery({ draftPath: env.draftPath });
    assert.strictEqual(sessionClean.getDraft(), null);

    // Valid JSON but content and title are empty
    fs.writeFileSync(env.draftPath, JSON.stringify({ isDirty: true, content: "", title: "" }), "utf8");
    const sessionEmpty = new DraftRecovery({ draftPath: env.draftPath });
    assert.strictEqual(sessionEmpty.getDraft(), null);
  } finally {
    env.cleanup();
  }
});

test("Adversarial Draft: clearDraft unlinks file and cancels any in-flight debounce timer", async () => {
  const env = createTempEnv("qp-draft-clear-");
  try {
    const draft = new DraftRecovery({
      draftPath: env.draftPath,
      debounceMs: 50,
    });

    draft.saveDraft({ content: "Draft to discard immediately" });
    // Clear before timer fires
    const clearRes = draft.clearDraft();
    assert.strictEqual(clearRes.success, true);
    assert.strictEqual(draft.getDraft(), null);

    // Wait past debounce interval
    await new Promise((r) => setTimeout(r, 80));

    // File should still NOT exist because timer was canceled
    assert.strictEqual(fs.existsSync(env.draftPath), false);
    assert.strictEqual(draft.getDraft(), null);

    draft.destroy();
  } finally {
    env.cleanup();
  }
});

// =========================================================================
// SUITE 4: Large Volume Stress & Unicode Edge Cases
// =========================================================================

test("Adversarial Volume: 500 notes volume with complex markdown and multi-language unicode", () => {
  const env = createTempEnv("qp-volume-stress-");
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });
    const count = 500;

    const sampleUnicode = [
      "Quick Pill 💊 Windows Stadium",
      "日本語のメモ：タスク管理と検索機能 #開発",
      "Русский текст: быстрая заметка #работа",
      "ملاحظة سريعة باللغة العربية #مهم",
      "Special chars: <script>alert(1)</script> &amp; %20 $PATH \\n \\r \\0",
    ];

    for (let i = 0; i < count; i++) {
      const u = sampleUnicode[i % sampleUnicode.length];
      storage.saveNote({
        title: `Note ${i}: ${u.slice(0, 30)}`,
        content: `Full body for ${i}: ${u}\n\nMultiline markdown item\n- [ ] Task checkbox\n> Quote block`,
      });
    }

    const allNotes = storage.getNotes("all", { limit: 1000 });
    assert.strictEqual(allNotes.length, count);

    // Test search across 500 notes
    const nihongoResults = storage.getNotes("all", { query: "日本語", limit: 200 });
    assert.strictEqual(nihongoResults.length, 100);

    const pillResults = storage.getNotes("all", { query: "💊", limit: 200 });
    assert.strictEqual(pillResults.length, 100);

    // Test on-disk persistence size and integrity
    assert.ok(fs.existsSync(env.notesPath));
    const fileSize = fs.statSync(env.notesPath).size;
    assert.ok(fileSize > 50 * 1024, `File size (${fileSize} bytes) should exceed 50KB`);

    // Reload in fresh instance
    const reloaded = new NotesStorage({ notesPath: env.notesPath });
    assert.strictEqual(reloaded.getNotes("all", { limit: 1000 }).length, count);
  } finally {
    env.cleanup();
  }
});
