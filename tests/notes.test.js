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
const { DraftRecovery } = require("../src/services/notes/draftRecovery");
const {
  extractTags,
  normalizeTag,
  buildTagIndex,
  getAllTags,
  filterNotesByTags,
  getSuggestedTags,
} = require("../src/services/notes/tagEngine");
const {
  scoreNote,
  searchNotes,
  extractSnippet,
  findHighlights,
  filterInbox,
} = require("../src/services/notes/notesSearch");
const {
  createContextAdapter,
  cleanTextContent,
  deriveAutoTitle,
  evaluateContentGuard,
} = require("../src/services/notes/contextAdapter");
const {
  createNotesEngine,
  NOTE_FILTER_TYPES,
  CAPTURE_ERROR_CODES,
  GUARD_LIMITS,
} = require("../src/services/notes/index");

// Helper to create isolated sandbox directory per test
function createTempEnv() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-notes-test-"));
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

// ==========================================
// TIER 1: Feature Coverage (Core Functional Paths)
// ==========================================

test("Note Schema Validation - defaults, UUID generation, and boundaries", () => {
  const note = validateNote({ content: "This is a simple note body" });
  assert.ok(note.id, "Should auto-generate a UUID");
  assert.strictEqual(note.content, "This is a simple note body");
  assert.strictEqual(note.title, "This is a simple note body");
  assert.deepStrictEqual(note.tags, []);
  assert.strictEqual(note.isPinned, false);
  assert.strictEqual(note.isArchived, false);
  assert.strictEqual(note.sourceMetadata, null);
  assert.ok(Date.parse(note.createdAt), "createdAt should be valid ISO date");
  assert.ok(Date.parse(note.updatedAt), "updatedAt should be valid ISO date");

  // Invalid non-object throws TypeError
  assert.throws(() => validateNote(null), /Note must be a non-null object/);
  assert.throws(() => validateNote("not-an-object"), /Note must be a non-null object/);
});

test("Title Extraction - auto-derives title and strips markdown formatting", () => {
  assert.strictEqual(extractTitleFromContent("# Project Roadmap\nNext sprint items"), "Project Roadmap");
  assert.strictEqual(extractTitleFromContent("### Architecture Meeting\nAttendees: Alice"), "Architecture Meeting");
  assert.strictEqual(extractTitleFromContent("- [ ] Implement storage layer\nDetails here"), "Implement storage layer");
  assert.strictEqual(extractTitleFromContent("> Note: Important warning\nBody text"), "Note: Important warning");
  assert.strictEqual(extractTitleFromContent("**Bold Header**\nContent"), "Bold Header");
  assert.strictEqual(extractTitleFromContent("   \n\n  First actual line  \nSecond line"), "First actual line");
  assert.strictEqual(extractTitleFromContent(""), "Untitled Note");
  assert.strictEqual(extractTitleFromContent("   \n  \t  \n  "), "Untitled Note");

  // Title length clamping
  const longLine = "A".repeat(150);
  const clamped = extractTitleFromContent(longLine, 80);
  assert.strictEqual(clamped.length, 80);
  assert.ok(clamped.endsWith("…"));
});

test("Tag Engine - extracts #tags, deduplicates, and lowercases", () => {
  const content = "Discussing #QuickPill architecture with #devs and #QuickPill team #meeting-1";
  const tags = extractTags(content);
  assert.deepStrictEqual(tags, ["devs", "meeting-1", "quickpill"]);

  // Ignores numeric-only tags like #123 (ticket numbers)
  assert.deepStrictEqual(extractTags("Fix bug #123 and #456"), []);

  // Merging with explicit tags in validateNote
  const note = validateNote({
    content: "Reviewing #security rules",
    tags: ["Backend", "SECURITY"],
  });
  assert.deepStrictEqual(note.tags.sort(), ["backend", "security"].sort());
});

