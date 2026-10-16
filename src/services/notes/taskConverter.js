"use strict";

/**
 * Note-to-Task Conversion Helper & Task Manager Backward Compatibility.
 * Extracts clean first-line titles (<=60 chars), associates note body & ID,
 * and normalizes polymorphic legacy string[] tasks and structured task objects.
 */

const crypto = require("crypto");

/**
 * Extracts a task title from note content or fallback title.
 * Strips markdown headings, bullets, numbered lists, checkboxes, and blockquotes.
 * Truncates cleanly to maxLen (60 chars) at word boundaries.
 * @param {string} content
 * @param {string} [fallbackTitle='']
 * @param {number} [maxLen=60]
 * @returns {string}
 */
function extractTaskTitle(content, fallbackTitle = "", maxLen = 60) {
  const cleanContent = typeof content === "string" ? content.trim() : "";
  const cleanFallback = typeof fallbackTitle === "string" ? fallbackTitle.trim() : "";
  const source = cleanContent || cleanFallback;
  if (!source) return "Untitled Task";

  const lines = source.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  if (!firstLine) return cleanFallback || "Untitled Task";

  // Strip leading markdown formatting syntax iteratively (headings, bullets, checkboxes, blockquotes):
  let clean = firstLine.trim();
  let prev;
  do {
    prev = clean;
    clean = clean
      .replace(/^>\s*/, "")           // Blockquotes (> )
      .replace(/^[-*+]\s+/, "")       // Unordered list bullets (- , * )
      .replace(/^\d+[\.\)]\s+/, "")   // Numbered lists (1. , 1) )
      .replace(/^\[[ xX]\]\s*/, "")   // Checkbox tasks ([ ] , [x] )
      .replace(/^#{1,6}\s*/, "")      // Markdown headings (# , ## )
      .trim();
  } while (clean !== prev && clean.length > 0);

  // Strip formatting asterisks, underscores, backticks, tildes
  clean = clean.replace(/[*_`~]+/g, "").trim();
  if (!clean) clean = firstLine.trim();
  if (!clean) return "Untitled Task";

  if (clean.length <= maxLen) return clean;

  // Clean word-boundary truncation
  const targetLen = maxLen - 3;
  let truncated = clean.slice(0, targetLen);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > targetLen * 0.6) {
    truncated = truncated.slice(0, lastSpace);
  }
  return truncated.trim() + "...";
}

/**
 * Converts a Note entity into a structured Task entity.
 * DOES NOT mutate, archive, or delete the source note.
 * @param {Object} note
 * @param {Object} [options]
 * @param {Function} [options.generateId]
 * @returns {Object} Structured Task entity
 */
function convertNoteToTask(note, options = {}) {
  if (!note || typeof note !== "object") {
    throw new TypeError("Invalid note entity provided for task conversion");
  }

  const title = extractTaskTitle(note.content, note.title, 60);
  const now = new Date().toISOString();

  const idGen = options.generateId || (() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  });

  const task = {
    id: idGen(),
    title,
    body: typeof note.content === "string" ? note.content : "",
    noteId: note.id ? String(note.id) : null,
    completed: false,
    createdAt: now,
    updatedAt: now,
    source: "quick_notes",
  };

  return task;
}

/**
 * Normalizes a polymorphic task (legacy string OR structured object) into a standard Task entity.
 * Guarantees that React 19 never crashes on {task} or task.id.
 * @param {string|Object} task
 * @param {number} [fallbackIndex=0]
 * @returns {Object}
 */
function normalizeTask(task, fallbackIndex = 0) {
  if (typeof task === "string") {
    return {
      id: `legacy_${fallbackIndex}`,
      title: task,
      body: "",
      noteId: null,
      completed: false,
      createdAt: null,
      updatedAt: null,
      source: "legacy",
      isLegacy: true,
    };
  }

  if (task && typeof task === "object") {
    return {
      id: task.id || `task_${fallbackIndex}_${Date.now()}`,
      title: String(task.title || "Untitled Task"),
      body: String(task.body || ""),
      noteId: task.noteId ? String(task.noteId) : null,
      completed: Boolean(task.completed),
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString(),
      source: task.source || (task.noteId ? "quick_notes" : "manual"),
      isLegacy: false,
    };
  }

  return {
    id: `invalid_${fallbackIndex}`,
    title: "Untitled Task",
    body: "",
    noteId: null,
    completed: false,
    createdAt: null,
    updatedAt: null,
    source: "unknown",
    isLegacy: true,
  };
}

module.exports = {
  extractTaskTitle,
  convertNoteToTask,
  normalizeTask,
};
