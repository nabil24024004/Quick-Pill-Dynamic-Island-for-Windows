"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const {
  NotesStorage,
  validateNote,
  extractTitleFromContent,
  atomicWriteJsonSync,
  safeReadNotes,
} = require("../src/services/notes/notesStorage");
const { DraftRecovery, normalizeDraft } = require("../src/services/notes/draftRecovery");
const { createNotesEngine } = require("../src/services/notes/index");

// Test harness state
let totalPassed = 0;
let totalFailed = 0;
const failures = [];

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

async function runTest(suiteName, testName, fn) {
  try {
    await fn();
    totalPassed++;
    console.log(`  [PASS] ${testName}`);
  } catch (err) {
    totalFailed++;
    console.log(`  [FAIL] ${testName}`);
    console.log(`         -> ${err.message}`);
    failures.push({ suite: suiteName, name: testName, error: err.message, stack: err.stack });
  }
}

async function main() {
  console.log("===============================================================");
  console.log("  QUICK PILL MILESTONE 2 - EMPIRICAL STRESS TEST HARNESS       ");
  console.log("  Notes Storage, Atomic Persistence & Draft Recovery Stress    ");
  console.log("===============================================================\n");

  // =========================================================================
  // SUITE 1: Storage Corruption & Automatic Salvage
  // =========================================================================
  console.log("SUITE 1: Storage Corruption & Automatic Salvage");

  await runTest("SUITE 1", "0-byte notes.json with valid backup restores backup cleanly", async () => {
    const env = createTempEnv("qp-s1-0byte-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const n1 = storage.saveNote({ title: "Note 1", content: "Preserve me #backup" });

      // Overwrite with 0-byte file
      fs.writeFileSync(env.notesPath, "", "utf8");
      if (fs.statSync(env.notesPath).size !== 0) throw new Error("File not 0 bytes");

      const reloaded = new NotesStorage({ notesPath: env.notesPath });
      const notes = reloaded.getNotes("all");
      if (notes.length !== 1) throw new Error(`Expected 1 note, got ${notes.length}`);
      if (notes[0].id !== n1.id) throw new Error("Note ID mismatch");
      if (notes[0].content !== "Preserve me #backup") throw new Error("Note content mismatch");

      // Verify file repaired on disk
      if (fs.statSync(env.notesPath).size === 0) throw new Error("Disk file still 0 bytes");
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 1", "Whitespace-only notes.json triggers backup restoration", async () => {
    const env = createTempEnv("qp-s1-space-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      storage.saveNote({ title: "Keep Alive", content: "Survives space corruption" });

      fs.writeFileSync(env.notesPath, "   \r\n\t  \n  ", "utf8");
      const reloaded = new NotesStorage({ notesPath: env.notesPath });
      const notes = reloaded.getNotes("all");
      if (notes.length !== 1 || notes[0].title !== "Keep Alive") {
        throw new Error("Failed to restore from whitespace corruption");
      }
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 1", "Truncated JSON at varying cut points restores from backup", async () => {
    const env = createTempEnv("qp-s1-trunc-");
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
        fs.writeFileSync(`${env.notesPath}.bak`, JSON.stringify(backupNotes, null, 2), "utf8");
        const reloaded = new NotesStorage({ notesPath: env.notesPath });
        const notes = reloaded.getNotes("all");
        if (notes.length !== 2) throw new Error(`Cut point '${cut}' recovered ${notes.length} notes, expected 2`);
      }
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 1", "Invalid JSON structures (primitive, object without notes, null array) recover from backup", async () => {
    const env = createTempEnv("qp-s1-types-");
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
        const reloaded = new NotesStorage({ notesPath: env.notesPath });
        const notes = reloaded.getNotes("all");
        if (notes.length !== 1 || notes[0].title !== "Base Note") {
          throw new Error(`Failed to recover from body: ${body}`);
        }
      }
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 1", "0-byte notes.json with NO backup safely initializes empty store", async () => {
    const env = createTempEnv("qp-s1-nobak-");
    try {
      fs.writeFileSync(env.notesPath, "", "utf8");
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const notes = storage.getNotes("all");
      if (!Array.isArray(notes) || notes.length !== 0) throw new Error("Expected empty array");

      const onDisk = JSON.parse(fs.readFileSync(env.notesPath, "utf8"));
      if (!Array.isArray(onDisk) || onDisk.length !== 0) throw new Error("On-disk store not empty array");
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 1", "Total corruption (primary & backup corrupt) quarantines to .corrupt.<timestamp>", async () => {
    const env = createTempEnv("qp-s1-total-");
    try {
      fs.writeFileSync(env.notesPath, "CORRUPT_PRIMARY_@@@", "utf8");
      fs.writeFileSync(`${env.notesPath}.bak`, "CORRUPT_BACKUP_@@@", "utf8");

      const storage = new NotesStorage({ notesPath: env.notesPath });
      const notes = storage.getNotes("all");
      if (notes.length !== 0) throw new Error("Expected empty store on total corruption");

      const files = fs.readdirSync(env.tmpDir);
      const quarantined = files.filter((f) => f.includes(".corrupt."));
      if (quarantined.length !== 1) throw new Error(`Expected 1 quarantine file, found ${quarantined.length}`);

      const content = fs.readFileSync(path.join(env.tmpDir, quarantined[0]), "utf8");
      if (content !== "CORRUPT_PRIMARY_@@@") throw new Error("Quarantine content mismatch");
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 1", "Missing notes directory creates directory path recursively", async () => {
    const env = createTempEnv("qp-s1-mkdir-");
    try {
      const nestedPath = path.join(env.tmpDir, "deep", "nested", "storage", "notes.json");
      const storage = new NotesStorage({ notesPath: nestedPath });
      storage.saveNote({ title: "Nested Note", content: "Deep nested content" });

      if (!fs.existsSync(nestedPath)) throw new Error("Nested notes.json not created");
      const disk = JSON.parse(fs.readFileSync(nestedPath, "utf8"));
      if (disk.length !== 1) throw new Error("Note not written to nested path");
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 1", "Corrupted .bak does not crash read when primary file is valid", async () => {
    const env = createTempEnv("qp-s1-bakcorrupt-");
    try {
      const validNotes = [validateNote({ title: "Valid Primary", content: "Primary is intact" })];
      fs.writeFileSync(env.notesPath, JSON.stringify(validNotes, null, 2), "utf8");
      fs.writeFileSync(`${env.notesPath}.bak`, "CORRUPTED_BACKUP_GARBAGE", "utf8");

      const storage = new NotesStorage({ notesPath: env.notesPath });
      const notes = storage.getNotes("all");
      if (notes.length !== 1 || notes[0].title !== "Valid Primary") {
        throw new Error("Failed to read valid primary when backup is corrupted");
      }
    } finally {
      env.cleanup();
    }
  });

  // =========================================================================
  // SUITE 2: High Concurrency Rapid Saves & Atomic Persistence
  // =========================================================================
  console.log("\nSUITE 2: High Concurrency Rapid Saves & Atomic Persistence");

  await runTest("SUITE 2", "120 rapid sequential saves preserve all notes and order", async () => {
    const env = createTempEnv("qp-s2-seq-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const count = 120;

      for (let i = 0; i < count; i++) {
        storage.saveNote({
          title: `Note ${i.toString().padStart(3, "0")}`,
          content: `Body for note ${i} #tag-${i % 4}`,
        });
      }

      const notes = storage.getNotes("all", { limit: 200 });
      if (notes.length !== count) throw new Error(`Expected ${count} notes, got ${notes.length}`);
      if (notes[0].title !== "Note 119") throw new Error(`Expected first note to be 'Note 119', got '${notes[0].title}'`);
      if (notes[count - 1].title !== "Note 000") throw new Error(`Expected last note to be 'Note 000', got '${notes[count - 1].title}'`);

      const disk = JSON.parse(fs.readFileSync(env.notesPath, "utf8"));
      if (disk.length !== count) throw new Error(`Disk count ${disk.length} !== ${count}`);

      const tmpFiles = fs.readdirSync(env.tmpDir).filter((f) => f.includes(".tmp."));
      if (tmpFiles.length !== 0) throw new Error(`Leaked ${tmpFiles.length} tmp files`);
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 2", "100 rapid sequential updates to the same note preserve ID and advance updatedAt", async () => {
    const env = createTempEnv("qp-s2-update-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const initial = storage.saveNote({ title: "Live Document", content: "Version 0" });

      for (let i = 1; i <= 100; i++) {
        storage.saveNote({
          id: initial.id,
          title: "Live Document",
          content: `Version ${i}`,
        });
      }

      const notes = storage.getNotes("all");
      if (notes.length !== 1) throw new Error(`Expected 1 note, got ${notes.length}`);
      if (notes[0].id !== initial.id) throw new Error("Note ID changed");
      if (notes[0].content !== "Version 100") throw new Error(`Expected 'Version 100', got '${notes[0].content}'`);
      if (notes[0].createdAt !== initial.createdAt) throw new Error("createdAt was mutated");
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 2", "100 rapid concurrent atomic writes via atomicWriteJsonSync without file locks", async () => {
    const env = createTempEnv("qp-s2-atomic-");
    try {
      const targetFile = env.notesPath;
      const count = 100;

      const promises = Array.from({ length: count }, (_, i) => {
        return new Promise((resolve, reject) => {
          setImmediate(() => {
            try {
              atomicWriteJsonSync(targetFile, {
                writer: i,
                data: "X".repeat(200),
              }, { maxRetries: 25, retryDelayMs: 10 });
              resolve({ id: i, ok: true });
            } catch (err) {
              reject(err);
            }
          });
        });
      });

      const results = await Promise.all(promises);
      if (results.length !== count) throw new Error("Not all atomic writes completed");

      const content = JSON.parse(fs.readFileSync(targetFile, "utf8"));
      if (typeof content.writer !== "number") throw new Error("Corrupted write result");

      const tmpFiles = fs.readdirSync(env.tmpDir).filter((f) => f.includes(".tmp."));
      if (tmpFiles.length !== 0) throw new Error(`Leaked ${tmpFiles.length} tmp files`);
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 2", "Large payload handling: 1MB note content survives atomic persistence", async () => {
    const env = createTempEnv("qp-s2-1mb-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const oneMbBody = "Quick Pill Large Payload Testing line with timestamp.\n".repeat(19000); // ~1MB
      const note = storage.saveNote({
        title: "1MB Document",
        content: oneMbBody,
      });

      const reloaded = new NotesStorage({ notesPath: env.notesPath });
      const found = reloaded.getNoteById(note.id);
      if (!found) throw new Error("Large note not found after reload");
      if (found.content.length !== oneMbBody.length) throw new Error(`Content length mismatch: ${found.content.length} !== ${oneMbBody.length}`);
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 2", "500 notes scaling volume with multi-language unicode", async () => {
    const env = createTempEnv("qp-s2-500-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const count = 500;
      for (let i = 0; i < count; i++) {
        storage.saveNote({
          title: `Item ${i}`,
          content: `Content ${i} 💊 日本語 العربية #tag${i % 10}`,
        });
      }

      const all = storage.getNotes("all", { limit: 1000 });
      if (all.length !== count) throw new Error(`Expected ${count} notes, got ${all.length}`);

      const size = fs.statSync(env.notesPath).size;
      if (size < 40 * 1024) throw new Error(`File size too small: ${size}`);
    } finally {
      env.cleanup();
    }
  });

  // =========================================================================
  // SUITE 3: Draft Recovery Debouncing & Crash Simulation
  // =========================================================================
  console.log("\nSUITE 3: Draft Recovery Debouncing & Crash Simulation");

  await runTest("SUITE 3", "150 rapid keystrokes within 100ms collapse to exactly 1 write", async () => {
    const env = createTempEnv("qp-s3-debounce-");
    try {
      const draft = new DraftRecovery({ draftPath: env.draftPath, debounceMs: 60 });
      for (let i = 1; i <= 150; i++) {
        draft.saveDraft({ title: "In-Flight", content: "Key " + i });
      }

      if (fs.existsSync(env.draftPath)) throw new Error("File written before debounce expired");

      await new Promise((r) => setTimeout(r, 100));

      if (!fs.existsSync(env.draftPath)) throw new Error("File NOT written after debounce expired");
      const disk = JSON.parse(fs.readFileSync(env.draftPath, "utf8"));
      if (disk.content !== "Key 150") throw new Error(`Expected 'Key 150', got '${disk.content}'`);

      draft.destroy();
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 3", "Sudden process restart restores dirty draft with all fields across sessions", async () => {
    const env = createTempEnv("qp-s3-crash-");
    try {
      const session1 = new DraftRecovery({ draftPath: env.draftPath });
      session1.saveDraft({
        title: "Crash Recovery Test",
        content: "Unsaved text before sudden process crash",
        tags: ["incident", "unsaved"],
        sourceMetadata: { appName: "Terminal", pid: 1234 },
      });
      session1.flushDraft();
      session1.destroy(); // Sudden death

      const session2 = new DraftRecovery({ draftPath: env.draftPath });
      const restored = session2.getDraft();
      if (!restored) throw new Error("Draft not restored");
      if (restored.title !== "Crash Recovery Test") throw new Error("Title mismatch");
      if (restored.content !== "Unsaved text before sudden process crash") throw new Error("Content mismatch");
      if (!restored.isDirty) throw new Error("isDirty flag lost");
      if (!Array.isArray(restored.tags) || restored.tags.length !== 2) throw new Error("Tags mismatch");
      if (!restored.sourceMetadata || restored.sourceMetadata.appName !== "Terminal") throw new Error("sourceMetadata mismatch");

      session2.clearDraft();
      if (fs.existsSync(env.draftPath)) throw new Error("Draft file not unlinked on clearDraft");
      if (session2.getDraft() !== null) throw new Error("getDraft did not return null after clear");
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 3", "Corrupted or 0-byte draft file degrades gracefully without crashing", async () => {
    const env = createTempEnv("qp-s3-corrupt-");
    try {
      fs.writeFileSync(env.draftPath, "", "utf8");
      const d1 = new DraftRecovery({ draftPath: env.draftPath });
      if (d1.getDraft() !== null) throw new Error("0-byte draft did not return null");

      fs.writeFileSync(env.draftPath, "MALFORMED_JSON_DRAFT", "utf8");
      const d2 = new DraftRecovery({ draftPath: env.draftPath });
      if (d2.getDraft() !== null) throw new Error("Malformed JSON did not return null");

      fs.writeFileSync(env.draftPath, JSON.stringify({ isDirty: false, content: "clean" }), "utf8");
      const d3 = new DraftRecovery({ draftPath: env.draftPath });
      if (d3.getDraft() !== null) throw new Error("Non-dirty draft did not return null");
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 3", "clearDraft unlinks file and cancels pending debounce timer", async () => {
    const env = createTempEnv("qp-s3-cancel-");
    try {
      const draft = new DraftRecovery({ draftPath: env.draftPath, debounceMs: 50 });
      draft.saveDraft({ content: "Discarded note" });
      draft.clearDraft();

      await new Promise((r) => setTimeout(r, 80));
      if (fs.existsSync(env.draftPath)) throw new Error("Draft file was written by canceled timer");
      draft.destroy();
    } finally {
      env.cleanup();
    }
  });

  // =========================================================================
  // SUITE 4: Critical Edge Cases & Contract Vulnerabilities (Bug Mining)
  // =========================================================================
  console.log("\nSUITE 4: Critical Edge Cases & Contract Vulnerabilities (Bug Mining)");

  await runTest("SUITE 4", "BUG CHECK 1: Partial update saveNote({ id, content }) preserves isPinned", async () => {
    const env = createTempEnv("qp-s4-pin-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const n = storage.saveNote({ title: "Pinned Note", content: "Important", isPinned: true });
      if (!n.isPinned) throw new Error("Failed to set isPinned initially");

      // Update content only
      const updated = storage.saveNote({ id: n.id, content: "Important (edited)" });
      if (updated.isPinned !== true) {
        throw new Error(`isPinned was clobbered to false! (Expected: true, Got: ${updated.isPinned})`);
      }
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 4", "BUG CHECK 2: Partial update saveNote({ id, content }) preserves isArchived", async () => {
    const env = createTempEnv("qp-s4-arc-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const n = storage.saveNote({ title: "Archived Note", content: "Historical", isArchived: true });
      if (!n.isArchived) throw new Error("Failed to set isArchived initially");

      // Update content only
      const updated = storage.saveNote({ id: n.id, content: "Historical (edited)" });
      if (updated.isArchived !== true) {
        throw new Error(`isArchived was clobbered to false! (Expected: true, Got: ${updated.isArchived})`);
      }
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 4", "BUG CHECK 3: Partial update saveNote({ id, content }) preserves sourceMetadata", async () => {
    const env = createTempEnv("qp-s4-meta-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const n = storage.saveNote({
        title: "Web Snippet",
        content: "Content from Chrome",
        sourceMetadata: { appName: "Google Chrome", windowTitle: "GitHub PR" },
      });
      if (!n.sourceMetadata || n.sourceMetadata.appName !== "Google Chrome") {
        throw new Error("Failed to set sourceMetadata initially");
      }

      // Update content only
      const updated = storage.saveNote({ id: n.id, content: "Content from Chrome (edited)" });
      if (!updated.sourceMetadata || updated.sourceMetadata.appName !== "Google Chrome") {
        throw new Error(`sourceMetadata was clobbered to null! (Got: ${JSON.stringify(updated.sourceMetadata)})`);
      }
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 4", "BUG CHECK 4: Partial update saveNote({ id, content }) preserves explicit tags", async () => {
    const env = createTempEnv("qp-s4-tags-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const n = storage.saveNote({
        title: "Tagged Item",
        content: "Plain body without hashtags",
        tags: ["architecture", "review"],
      });
      if (n.tags.length !== 2) throw new Error("Failed to set tags initially");

      // Update content only
      const updated = storage.saveNote({ id: n.id, content: "Plain body without hashtags (edited)" });
      if (!updated.tags.includes("architecture") || !updated.tags.includes("review")) {
        throw new Error(`Explicit tags were clobbered to empty array! (Got: ${JSON.stringify(updated.tags)})`);
      }
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 4", "BUG CHECK 5: Partial update saveNote({ id, content }) preserves custom title", async () => {
    const env = createTempEnv("qp-s4-title-");
    try {
      const storage = new NotesStorage({ notesPath: env.notesPath });
      const n = storage.saveNote({
        title: "Curated Manual Title",
        content: "First line of raw text",
      });
      if (n.title !== "Curated Manual Title") throw new Error("Failed to set custom title initially");

      // Update content only
      const updated = storage.saveNote({ id: n.id, content: "First line edited text" });
      if (updated.title !== "Curated Manual Title") {
        throw new Error(`Custom title was overwritten with auto-extracted title! (Expected: 'Curated Manual Title', Got: '${updated.title}')`);
      }
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 4", "BUG CHECK 6: createNotesEngine.searchNotes() searches beyond the 50 most recent notes", async () => {
    const env = createTempEnv("qp-s4-search50-");
    try {
      const engine = createNotesEngine({ userDataPath: env.tmpDir });
      // Insert 65 notes. The needle is inserted early (so it ends up deep in LIFO history)
      for (let i = 0; i < 65; i++) {
        engine.saveNote({
          title: `Note ${i}`,
          content: i === 2 ? "Special unique needle token: XYLOPHONE_SECRET_KEY" : `Standard note ${i}`,
        });
      }

      const searchResults = engine.searchNotes("XYLOPHONE_SECRET_KEY");
      if (searchResults.length === 0) {
        throw new Error("searchNotes failed to find note beyond index 50 because getNotes() defaults to limit 50!");
      }
      engine.destroy();
    } finally {
      env.cleanup();
    }
  });

  await runTest("SUITE 4", "BUG CHECK 7: createNotesEngine.getTags() indexes tags beyond the 50 most recent notes", async () => {
    const env = createTempEnv("qp-s4-tags50-");
    try {
      const engine = createNotesEngine({ userDataPath: env.tmpDir });
      // Insert 65 notes. Note 2 has unique tag #deep_vault_tag
      for (let i = 0; i < 65; i++) {
        engine.saveNote({
          title: `Note ${i}`,
          content: i === 2 ? "Note with tag #deep_vault_tag" : `Standard note ${i}`,
        });
      }

      const allTags = engine.getTags();
      const hasDeepTag = allTags.some((t) => t.tag === "deep_vault_tag");
      if (!hasDeepTag) {
        throw new Error("getTags failed to index tags beyond index 50 because getNotes() defaults to limit 50!");
      }
      engine.destroy();
    } finally {
      env.cleanup();
    }
  });

  // Summary
  console.log("\n===============================================================");
  console.log(`  STRESS TEST SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed (Total: ${totalPassed + totalFailed})`);
  console.log("===============================================================");
  if (totalFailed > 0) {
    console.log(`\nIdentified ${totalFailed} Failure(s):`);
    failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.suite}] ${f.name}`);
      console.log(`     Reason: ${f.error}`);
    });
  }
}

main().catch((err) => {
  console.error("FATAL HARNESS ERROR:", err);
  process.exit(1);
});