test("Tag Engine - builds tag index tracking active, archived, and total counts", () => {
  const notes = [
    { id: "n1", tags: ["work", "quick-pill"], isArchived: false },
    { id: "n2", tags: ["work"], isArchived: false },
    { id: "n3", tags: ["work", "archive-topic"], isArchived: true },
  ];
  const { tags, allTags } = buildTagIndex(notes);

  assert.strictEqual(tags["work"].count, 2);
  assert.strictEqual(tags["work"].archivedCount, 1);
  assert.strictEqual(tags["work"].totalCount, 3);
  assert.deepStrictEqual(tags["work"].noteIds, ["n1", "n2", "n3"]);

  assert.strictEqual(tags["quick-pill"].count, 1);
  assert.strictEqual(tags["quick-pill"].archivedCount, 0);

  // allTags is sorted by active count desc
  assert.strictEqual(allTags[0], "work");
  assert.strictEqual(allTags[1], "quick-pill");
});

test("Tag Engine - multi-tag filtering supports AND and OR modes", () => {
  const notes = [
    { id: "1", tags: ["work", "meeting"] },
    { id: "2", tags: ["work"] },
    { id: "3", tags: ["personal"] },
  ];

  const andResult = filterNotesByTags(notes, ["work", "meeting"], { mode: "AND" });
  assert.strictEqual(andResult.length, 1);
  assert.strictEqual(andResult[0].id, "1");

  const orResult = filterNotesByTags(notes, ["meeting", "personal"], { mode: "OR" });
  assert.strictEqual(orResult.length, 2);
  assert.deepStrictEqual(orResult.map((n) => n.id), ["1", "3"]);
});

test("Tag Engine - autocomplete suggestions match prefix and contains", () => {
  const { allTags } = buildTagIndex([
    { tags: ["frontend", "framework", "backend", "fullstack"] },
  ]);
  const suggestions = getSuggestedTags({ allTags }, "front", 5);
  assert.deepStrictEqual(suggestions, ["frontend"]);

  const broadSuggestions = getSuggestedTags({ allTags }, "end", 5);
  assert.ok(broadSuggestions.includes("backend"));
  assert.ok(broadSuggestions.includes("frontend"));
});

test("Atomic Persistence - writes and reads notes accurately", () => {
  const env = createTempEnv();
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });

    assert.deepStrictEqual(storage.getNotes("all"), []);

    const note1 = storage.saveNote({ content: "First note content #ideas" });
    assert.strictEqual(storage.getNotes("all").length, 1);

    const storage2 = new NotesStorage({ notesPath: env.notesPath });
    const notes = storage2.getNotes("all");
    assert.strictEqual(notes.length, 1);
    assert.strictEqual(notes[0].id, note1.id);
    assert.strictEqual(notes[0].content, "First note content #ideas");
    assert.deepStrictEqual(notes[0].tags, ["ideas"]);

    const files = fs.readdirSync(env.tmpDir);
    const tmpFiles = files.filter((f) => f.includes(".tmp."));
    assert.strictEqual(tmpFiles.length, 0);
  } finally {
    env.cleanup();
  }
});

test("CRUD Operations - Save, Update, Delete, Undo", () => {
  const env = createTempEnv();
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });

    // 1. Create
    const created = storage.saveNote({
      title: "Custom Title",
      content: "Original body",
      tags: ["work"],
    });
    assert.strictEqual(created.title, "Custom Title");

    // 2. Update
    const updated = storage.saveNote({
      id: created.id,
      content: "Updated body with #urgent",
    });
    assert.strictEqual(updated.id, created.id);
    assert.strictEqual(updated.content, "Updated body with #urgent");
    assert.deepStrictEqual(updated.tags, ["urgent"]);
    assert.strictEqual(updated.createdAt, created.createdAt);

    // 3. Delete
    const delResult = storage.deleteNote(created.id);
    assert.strictEqual(delResult.success, true);
    assert.strictEqual(storage.getNotes("all").length, 0);

    const delNonExistent = storage.deleteNote("non-existent-uuid");
    assert.strictEqual(delNonExistent.success, false);

    // 4. Undo Delete
    const undoResult = storage.undoDelete();
    assert.strictEqual(undoResult.success, true);
    assert.strictEqual(storage.getNotes("all").length, 1);
    assert.strictEqual(storage.getNotes("all")[0].id, created.id);
  } finally {
    env.cleanup();
  }
});

