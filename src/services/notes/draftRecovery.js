"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { GUARD_LIMITS } = require("./types");

/**
 * Normalizes a draft input into a valid NoteDraft schema.
 * @param {Object} input
 * @returns {Object}
 */
function normalizeDraft(input = {}) {
  const content = typeof input.content === "string" ? input.content : "";
  const title = typeof input.title === "string" ? input.title : "";
  const isDirty = Boolean(input.isDirty || content.trim().length > 0 || title.trim().length > 0);
  const now = new Date().toISOString();

  return {
    id: input.id || crypto.randomUUID(),
    noteId: input.noteId ? String(input.noteId) : null,
    title,
    content,
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    isDirty,
    sourceMetadata: input.sourceMetadata && typeof input.sourceMetadata === "object" ? input.sourceMetadata : null,
    createdAt: input.createdAt || now,
    lastModified: now,
  };
}

class DraftRecovery {
  constructor(options = {}) {
    this.draftPath = options.draftPath || "draft-recovery.json";
    this.debounceMs = typeof options.debounceMs === "number" ? options.debounceMs : GUARD_LIMITS.AUTOSAVE_DEBOUNCE_MS;
    this._pendingDraft = null;
    this._debounceTimer = null;
  }

  /**
   * Schedules a debounced atomic flush of the draft state.
   * @param {Object} draftInput
   * @returns {{ success: boolean }}
   */
  saveDraft(draftInput) {
    if (!draftInput || typeof draftInput !== "object") {
      return { success: false, error: "Draft must be an object" };
    }

    const merged = {
      ...(this._pendingDraft || {}),
      ...draftInput,
    };

    this._pendingDraft = normalizeDraft(merged);

    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      this.flushDraft();
    }, this.debounceMs);

    return { success: true };
  }

  /**
   * Synchronously or immediately flushes the pending draft to disk atomically.
   * @returns {{ success: boolean, written: boolean }}
   */
  flushDraft() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }

    if (!this._pendingDraft || !this._pendingDraft.isDirty) {
      return { success: true, written: false };
    }

    try {
      const dir = path.dirname(this.draftPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tmpPath = `${this.draftPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this._pendingDraft, null, 2), "utf8");

      try {
        fs.renameSync(tmpPath, this.draftPath);
      } catch (_) {
        fs.copyFileSync(tmpPath, this.draftPath);
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      }

      return { success: true, written: true };
    } catch (err) {
      return { success: false, written: false, error: err.message };
    }
  }

  /**
   * Retrieves the current dirty draft from memory or restores from disk.
   * @returns {Object|null}
   */
  getDraft() {
    if (this._pendingDraft && this._pendingDraft.isDirty) {
      return this._pendingDraft;
    }

    if (!fs.existsSync(this.draftPath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(this.draftPath, "utf8");
      if (!raw || !raw.trim()) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isDirty && (parsed.content || parsed.title)) {
        this._pendingDraft = parsed;
        return parsed;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Discards the active draft, canceling timers and unlinking disk file.
   * @returns {{ success: boolean }}
   */
  clearDraft() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }

    this._pendingDraft = null;

    try {
      if (fs.existsSync(this.draftPath)) {
        fs.unlinkSync(this.draftPath);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Cleans up timers and memory state.
   */
  destroy() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }
}

module.exports = {
  normalizeDraft,
  DraftRecovery,
};
