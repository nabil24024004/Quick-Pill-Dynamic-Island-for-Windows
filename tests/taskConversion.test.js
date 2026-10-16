"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractTaskTitle,
  convertNoteToTask,
  normalizeTask,
} = require("../src/services/notes/taskConverter");

// ==========================================
// TIER 1: Feature Coverage (Task Conversion)
// ==========================================

test("taskConverter - Tier 1: Converts standard note to task extracting title and linking body", () => {
  const note = {
    id: "note-uuid-1234",
    title: "Meeting Action Items",
    content: "Refactor audio mixer native loop\nVerify all tests pass\nShip build",
    isPinned: false,
    isArchived: false,
  };

  const task = convertNoteToTask(note);

  assert.ok(task.id);
  assert.strictEqual(task.title, "Refactor audio mixer native loop");
  assert.strictEqual(task.body, note.content);
  assert.strictEqual(task.noteId, "note-uuid-1234");
  assert.strictEqual(task.completed, false);
  assert.ok(task.createdAt);
  assert.strictEqual(task.source, "quick_notes");
});

test("taskConverter - Tier 1: Truncates overlong first lines to <= 60 characters with ellipsis", () => {
  const content = "This is an exceptionally long first line of a note that easily exceeds sixty characters and needs clean word-boundary truncation";
  const title = extractTaskTitle(content);

  assert.ok(title.length <= 60);
  assert.ok(title.endsWith("..."));
  assert.strictEqual(title, "This is an exceptionally long first line of a note that...");
});

test("taskConverter - Tier 1: Source note remains completely unmutated and intact", () => {
  const note = Object.freeze({
    id: "note-frozen",
    title: "Frozen Note",
    content: "Do not touch this content",
    isPinned: true,
    isArchived: false,
  });

  const task = convertNoteToTask(note);
  assert.strictEqual(task.noteId, "note-frozen");
  assert.strictEqual(note.isArchived, false);
});

test("taskConverter - Tier 1: normalizeTask supports legacy string[] tasks seamlessly", () => {
  const legacyTask = "Buy groceries";
  const normalized = normalizeTask(legacyTask, 3);

  assert.strictEqual(normalized.title, "Buy groceries");
  assert.strictEqual(normalized.id, "legacy_3");
  assert.strictEqual(normalized.completed, false);
  assert.strictEqual(normalized.isLegacy, true);
  assert.strictEqual(normalized.noteId, null);
});

test("taskConverter - Tier 1: normalizeTask preserves structured task objects intact", () => {
  const structuredTask = {
    id: "task-99",
    title: "Implement Tag Indexing",
    body: "Details...",
    noteId: "note-12",
    completed: true,
  };
  const normalized = normalizeTask(structuredTask);

  assert.strictEqual(normalized.id, "task-99");
  assert.strictEqual(normalized.title, "Implement Tag Indexing");
  assert.strictEqual(normalized.noteId, "note-12");
  assert.strictEqual(normalized.completed, true);
  assert.strictEqual(normalized.isLegacy, false);
});

// ==========================================
// TIER 2: Boundary & Corner Cases
// ==========================================

test("taskConverter - Tier 2: Strips leading markdown headings, checkboxes, and bullet prefixes", () => {
  assert.strictEqual(extractTaskTitle("# Top Priority Initiative"), "Top Priority Initiative");
  assert.strictEqual(extractTaskTitle("## Subheading Topic"), "Subheading Topic");
  assert.strictEqual(extractTaskTitle("- [ ] Complete integration test pass"), "Complete integration test pass");
  assert.strictEqual(extractTaskTitle("- [x] Already checked task"), "Already checked task");
  assert.strictEqual(extractTaskTitle("* Bullet point task"), "Bullet point task");
  assert.strictEqual(extractTaskTitle("1. Numbered item task"), "Numbered item task");
  assert.strictEqual(extractTaskTitle("> Quoted remark task"), "Quoted remark task");
});

test("taskConverter - Tier 2: Handles empty, whitespace-only notes and multiple blank lines", () => {
  assert.strictEqual(extractTaskTitle(""), "Untitled Task");
  assert.strictEqual(extractTaskTitle("   \n\n   "), "Untitled Task");
  assert.strictEqual(extractTaskTitle("\n\n\nActual first text line\nSecond line"), "Actual first text line");

  const emptyNote = { id: "n-empty", content: "" };
  const task = convertNoteToTask(emptyNote);
  assert.strictEqual(task.title, "Untitled Task");
  assert.strictEqual(task.body, "");
});

test("taskConverter - Tier 2: Defensive handling on malformed note inputs", () => {
  assert.throws(() => convertNoteToTask(null), TypeError);
  assert.throws(() => convertNoteToTask("string-instead-of-object"), TypeError);
});

// ==========================================
// TIER 3: Cross-Feature Interactions
// ==========================================

test("taskConverter - Tier 3: Completing converted task does not mutate note state", () => {
  const note = { id: "n1", content: "Task item", isArchived: false, isPinned: false };
  const task = convertNoteToTask(note);

  task.completed = true;

  assert.strictEqual(note.isArchived, false);
  assert.strictEqual(note.isPinned, false);
});

test("taskConverter - Tier 3: Polymorphic task list accepts mixed string[] and object tasks", () => {
  const mixedTasks = [
    "Legacy string task 1",
    { id: "t2", title: "Converted Note Task", noteId: "n1" },
    "Legacy string task 2",
  ];

  const normalizedList = mixedTasks.map((t, idx) => normalizeTask(t, idx));
  assert.strictEqual(normalizedList.length, 3);
  assert.strictEqual(normalizedList[0].title, "Legacy string task 1");
  assert.strictEqual(normalizedList[1].title, "Converted Note Task");
  assert.strictEqual(normalizedList[1].noteId, "n1");
  assert.strictEqual(normalizedList[2].title, "Legacy string task 2");
});