test("Pin and Archive Lifecycle - toggle state and view segregation", () => {
  const env = createTempEnv();
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });

    const noteA = storage.saveNote({ content: "Note A" });
    const noteB = storage.saveNote({ content: "Note B" });

    // Pin noteA
    const pinRes = storage.togglePin(noteA.id);
    assert.strictEqual(pinRes.success, true);
    assert.strictEqual(pinRes.isPinned, true);

    // Pinned filter returns only noteA
    const pinnedNotes = storage.getNotes("pinned");
    assert.strictEqual(pinnedNotes.length, 1);
    assert.strictEqual(pinnedNotes[0].id, noteA.id);

    // All filter returns pinned notes at top
    const allNotes = storage.getNotes("all");
    assert.strictEqual(allNotes[0].id, noteA.id);
    assert.strictEqual(allNotes[1].id, noteB.id);

    // Archive noteB
    const arcRes = storage.toggleArchive(noteB.id);
    assert.strictEqual(arcRes.success, true);
    assert.strictEqual(arcRes.isArchived, true);

    // NoteB disappears from 'all', appears in 'archived'
    assert.strictEqual(storage.getNotes("all").length, 1);
    assert.strictEqual(storage.getNotes("archived").length, 1);
    assert.strictEqual(storage.getNotes("archived")[0].id, noteB.id);

    // Unarchive noteB
    storage.toggleArchive(noteB.id);
    assert.strictEqual(storage.getNotes("all").length, 2);
    assert.strictEqual(storage.getNotes("archived").length, 0);
  } finally {
    env.cleanup();
  }
});

test("Search and Tag Filtering - exact, keyword, and tag query", () => {
  const env = createTempEnv();
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });

    storage.saveNote({ title: "Grocery List", content: "Apples, Milk, Bread #shopping" });
    storage.saveNote({ title: "Sprint Goals", content: "Ship Quick Pill v5.5 #dev" });
    storage.saveNote({ title: "Meeting Notes", content: "Discussed budget and roadmap #planning" });

    // Search query
    const results = storage.getNotes("all", { query: "pill" });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].title, "Sprint Goals");

    // Tag filter
    const shoppingNotes = storage.getNotes("all", { tag: "shopping" });
    assert.strictEqual(shoppingNotes.length, 1);
    assert.strictEqual(shoppingNotes[0].title, "Grocery List");
  } finally {
    env.cleanup();
  }
});

test("Full-Text Search - title exact scores higher than body match", () => {
  const notes = [
    { id: "1", title: "Meeting Notes", content: "General agenda", tags: [], updatedAt: new Date().toISOString() },
    { id: "2", title: "Project Overview", content: "Mentions meeting notes in passing", tags: [], updatedAt: new Date().toISOString() },
  ];

  const results = searchNotes(notes, "meeting notes");
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].note.id, "1");
  assert.ok(results[0].score > results[1].score);
});

test("Full-Text Search - multi-token conjunction bonus rewards full token match", () => {
  const notes = [
    { id: "1", title: "Quick Pill Audio", content: "Mixer settings", tags: ["audio"], updatedAt: new Date().toISOString() },
    { id: "2", title: "Audio Architecture", content: "General discussion", tags: [], updatedAt: new Date().toISOString() },
  ];

  const results = searchNotes(notes, "quick audio");
  assert.strictEqual(results[0].note.id, "1");
  assert.ok(results[0].score > results[1].score);
});

test("Search Match Hints - extracts 140-char snippet with highlight intervals", () => {
  const content = "Initial context. The team reviewed the new tag indexing engine and verified full search performance. Concluding remarks.";
  const { snippet, highlights } = extractSnippet(content, ["tag", "indexing"]);

  assert.ok(snippet.includes("tag indexing engine"));
  assert.ok(highlights.length >= 2);
  for (const h of highlights) {
    const textAtOffset = snippet.slice(h.start, h.end).toLowerCase();
    assert.ok(textAtOffset.includes("tag") || textAtOffset.includes("indexing"));
  }
});

test("Multi-View Inbox Filter - segregation across All, Recent, Pinned, and Archived", () => {
  const notes = [
    { id: "1", title: "Note 1", isPinned: false, isArchived: false, updatedAt: "2026-10-15T10:00:00Z" },
    { id: "2", title: "Note 2", isPinned: true, isArchived: false, updatedAt: "2026-10-15T11:00:00Z" },
    { id: "3", title: "Note 3", isPinned: false, isArchived: true, updatedAt: "2026-10-15T12:00:00Z" },
  ];

  const all = filterInbox(notes, { view: "all" });
  assert.strictEqual(all.length, 2);
  assert.strictEqual(all[0].id, "2"); // Pinned first

  const pinned = filterInbox(notes, { view: "pinned" });
  assert.strictEqual(pinned.length, 1);
  assert.strictEqual(pinned[0].id, "2");

  const archived = filterInbox(notes, { view: "archived" });
  assert.strictEqual(archived.length, 1);
  assert.strictEqual(archived[0].id, "3");
});

