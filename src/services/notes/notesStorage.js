"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { extractTags, normalizeTag } = require("./tagEngine");
const { filterInbox } = require("./notesSearch");
const { NOTE_FILTER_TYPES } = require("./types");

/**
 * Extracts a human-readable title from note content, stripping markdown markers.
 * @param {string} content
 * @param {number} [maxLen=80]
 * @returns {string}
 */
function extractTitleFromContent(content, maxLen = 80) {
  if (!content || typeof content !== "string") return "Untitled Note";

  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return "Untitled Note";

  let firstLine = lines[0];

  // Strip leading block markdown markers
  let cleaned = firstLine
    .replace(/^(\s*#{1,6}\s+)/, "")
    .replace(/^(\s*[-*+]\s+\[[ xX]\]\s+)/, "")
    .replace(/^(\s*\[[ xX]\]\s+)/, "")
    .replace(/^(\s*[-*+]\s+)/, "")
    .replace(/^(\s*\d+[\.\)]\s+)/, "")
    .replace(/^(\s*>\s*)/, "")
    .trim();

  // Strip inline formatting wrappers (**bold**, *italic*, `code`, _underline_)
  cleaned = cleaned.replace(/[*_`~]+/g, "").trim();

  if (!cleaned) return "Untitled Note";

  if (cleaned.length > maxLen) {
    return cleaned.slice(0, maxLen - 1) + "…";
  }

  return cleaned;
}

/**
 * Validates and normalizes a Note entity.
 * @param {Object} rawNote
 * @returns {Object} Normalized Note entity
 */
function validateNote(rawNote) {
  if (!rawNote || typeof rawNote !== "object") {
    throw new TypeError("Note must be a non-null object");
  }

  const id = typeof rawNote.id === "string" && rawNote.id.trim().length > 0
    ? rawNote.id.trim()
    : crypto.randomUUID();

  const content = typeof rawNote.content === "string"
    ? rawNote.content
    : (rawNote.content !== null && rawNote.content !== undefined ? String(rawNote.content) : "");

  let title = typeof rawNote.title === "string" && rawNote.title.trim().length > 0
    ? rawNote.title.trim().slice(0, 200)
    : extractTitleFromContent(content);

  // Extract tags from content and merge with explicit tags
  const contentTags = extractTags(content);
  const explicitTags = Array.isArray(rawNote.tags)
    ? rawNote.tags.map(normalizeTag).filter(Boolean)
    : [];

  const mergedTags = Array.from(new Set([...contentTags, ...explicitTags])).sort();

  const isPinned = Boolean(rawNote.isPinned);
  const isArchived = Boolean(rawNote.isArchived);

  const sourceMetadata = rawNote.sourceMetadata && typeof rawNote.sourceMetadata === "object"
    ? {
        appName: rawNote.sourceMetadata.appName || null,
        windowTitle: rawNote.sourceMetadata.windowTitle || null,
        url: rawNote.sourceMetadata.url || null,
        processName: rawNote.sourceMetadata.processName || null,
        pid: rawNote.sourceMetadata.pid || 0,
        timestamp: rawNote.sourceMetadata.timestamp || new Date().toISOString(),
      }
    : null;

  const now = new Date().toISOString();
  const createdAt = rawNote.createdAt && !isNaN(Date.parse(rawNote.createdAt))
    ? new Date(rawNote.createdAt).toISOString()
    : now;

  const updatedAt = rawNote.updatedAt && !isNaN(Date.parse(rawNote.updatedAt)) && rawNote.id
    ? new Date(rawNote.updatedAt).toISOString()
    : now;

  return {
    id,
    title,
    content,
    tags: mergedTags,
    isPinned,
    isArchived,
    sourceMetadata,
    createdAt,
    updatedAt,
  };
}

/**
 * Performs atomic JSON file persistence with Windows retry backoff and backup rotation.
 * @param {string} filePath
 * @param {*} data
 * @param {Object} [options]
 */
function atomicWriteJsonSync(filePath, data, options = {}) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Backup rotation
  const backupPath = `${filePath}.bak`;
  if (fs.existsSync(filePath) && options.createBackup !== false) {
    try {
      fs.copyFileSync(filePath, backupPath);
    } catch (_) {}
  }

  // Temporary file on same volume
  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
  const jsonContent = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmpPath, jsonContent, "utf8");

  const maxRetries = options.maxRetries || 5;
  const retryDelayMs = options.retryDelayMs || 25;
  let retries = maxRetries;

  while (retries > 0) {
    try {
      fs.renameSync(tmpPath, filePath);
      if (!fs.existsSync(backupPath) && options.createBackup !== false) {
        try {
          fs.copyFileSync(filePath, backupPath);
        } catch (_) {}
      }
      return;
    } catch (err) {
      retries--;
      if (retries === 0) {
        try {
          fs.copyFileSync(tmpPath, filePath);
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          if (!fs.existsSync(backupPath) && options.createBackup !== false) {
            try {
              fs.copyFileSync(filePath, backupPath);
            } catch (_) {}
          }
          return;
        } catch (copyErr) {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          throw copyErr;
        }
      }
      const waitTill = Date.now() + retryDelayMs;
      while (Date.now() < waitTill) {}
    }
  }
}

/**
 * Safely reads notes from disk, recovering from .bak or quarantining corrupt stores.
 * @param {string} notesPath
 * @returns {Array<Object>}
 */
function safeReadNotes(notesPath) {
  const backupPath = `${notesPath}.bak`;

  if (!fs.existsSync(notesPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(notesPath, "utf8");
    if (!raw.trim()) throw new Error("Empty notes file");
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.notes) ? parsed.notes : null);
    if (!list) throw new Error("Invalid notes format");
    return list.map(validateNote);
  } catch (err) {
    // Primary file corrupted. Attempt recovery from backup
    if (fs.existsSync(backupPath)) {
      try {
        const bakRaw = fs.readFileSync(backupPath, "utf8");
        const bakParsed = JSON.parse(bakRaw);
        const bakList = Array.isArray(bakParsed) ? bakParsed : (bakParsed && Array.isArray(bakParsed.notes) ? bakParsed.notes : null);
        if (bakList) {
          const recovered = bakList.map(validateNote);
          atomicWriteJsonSync(notesPath, recovered, { createBackup: false });
          return recovered;
        }
      } catch (_) {}
    }

    // Both primary and backup corrupted: quarantine and initialize empty store
    try {
      const corruptPath = `${notesPath}.corrupt.${Date.now()}`;
      fs.renameSync(notesPath, corruptPath);
    } catch (_) {}

    const emptyStore = [];
    atomicWriteJsonSync(notesPath, emptyStore, { createBackup: false });
    return emptyStore;
  }
}

class NotesStorage {
  constructor(options = {}) {
    this.notesPath = options.notesPath || "notes.json";
    this.userDataPath = options.userDataPath || path.dirname(this.notesPath);
    this._notes = null;
    this._lastDeletedNote = null;
  }

  _load() {
    if (this._notes === null) {
      this._notes = safeReadNotes(this.notesPath);
    }
    return this._notes;
  }

  _persist() {
    atomicWriteJsonSync(this.notesPath, this._notes || []);
  }

  /**
   * Retrieves notes with filtering by view, search, and tags.
   * @param {'all'|'recent'|'pinned'|'archived'} [filter='all']
   * @param {Object} [options]
   * @returns {Array<Object>}
   */
  getNotes(filter = NOTE_FILTER_TYPES.ALL, options = {}) {
    this._load();
    const opts = {
      view: filter,
      ...options,
    };
    return filterInbox(this._notes, opts);
  }

  /**
   * Retrieves a single note by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  getNoteById(id) {
    this._load();
    if (!id) return null;
    const note = this._notes.find((n) => n.id === id);
    return note || null;
  }

  /**
   * Creates or updates a Note entity.
   * @param {Object} noteData
   * @returns {Object} Saved Note entity
   */
  saveNote(noteData) {
    this._load();
    const validated = validateNote(noteData);

    const existingIndex = this._notes.findIndex((n) => n.id === validated.id);
    if (existingIndex >= 0) {
      const existing = this._notes[existingIndex];
      const updated = {
        ...existing,
        ...validated,
        createdAt: existing.createdAt, // Preserve original creation timestamp
        updatedAt: new Date().toISOString(),
      };
      this._notes[existingIndex] = updated;
      this._persist();
      return updated;
    }

    this._notes.unshift(validated);
    this._persist();
    return validated;
  }

  /**
   * Deletes a note by ID and retains it in undo buffer.
   * @param {string} id
   * @returns {{ success: boolean, deletedId?: string, error?: string }}
   */
  deleteNote(id) {
    this._load();
    const index = this._notes.findIndex((n) => n.id === id);
    if (index === -1) {
      return { success: false, error: "Note not found" };
    }

    const [deleted] = this._notes.splice(index, 1);
    this._lastDeletedNote = deleted;
    this._persist();
    return { success: true, deletedId: id };
  }

  /**
   * Restores the most recently deleted note from memory undo buffer.
   * @returns {{ success: boolean, note: Object|null }}
   */
  undoDelete() {
    this._load();
    if (!this._lastDeletedNote) {
      return { success: false, note: null };
    }

    const restored = this._lastDeletedNote;
    this._notes.unshift(restored);
    this._lastDeletedNote = null;
    this._persist();
    return { success: true, note: restored };
  }

  /**
   * Toggles the pinned status of a note.
   * @param {string} id
   * @returns {{ success: boolean, isPinned: boolean, note?: Object }}
   */
  togglePin(id) {
    this._load();
    const note = this._notes.find((n) => n.id === id);
    if (!note) {
      return { success: false, isPinned: false };
    }

    note.isPinned = !note.isPinned;
    note.updatedAt = new Date().toISOString();
    this._persist();
    return { success: true, isPinned: note.isPinned, note };
  }

  /**
   * Toggles the archived status of a note.
   * @param {string} id
   * @returns {{ success: boolean, isArchived: boolean, note?: Object }}
   */
  toggleArchive(id) {
    this._load();
    const note = this._notes.find((n) => n.id === id);
    if (!note) {
      return { success: false, isArchived: false };
    }

    note.isArchived = !note.isArchived;
    note.updatedAt = new Date().toISOString();
    this._persist();
    return { success: true, isArchived: note.isArchived, note };
  }
}

module.exports = {
  extractTitleFromContent,
  validateNote,
  atomicWriteJsonSync,
  safeReadNotes,
  NotesStorage,
};
