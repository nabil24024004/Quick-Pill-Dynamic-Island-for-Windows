"use strict";

/**
 * Filter and view types for Quick Pill Notes.
 */
const NOTE_FILTER_TYPES = Object.freeze({
  ALL: "all",
  RECENT: "recent",
  PINNED: "pinned",
  ARCHIVED: "archived",
});

/**
 * Structured error and status codes for contextual capture operations.
 */
const CAPTURE_ERROR_CODES = Object.freeze({
  SUCCESS: "SUCCESS",
  SELECTION_UNAVAILABLE_UIPI: "SELECTION_UNAVAILABLE_UIPI",
  EMPTY_OR_NON_TEXT: "EMPTY_OR_NON_TEXT",
  CLIPBOARD_ACCESS_ERROR: "CLIPBOARD_ACCESS_ERROR",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  EMPTY_CONTENT: "EMPTY_CONTENT",
  INVALID_NOTE: "INVALID_NOTE",
});

/**
 * Guard limits for large-content detection, title lengths, and payload ceilings.
 */
const GUARD_LIMITS = Object.freeze({
  CHAR_THRESHOLD: 300,
  BYTE_THRESHOLD: 1024,
  MAX_ALLOWED_BYTES: 5 * 1024 * 1024, // 5 MB hard safety ceiling
  MAX_TITLE_CHARS: 60,
  MAX_STORED_TITLE_CHARS: 200,
  PREVIEW_CHARS: 300,
  AUTOSAVE_DEBOUNCE_MS: 400,
});

module.exports = {
  NOTE_FILTER_TYPES,
  CAPTURE_ERROR_CODES,
  GUARD_LIMITS,
};