test("Context Sanitization & Auto-Titling - cleanTextContent and deriveAutoTitle", () => {
  const cleaned = cleanTextContent("  Line 1  \r\n\r\n\r\nLine 2   \rLine 3\x07  ");
  assert.strictEqual(cleaned, "Line 1\n\nLine 2\nLine 3");

  const note1 = "# Meeting Notes\nWe agreed on the roadmap. Next sprint starts Monday.";
  assert.strictEqual(deriveAutoTitle(note1), "Meeting Notes");

  const note2 = "### 2. Architecture Review\nDetails below.";
  assert.strictEqual(deriveAutoTitle(note2), "Architecture Review");

  const note3 = "- [x] Fix critical memory leak in AudioEngine! We found the root cause.";
  assert.strictEqual(deriveAutoTitle(note3), "Fix critical memory leak in AudioEngine!");

  const longSentence = "This is an extraordinarily long sentence intended to test whether our auto-titling algorithm truncates gracefully without breaking mid-word.";
  const title = deriveAutoTitle(longSentence);
  assert.ok(title.length <= 60);
  assert.ok(title.endsWith("..."));
});

// ==========================================
// TIER 2: Boundary & Corner Cases (Failure Modes)
// ==========================================

test("Corruption Recovery - restores from .bak when primary file is corrupt JSON", () => {
  const env = createTempEnv();
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });
    const n = storage.saveNote({ content: "Critical Data to Preserve" });

    const backupPath = `${env.notesPath}.bak`;
    assert.ok(fs.existsSync(backupPath), "Backup file notes.json.bak should exist");

    // Corrupt primary file
    fs.writeFileSync(env.notesPath, '{"broken": [true, false, ', "utf8");

    // Re-open storage: should automatically recover from backup
    const recoveredStorage = new NotesStorage({ notesPath: env.notesPath });
    const notes = recoveredStorage.getNotes("all");
    assert.strictEqual(notes.length, 1);
    assert.strictEqual(notes[0].id, n.id);
    assert.strictEqual(notes[0].content, "Critical Data to Preserve");
  } finally {
    env.cleanup();
  }
});

test("Total Corruption Salvage - quarantines corrupt file and avoids crash", () => {
  const env = createTempEnv();
  try {
    fs.writeFileSync(env.notesPath, "INVALID JUNK DATA", "utf8");
    fs.writeFileSync(`${env.notesPath}.bak`, "CORRUPT BACKUP", "utf8");

    const storage = new NotesStorage({ notesPath: env.notesPath });
    const notes = storage.getNotes("all");
    assert.deepStrictEqual(notes, [], "Should initialize empty array instead of crashing");

    const files = fs.readdirSync(env.tmpDir);
    const corruptFiles = files.filter((f) => f.includes(".corrupt."));
    assert.strictEqual(corruptFiles.length, 1);
  } finally {
    env.cleanup();
  }
});

test("Debounced Autosave Engine - collapses rapid keystrokes into debounced write", async () => {
  const env = createTempEnv();
  try {
    const draftRecovery = new DraftRecovery({
      draftPath: env.draftPath,
      debounceMs: 50,
    });

    for (let i = 1; i <= 10; i++) {
      draftRecovery.saveDraft({ content: `Keystroke ${i}` });
    }

    assert.strictEqual(fs.existsSync(env.draftPath), false);

    await new Promise((r) => setTimeout(r, 80));

    assert.ok(fs.existsSync(env.draftPath), "draft-recovery.json should exist after debounce");
    const raw = JSON.parse(fs.readFileSync(env.draftPath, "utf8"));
    assert.strictEqual(raw.content, "Keystroke 10");
    assert.strictEqual(raw.isDirty, true);

    draftRecovery.destroy();
  } finally {
    env.cleanup();
  }
});

