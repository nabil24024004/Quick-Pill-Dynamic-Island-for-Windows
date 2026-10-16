"use strict";

/**
 * Tag Extraction, Normalization, and Indexing Engine for Quick Pill Notes.
 * Robust tokenization ignoring markdown headings, code blocks, URLs, issue numbers, and hex colors.
 */

const CODE_BLOCK_REGEX = /```[\s\S]*?```|`[^`]*`/g;
const URL_REGEX = /https?:\/\/[^\s]+/g;
const HASHTAG_REGEX = /(?:^|[\s(\[{<'"])#([\p{L}\p{N}_-]*[\p{L}_][\p{L}\p{N}_-]*)/gu;
const HEX_COLOR_REGEX = /^(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Normalizes a raw tag string into canonical lowercase format.
 * Strips leading/trailing hyphens, underscores, and '#' symbols.
 * @param {string} rawTag
 * @returns {string}
 */
function normalizeTag(rawTag) {
  if (!rawTag || typeof rawTag !== "string") return "";
  let clean = rawTag.trim();
  if (clean.startsWith("#")) clean = clean.slice(1);
  clean = clean.replace(/^[-_]+|[-_]+$/g, "").toLowerCase();
  if (clean.length > 50) clean = clean.slice(0, 50).replace(/[-_]+$/, "");
  return clean;
}

const COMMON_HEX_WORDS = new Set(["ace", "act", "bad", "bed", "bee", "cab", "cad", "dad", "fad", "fed", "fee", "facade", "decade", "defaced"]);

/**
 * Determines whether a normalized token is a hex color code (e.g. ff9500, 34c759, ffffff, fff).
 * Distinguishes hex colors from standard short dictionary words (like 'bed' or 'cab').
 * @param {string} token
 * @returns {boolean}
 */
function isHexColor(token) {
  if (!HEX_COLOR_REGEX.test(token)) return false;
  const lower = token.toLowerCase();
  if (COMMON_HEX_WORDS.has(lower)) return false;
  // If it contains a digit or matches hex code pattern not in common words dictionary
  return true;
}

/**
 * Extracts unique, normalized hashtags from note text or markdown.
 * Discards code blocks, URLs, markdown headings, pure numbers, and hex colors.
 * @param {string} text
 * @returns {string[]} Alphabetically sorted array of unique normalized tags
 */
function extractTags(text) {
  if (!text || typeof text !== "string") return [];

  // Strip inline code, fenced code blocks, and URLs to eliminate false matches
  const sanitized = text
    .replace(CODE_BLOCK_REGEX, " ")
    .replace(URL_REGEX, " ");

  const tags = new Set();
  let match;
  HASHTAG_REGEX.lastIndex = 0;

  while ((match = HASHTAG_REGEX.exec(sanitized)) !== null) {
    const candidate = match[1].replace(/[-_]+$/, "");
    const normalized = normalizeTag(candidate);

    if (normalized.length >= 1 && !isHexColor(normalized)) {
      tags.add(normalized);
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

/**
 * Builds an indexed dictionary of tags across a notes collection with count metrics.
 * @param {Array<Object>} notes
 * @returns {{ tags: Record<string, Object>, allTags: string[] }}
 */
function buildTagIndex(notes = []) {
  const tagMap = new Map();

  for (const note of notes) {
    if (!note || !Array.isArray(note.tags)) continue;
    const isArchived = Boolean(note.isArchived);
    const noteId = note.id ? String(note.id) : null;

    for (const rawTag of note.tags) {
      const tag = normalizeTag(rawTag);
      if (!tag) continue;

      let entry = tagMap.get(tag);
      if (!entry) {
        entry = {
          tag,
          count: 0,
          archivedCount: 0,
          totalCount: 0,
          noteIds: [],
        };
        tagMap.set(tag, entry);
      }

      entry.totalCount++;
      if (isArchived) {
        entry.archivedCount++;
      } else {
        entry.count++;
      }

      if (noteId && !entry.noteIds.includes(noteId)) {
        entry.noteIds.push(noteId);
      }
    }
  }

  const tags = {};
  for (const [tag, entry] of tagMap.entries()) {
    tags[tag] = entry;
  }

  // Sort allTags by active count desc, total count desc, then alphabetically
  const allTags = Array.from(tagMap.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return a.tag.localeCompare(b.tag);
    })
    .map((e) => e.tag);

  return { tags, allTags };
}

/**
 * Returns formatted tags list suitable for API / UI responses.
 * @param {Array<Object>} notes
 * @returns {Array<{ tag: string, count: number, archivedCount: number, totalCount: number }>}
 */
function getAllTags(notes = []) {
  const { allTags, tags } = buildTagIndex(notes);
  return allTags.map((t) => tags[t]);
}

/**
 * Filters notes by one or more tags.
 * @param {Array<Object>} notes
 * @param {string[]} selectedTags
 * @param {Object} [options]
 * @param {'AND'|'OR'} [options.mode='AND']
 * @param {boolean} [options.includeArchived=false]
 * @returns {Array<Object>}
 */
function filterNotesByTags(notes = [], selectedTags = [], options = {}) {
  const { mode = "AND", includeArchived = false } = options;
  if (!Array.isArray(notes)) return [];
  if (!Array.isArray(selectedTags) || selectedTags.length === 0) {
    return includeArchived ? notes : notes.filter((n) => !n.isArchived);
  }

  const normalizedSelected = selectedTags
    .map((t) => normalizeTag(t))
    .filter(Boolean);

  if (normalizedSelected.length === 0) {
    return includeArchived ? notes : notes.filter((n) => !n.isArchived);
  }

  return notes.filter((note) => {
    if (!includeArchived && note.isArchived) return false;
    const noteTags = Array.isArray(note.tags)
      ? note.tags.map((t) => normalizeTag(t))
      : [];

    if (mode === "OR") {
      return normalizedSelected.some((st) => noteTags.includes(st));
    }
    // Default 'AND'
    return normalizedSelected.every((st) => noteTags.includes(st));
  });
}

/**
 * Returns tag autocomplete suggestions matching a given prefix.
 * @param {{ allTags: string[] }} tagIndex
 * @param {string} prefix
 * @param {number} [limit=10]
 * @returns {string[]}
 */
function getSuggestedTags(tagIndex, prefix = "", limit = 10) {
  if (!tagIndex || !Array.isArray(tagIndex.allTags)) return [];
  const normPrefix = normalizeTag(prefix);
  if (!normPrefix) return tagIndex.allTags.slice(0, limit);

  const prefixMatches = [];
  const containsMatches = [];

  for (const tag of tagIndex.allTags) {
    if (tag.startsWith(normPrefix)) {
      prefixMatches.push(tag);
    } else if (tag.includes(normPrefix)) {
      containsMatches.push(tag);
    }
    if (prefixMatches.length >= limit) break;
  }

  return [...prefixMatches, ...containsMatches].slice(0, limit);
}

class TagEngine {
  extract(text) {
    return extractTags(text);
  }
  normalize(tag) {
    return normalizeTag(tag);
  }
  buildIndex(notes) {
    return buildTagIndex(notes);
  }
  getAllTags(notes) {
    return getAllTags(notes);
  }
  filter(notes, tags, options) {
    return filterNotesByTags(notes, tags, options);
  }
  suggest(tagIndex, prefix, limit) {
    return getSuggestedTags(tagIndex, prefix, limit);
  }
}

module.exports = {
  extractTags,
  normalizeTag,
  isHexColor,
  buildTagIndex,
  getAllTags,
  filterNotesByTags,
  getSuggestedTags,
  TagEngine,
};
