"use strict";

const path = require("path");
const { NotesStorage } = require("./notesStorage");
const { DraftRecovery } = require("./draftRecovery");
const { TagEngine } = require("./tagEngine");
const { NotesSearchEngine } = require("./notesSearch");
const { createContextAdapter } = require("./contextAdapter");
const { convertNoteToTask, normalizeTask, extractTaskTitle } = require("./taskConverter");
const { NOTE_FILTER_TYPES, CAPTURE_ERROR_CODES, GUARD_LIMITS } = require("./types");

/**
 * Creates the unified Quick Notes & Contextual Capture Engine facade.
 * Coordinates persistence, draft recovery, tag indexing, search, contextual capture, and task conversion.
 * @param {Object} [options]
 * @returns {Object} NotesEngine instance
 */
function createNotesEngine(options = {}) {
  const userDataPath = options.userDataPath || "";
  const notesPath = options.notesPath || (userDataPath ? path.join(userDataPath, "notes.json") : "notes.json");
  const draftPath = options.draftPath || (userDataPath ? path.join(userDataPath, "draft-recovery.json") : "draft-recovery.json");

  const storage = options.storage || new NotesStorage({ notesPath, userDataPath });
  const draftRecovery = options.draftRecovery || new DraftRecovery({
    draftPath,
    debounceMs: typeof options.debounceMs === "number" ? options.debounceMs : GUARD_LIMITS.AUTOSAVE_DEBOUNCE_MS,
  });
  const tagEngine = options.tagEngine || new TagEngine();
  const searchEngine = options.searchEngine || new NotesSearchEngine();

  const contextAdapter =
    options.contextAdapter ||
    createContextAdapter({
      userDataPath,
      clipboard: options.clipboard,
      execFile: options.execFile,
      ownPid: options.ownPid,
      mockForeground: options.mockForeground,
      mockClipboard: options.mockClipboard,
    });

  return {
    storage,
    draftRecovery,
    tagEngine,
    searchEngine,
    contextAdapter,

    // Storage CRUD
    getNotes(filter = NOTE_FILTER_TYPES.ALL, opts = {}) {
      return storage.getNotes(filter, opts);
    },

    getNoteById(id) {
      return storage.getNoteById(id);
    },

    saveNote(noteData) {
      const saved = storage.saveNote(noteData);
      draftRecovery.clearDraft();
      return saved;
    },

    deleteNote(id) {
      return storage.deleteNote(id);
    },

    undoDelete() {
      return storage.undoDelete();
    },

    togglePin(id) {
      return storage.togglePin(id);
    },

    toggleArchive(id) {
      return storage.toggleArchive(id);
    },

    // Draft Recovery
    saveDraft(draft) {
      return draftRecovery.saveDraft(draft);
    },

    getDraft() {
      return draftRecovery.getDraft();
    },

    clearDraft() {
      return draftRecovery.clearDraft();
    },

    flushDraft() {
      return draftRecovery.flushDraft();
    },

    // Search and Tags
    searchNotes(query, opts = {}) {
      const notes = storage.getNotes(NOTE_FILTER_TYPES.ALL);
      return searchEngine.search(notes, query, opts);
    },

    getTags() {
      const notes = storage.getNotes(NOTE_FILTER_TYPES.ALL);
      return tagEngine.getAllTags(notes);
    },

    // Contextual Capture
    async getContextualCapture(captureOptions = {}) {
      return await contextAdapter.getContextualCapture(captureOptions);
    },

    // Task Conversion
    convertToTask(noteOrId) {
      const note = typeof noteOrId === "string" ? storage.getNoteById(noteOrId) : noteOrId;
      if (!note) {
        throw new Error("Note not found for task conversion");
      }
      return convertNoteToTask(note);
    },

    normalizeTask(task, fallbackIndex) {
      return normalizeTask(task, fallbackIndex);
    },

    extractTaskTitle(content, fallbackTitle, maxLen) {
      return extractTaskTitle(content, fallbackTitle, maxLen);
    },

    destroy() {
      draftRecovery.destroy();
    },
  };
}

module.exports = {
  createNotesEngine,
  NOTE_FILTER_TYPES,
  CAPTURE_ERROR_CODES,
  GUARD_LIMITS,
};