test("Crash Recovery Buffer - Dirty State Tracking and Startup Restore", () => {
  const env = createTempEnv();
  try {
    const draftRecovery = new DraftRecovery({ draftPath: env.draftPath });
    draftRecovery.saveDraft({
      title: "Unsaved Meeting Notes",
      content: "Important action items before unexpected power-off",
      isDirty: true,
    });
    draftRecovery.flushDraft();
    draftRecovery.destroy();

    const freshSession = new DraftRecovery({ draftPath: env.draftPath });
    const recoveredDraft = freshSession.getDraft();

    assert.ok(recoveredDraft, "Should retrieve dirty draft on restart");
    assert.strictEqual(recoveredDraft.title, "Unsaved Meeting Notes");
    assert.strictEqual(recoveredDraft.content, "Important action items before unexpected power-off");
    assert.strictEqual(recoveredDraft.isDirty, true);

    freshSession.clearDraft();
    assert.strictEqual(fs.existsSync(env.draftPath), false, "Draft file should be unlinked on clear");
    assert.strictEqual(freshSession.getDraft(), null);
  } finally {
    env.cleanup();
  }
});

test("Large Payload Handling - preserves 100KB+ note body without truncation", () => {
  const env = createTempEnv();
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });
    const largeBody = "Line of log text with details and timestamps.\n".repeat(2500); // ~115 KB

    const note = storage.saveNote({
      title: "Large Note",
      content: largeBody,
    });

    const reloaded = storage.getNoteById(note.id);
    assert.strictEqual(reloaded.content.length, largeBody.length);
    assert.strictEqual(reloaded.content, largeBody);
  } finally {
    env.cleanup();
  }
});

test("Tag Engine - ignores markdown headings, pure numbers, and hex colors", () => {
  const content = `
# Markdown Heading 1
## Heading 2
Color: #ff9500 and #34c759 and #ffffff.
Pure digits: #123 and #2026.
Real tags: #valid-tag and #release_2.
  `;
  const tags = extractTags(content);
  assert.deepStrictEqual(tags, ["release_2", "valid-tag"]);
});

test("Tag Engine - ignores code blocks and URL anchors", () => {
  const content = `
Visit https://example.com/repo#readme for documentation.
\`#inline_code\` should be ignored.
\`\`\`
#block_code should be ignored
\`\`\`
Tag here: #actual_tag.
  `;
  const tags = extractTags(content);
  assert.deepStrictEqual(tags, ["actual_tag"]);
});

test("Search Engine - regex special characters match literally without crashing", () => {
  const notes = [
    { id: "1", title: "C++ Programming", content: "Details on c++ std::vector", tags: ["c++"] },
    { id: "2", title: "Regex [a-z]* Notes", content: "Testing (brackets) and $^? characters", tags: [] },
  ];

  const q1 = searchNotes(notes, "c++");
  assert.ok(q1.length > 0);

  const q2 = searchNotes(notes, "[a-z]*");
  assert.ok(q2.length > 0);

  const q3 = searchNotes(notes, "($^?)");
  assert.ok(Array.isArray(q3));
});

test("Content Guard - detects >300 chars, >1KB byte threshold, and rejects >5MB", () => {
  // Small text passes
  const small = evaluateContentGuard("Normal short note");
  assert.strictEqual(small.isAllowed, true);
  assert.strictEqual(small.requiresConfirmation, false);

  // >300 chars triggers confirmation
  const longText = "Quick Pill notes guard ".repeat(20); // 460 chars
  const guardLong = evaluateContentGuard(longText);
  assert.strictEqual(guardLong.isAllowed, true);
  assert.strictEqual(guardLong.requiresConfirmation, true);
  assert.ok(guardLong.preview.endsWith("..."));

  // >1024 bytes triggers byte threshold
  const cjkText = "💊".repeat(260); // 1040 bytes
  const guardBytes = evaluateContentGuard(cjkText);
  assert.strictEqual(guardBytes.isAllowed, true);
  assert.strictEqual(guardBytes.requiresConfirmation, true);
  assert.ok(guardBytes.byteCount > 1024);

  // >5MB is rejected
  const hugeText = "X".repeat(5 * 1024 * 1024 + 10);
  const guardHuge = evaluateContentGuard(hugeText);
  assert.strictEqual(guardHuge.isAllowed, false);
  assert.strictEqual(guardHuge.code, CAPTURE_ERROR_CODES.PAYLOAD_TOO_LARGE);
});

