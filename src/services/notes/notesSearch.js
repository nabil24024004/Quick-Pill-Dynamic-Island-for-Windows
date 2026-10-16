"use strict";

/**
 * Full-Text Search Engine for Quick Pill Notes.
 * Real-time hierarchical scoring across title, content, and tags with snippet match hints.
 */

const { normalizeTag } = require("./tagEngine");

const DEFAULT_NOTE_SEARCH_OPTIONS = Object.freeze({
  limit: 25,
  minScore: 40,
  halfLifeDays: 7,
  maxRecencyBoost: 100,
  pinnedBoost: 60,
  snippetMaxLength: 140,
});

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds all start and end character offsets of tokens within a text string.
 * Merges overlapping intervals and returns sorted result.
 * @param {string} text
 * @param {string[]} tokens
 * @returns {Array<{ start: number, end: number }>} Sorted, non-overlapping intervals
 */
function findHighlights(text, tokens) {
  if (!text || !tokens || tokens.length === 0) return [];
  const rawHighlights = [];

  for (const token of tokens) {
    if (!token) continue;
    const regex = new RegExp(escapeRegex(token), "gi");
    let match;
    while ((match = regex.exec(text)) !== null) {
      rawHighlights.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  if (rawHighlights.length === 0) return [];
  rawHighlights.sort((a, b) => a.start - b.start);

  const merged = [rawHighlights[0]];
  for (let i = 1; i < rawHighlights.length; i++) {
    const current = rawHighlights[i];
    const prev = merged[merged.length - 1];
    if (current.start <= prev.end) {
      prev.end = Math.max(prev.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Extracts a contextual snippet from note content around the best matching token.
 * Expands to word boundaries and calculates highlight offsets relative to the snippet string.
 * @param {string} content
 * @param {string[]} tokens
 * @param {number} [maxLen=140]
 * @returns {{ snippet: string, highlights: Array<{ start: number, end: number }> }}
 */
function extractSnippet(content, tokens, maxLen = 140) {
  if (!content) return { snippet: "", highlights: [] };
  const cleanContent = content.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();

  if (!tokens || tokens.length === 0) {
    const raw = cleanContent.slice(0, maxLen).trim();
    return {
      snippet: raw.length < cleanContent.length ? raw + "..." : raw,
      highlights: [],
    };
  }

  // Find first occurrence of any token
  let earliestMatch = -1;
  let matchLen = 0;
  for (const token of tokens) {
    const regex = new RegExp(escapeRegex(token), "i");
    const m = regex.exec(cleanContent);
    if (m && (earliestMatch === -1 || m.index < earliestMatch)) {
      earliestMatch = m.index;
      matchLen = m[0].length;
    }
  }

  if (earliestMatch === -1) {
    const raw = cleanContent.slice(0, maxLen).trim();
    return {
      snippet: raw.length < cleanContent.length ? raw + "..." : raw,
      highlights: [],
    };
  }

  const half = Math.floor(maxLen / 2);
  let start = Math.max(0, earliestMatch - half);
  let end = Math.min(cleanContent.length, start + maxLen);

  if (end - start < maxLen && start > 0) {
    start = Math.max(0, end - maxLen);
  }

  // Expand to word boundaries if possible
  if (start > 0) {
    const spaceIdx = cleanContent.indexOf(" ", start);
    if (spaceIdx !== -1 && spaceIdx < earliestMatch) {
      start = spaceIdx + 1;
    }
  }
  if (end < cleanContent.length) {
    const spaceIdx = cleanContent.lastIndexOf(" ", end);
    if (spaceIdx !== -1 && spaceIdx > earliestMatch + matchLen) {
      end = spaceIdx;
    }
  }

  let snippet = cleanContent.slice(start, end).trim();
  const prefix = start > 0 ? "... " : "";
  const suffix = end < cleanContent.length ? " ..." : "";
  snippet = prefix + snippet + suffix;

  const highlights = findHighlights(snippet, tokens);
  return { snippet, highlights };
}

/**
 * Evaluates match score for a single note against a search query.
 * @param {Object} note
 * @param {string} query
 * @param {Object} [options]
 * @returns {{ score: number, matchedFields: string[], titleHighlights: Array, matchedTags: string[] }}
 */
function scoreNote(note, query, options = {}) {
  const opts = { ...DEFAULT_NOTE_SEARCH_OPTIONS, ...options };
  if (!note || !query || typeof query !== "string") {
    return { score: 0, matchedFields: [], titleHighlights: [], matchedTags: [] };
  }

  const rawTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) {
    return { score: 0, matchedFields: [], titleHighlights: [], matchedTags: [] };
  }

  const tagTokens = rawTokens
    .filter((t) => t.startsWith("#"))
    .map((t) => normalizeTag(t.slice(1)))
    .filter(Boolean);
  const textTokens = rawTokens
    .filter((t) => !t.startsWith("#"))
    .map((t) => t.trim())
    .filter(Boolean);
  const allTokens = [...tagTokens, ...textTokens];

  const title = (note.title || "").trim();
  const titleLower = title.toLowerCase();
  const content = (note.content || "").trim();
  const contentLower = content.toLowerCase();
  const noteTags = Array.isArray(note.tags) ? note.tags.map(normalizeTag) : [];

  let score = 0;
  const matchedFields = new Set();
  const matchedTags = new Set();
  let tokensMatchedCount = 0;

  const fullQueryLower = query.toLowerCase().trim();

  // Full query exact/prefix checks
  if (titleLower === fullQueryLower) {
    score += 1000;
    matchedFields.add("title");
  } else if (titleLower.startsWith(fullQueryLower)) {
    score += 600;
    matchedFields.add("title");
  } else if (fullQueryLower.length > 3 && contentLower.includes(fullQueryLower)) {
    score += 300;
    matchedFields.add("content");
  }

  // Token-by-token evaluation
  for (const token of allTokens) {
    let tokenMatched = false;

    // 1. Tag matching
    if (noteTags.includes(token)) {
      score += 500;
      matchedFields.add("tags");
      matchedTags.add(token);
      tokenMatched = true;
    } else if (noteTags.some((t) => t.startsWith(token))) {
      score += 300;
      matchedFields.add("tags");
      noteTags.filter((t) => t.startsWith(token)).forEach((t) => matchedTags.add(t));
      tokenMatched = true;
    } else if (noteTags.some((t) => t.includes(token))) {
      score += 150;
      matchedFields.add("tags");
      noteTags.filter((t) => t.includes(token)).forEach((t) => matchedTags.add(t));
      tokenMatched = true;
    }

    // 2. Title matching
    if (titleLower.startsWith(token)) {
      score += 400;
      matchedFields.add("title");
      tokenMatched = true;
    } else {
      const words = titleLower.split(/[\s_-]+/);
      if (words.some((w) => w.startsWith(token))) {
        score += 300;
        matchedFields.add("title");
        tokenMatched = true;
      } else if (titleLower.includes(token)) {
        score += 150;
        matchedFields.add("title");
        tokenMatched = true;
      }
    }

    // 3. Content matching
    if (contentLower.includes(token)) {
      matchedFields.add("content");
      tokenMatched = true;
      let count = 0;
      let pos = 0;
      while ((pos = contentLower.indexOf(token, pos)) !== -1 && count < 5) {
        count++;
        pos += token.length;
      }
      score += count * 60;
    }

    if (tokenMatched) {
      tokensMatchedCount++;
    }
  }

  // Must match at least one token
  if (tokensMatchedCount === 0 && score === 0) {
    return { score: 0, matchedFields: [], titleHighlights: [], matchedTags: [] };
  }

  // Multi-token conjunction boost
  if (allTokens.length > 1 && tokensMatchedCount === allTokens.length) {
    score += 400;
  }

  // Pinned note boost
  if (note.isPinned) {
    score += opts.pinnedBoost;
  }

  // Recency exponential decay boost
  if (note.updatedAt) {
    const ageDays = (Date.now() - new Date(note.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (!isNaN(ageDays) && ageDays >= 0) {
      const recencyBoost = Math.round(
        opts.maxRecencyBoost * Math.pow(0.5, ageDays / opts.halfLifeDays)
      );
      score += recencyBoost;
    }
  }

  const titleHighlights = findHighlights(title, allTokens);

  return {
    score,
    matchedFields: Array.from(matchedFields),
    titleHighlights,
    matchedTags: Array.from(matchedTags),
  };
}

/**
 * Searches a collection of notes, scoring and ranking matches with snippet highlights.
 * @param {Array<Object>} notes
 * @param {string} query
 * @param {Object} [options]
 * @returns {Array<{ note: Object, score: number, matchHint: Object }>}
 */
function searchNotes(notes = [], query = "", options = {}) {
  const opts = { ...DEFAULT_NOTE_SEARCH_OPTIONS, ...options };
  if (!Array.isArray(notes) || notes.length === 0) return [];
  if (!query || typeof query !== "string" || !query.trim()) return [];

  const rawTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const searchTokens = rawTokens.map((t) => (t.startsWith("#") ? t.slice(1) : t)).filter(Boolean);

  const results = [];

  for (const note of notes) {
    const { score, matchedFields, titleHighlights, matchedTags } = scoreNote(note, query, opts);
    if (score >= opts.minScore) {
      const { snippet, highlights } = extractSnippet(note.content, searchTokens, opts.snippetMaxLength);
      results.push({
        note,
        score,
        matchHint: {
          matchedFields,
          titleHighlights,
          matchedTags,
          bodySnippet: snippet,
          snippetHighlights: highlights,
        },
      });
    }
  }

  // Sort descending by score, tie-break by updatedAt desc
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = new Date(a.note.updatedAt || a.note.createdAt || 0).getTime();
    const timeB = new Date(b.note.updatedAt || b.note.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return results.slice(0, opts.limit);
}

/**
 * Composite inbox filtering function supporting view, search, and tags.
 * @param {Array<Object>} notes
 * @param {Object} [options]
 * @returns {Array<Object>}
 */
function filterInbox(notes = [], options = {}) {
  const {
    view = "all",
    query = "",
    tag = "",
    tags = [],
    tagMode = "AND",
    sortBy = "updatedAt",
    sortOrder = "desc",
    limit = 50,
  } = options;

  let candidates = Array.isArray(notes) ? [...notes] : [];

  // 1. Base View Filter
  switch (view) {
    case "archived":
      candidates = candidates.filter((n) => Boolean(n.isArchived));
      break;
    case "pinned":
      candidates = candidates.filter((n) => !n.isArchived && Boolean(n.isPinned));
      break;
    case "recent":
    case "all":
    default:
      candidates = candidates.filter((n) => !n.isArchived);
      break;
  }

  // 2. Tag Filter (support single tag or array of tags)
  const allTagFilters = [
    ...(Array.isArray(tags) ? tags : []),
    ...(tag ? [tag] : []),
  ];

  if (allTagFilters.length > 0) {
    const normTags = allTagFilters.map(normalizeTag).filter(Boolean);
    if (normTags.length > 0) {
      candidates = candidates.filter((note) => {
        const noteTags = Array.isArray(note.tags) ? note.tags.map(normalizeTag) : [];
        if (tagMode === "OR") {
          return normTags.some((t) => noteTags.includes(t));
        }
        return normTags.every((t) => noteTags.includes(t));
      });
    }
  }

  // 3. Search Filter
  if (query && typeof query === "string" && query.trim()) {
    const searchResults = searchNotes(candidates, query, options);
    return searchResults.map((r) => ({
      ...r.note,
      _searchScore: r.score,
      _matchHint: r.matchHint,
    })).slice(0, limit);
  }

  // 4. Default Sort
  candidates.sort((a, b) => {
    if (view === "all") {
      const aPin = Boolean(a.isPinned);
      const bPin = Boolean(b.isPinned);
      if (aPin !== bPin) return bPin ? 1 : -1;
    }
    const timeA = new Date(a[sortBy] || a.createdAt || 0).getTime();
    const timeB = new Date(b[sortBy] || b.createdAt || 0).getTime();
    return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
  });

  return candidates.slice(0, limit);
}

class NotesSearchEngine {
  constructor(options = {}) {
    this.options = { ...DEFAULT_NOTE_SEARCH_OPTIONS, ...options };
  }

  search(notes, query, options = {}) {
    return searchNotes(notes, query, { ...this.options, ...options });
  }

  filterInbox(notes, options = {}) {
    return filterInbox(notes, { ...this.options, ...options });
  }
}

module.exports = {
  DEFAULT_NOTE_SEARCH_OPTIONS,
  escapeRegex,
  findHighlights,
  extractSnippet,
  scoreNote,
  searchNotes,
  filterInbox,
  NotesSearchEngine,
};