// ==========================================
// TIER 3: Cross-Feature Interactions
// ==========================================

test("Unified Facade - saving note automatically commits and clears dirty draft", () => {
  const env = createTempEnv();
  try {
    const engine = createNotesEngine({
      notesPath: env.notesPath,
      draftPath: env.draftPath,
      debounceMs: 50,
    });

    engine.saveDraft({ content: "Draft in progress #work" });
    engine.flushDraft();
    assert.ok(fs.existsSync(env.draftPath));
    assert.ok(engine.getDraft());

    const note = engine.saveNote({ content: "Draft in progress #work" });
    assert.strictEqual(note.content, "Draft in progress #work");
    assert.deepStrictEqual(note.tags, ["work"]);

    assert.strictEqual(fs.existsSync(env.draftPath), false);
    assert.strictEqual(engine.getDraft(), null);

    engine.destroy();
  } finally {
    env.cleanup();
  }
});

test("Tag Aggregation across multiple notes", () => {
  const env = createTempEnv();
  try {
    const storage = new NotesStorage({ notesPath: env.notesPath });

    storage.saveNote({ content: "Note 1 #apple #banana" });
    storage.saveNote({ content: "Note 2 #banana #cherry" });
    storage.saveNote({ content: "Note 3 #apple #banana" });

    const notes = storage.getNotes("all");
    const tagSummary = getAllTags(notes);

    assert.strictEqual(tagSummary.find((t) => t.tag === "banana").count, 3);
    assert.strictEqual(tagSummary.find((t) => t.tag === "apple").count, 2);
    assert.strictEqual(tagSummary.find((t) => t.tag === "cherry").count, 1);
  } finally {
    env.cleanup();
  }
});

test("Clipboard Capture - attaches external window source metadata", async () => {
  const adapter = createContextAdapter({
    mockClipboard: () => ({ success: true, text: "Captured snippet from web page" }),
    mockForeground: () => ({
      appName: "Google Chrome",
      windowTitle: "GitHub - Quick Pill Pull Request",
      processName: "chrome.exe",
      pid: 1420,
      timestamp: "2026-10-15T19:00:00.000Z",
    }),
  });

  const res = await adapter.captureClipboard();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.method, "clipboard");
  assert.strictEqual(res.content, "Captured snippet from web page");
  assert.strictEqual(res.suggestedTitle, "Captured snippet from web page");
  assert.deepStrictEqual(res.sourceMetadata, {
    appName: "Google Chrome",
    windowTitle: "GitHub - Quick Pill Pull Request",
    processName: "chrome.exe",
    pid: 1420,
    timestamp: "2026-10-15T19:00:00.000Z",
  });
});

// ==========================================
// TIER 4: Honest UIPI Limitation Reporting & Fallback
// ==========================================

test("getContextualCapture - reports SELECTION_UNAVAILABLE_UIPI and falls back to clipboard", async () => {
  const adapter = createContextAdapter({
    mockClipboard: () => ({ success: true, text: "Copied code from terminal" }),
    mockForeground: () => ({
      appName: "Windows Terminal",
      windowTitle: "Administrator: Windows PowerShell",
      processName: "WindowsTerminal.exe",
      pid: 8840,
      timestamp: "2026-10-15T19:10:00.000Z",
    }),
  });

  // Default: fallbackToClipboard === true
  const resFallback = await adapter.getContextualCapture({ method: "external_selection" });
  assert.strictEqual(resFallback.success, true);
  assert.strictEqual(resFallback.code, CAPTURE_ERROR_CODES.SELECTION_UNAVAILABLE_UIPI);
  assert.strictEqual(resFallback.fallbackUsed, true);
  assert.strictEqual(resFallback.content, "Copied code from terminal");
  assert.strictEqual(resFallback.sourceMetadata.appName, "Windows Terminal");

  // Explicit: fallbackToClipboard === false
  const resNoFallback = await adapter.getContextualCapture({
    method: "external_selection",
    fallbackToClipboard: false,
  });
  assert.strictEqual(resNoFallback.success, false);
  assert.strictEqual(resNoFallback.code, CAPTURE_ERROR_CODES.SELECTION_UNAVAILABLE_UIPI);
  assert.strictEqual(resNoFallback.fallback, "clipboard");
});
