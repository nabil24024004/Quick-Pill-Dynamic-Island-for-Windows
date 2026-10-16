"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const {
  createContextAdapter,
  cleanTextContent,
  deriveAutoTitle,
  evaluateContentGuard,
} = require("../src/services/notes/contextAdapter");

const {
  extractTags,
  normalizeTag,
  isHexColor,
  buildTagIndex,
  getAllTags,
  filterNotesByTags,
  getSuggestedTags,
  TagEngine,
} = require("../src/services/notes/tagEngine");

const {
  escapeRegex,
  findHighlights,
  extractSnippet,
  scoreNote,
  searchNotes,
  filterInbox,
  NotesSearchEngine,
} = require("../src/services/notes/notesSearch");

const {
  extractTaskTitle,
  convertNoteToTask,
  normalizeTask,
} = require("../src/services/notes/taskConverter");

const {
  createNotesEngine,
} = require("../src/services/notes/index");

const {
  CAPTURE_ERROR_CODES,
  GUARD_LIMITS,
} = require("../src/services/notes/types");

// ===========================================================================
// SECTION 1: Large-Content Guard & Context Adapter Stress Testing
// ===========================================================================

test("Stress: Large-Content Guard - Massive 10MB payload triggers hard safety ceiling", () => {
  const tenMbString = "A".repeat(10 * 1024 * 1024);
  const guard = evaluateContentGuard(tenMbString);

  assert.strictEqual(guard.isAllowed, false, "10MB payload must NOT be allowed");
  assert.strictEqual(guard.isLarge, true, "10MB payload must be marked as large");
  assert.strictEqual(guard.requiresConfirmation, false, "Rejected payload does not need confirmation");
  assert.strictEqual(guard.code, CAPTURE_ERROR_CODES.PAYLOAD_TOO_LARGE);
  assert.strictEqual(guard.preview, "", "Rejected payload must have empty preview");
  assert.strictEqual(guard.rawText, "", "Rejected payload must clear rawText to avoid memory bloat");
  assert.strictEqual(guard.byteCount, 10 * 1024 * 1024);
  assert.strictEqual(guard.charCount, 10 * 1024 * 1024);
});

test("Stress: Large-Content Guard - 12MB payload handled without OOM or crash", async () => {
  const adapter = createContextAdapter();
  const twelveMb = "X".repeat(12 * 1024 * 1024);
  const res = await adapter.manualCapture(twelveMb);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, CAPTURE_ERROR_CODES.PAYLOAD_TOO_LARGE);
  assert.strictEqual(res.content, "");
  assert.ok(res.message.includes("5 MB"));
});

test("Stress: Large-Content Guard - 50,000+ characters payload generates truncated preview", () => {
  const sixtyThousandChars = "Word ".repeat(12000); // 60,000 characters
  const guard = evaluateContentGuard(sixtyThousandChars);

  assert.strictEqual(guard.isAllowed, true, "Allowed under 5MB");
  assert.strictEqual(guard.requiresConfirmation, true, "Requires confirmation for >300 chars");
  assert.strictEqual(guard.isLarge, true);
  assert.strictEqual(guard.isTruncated, true);
  assert.strictEqual(guard.charCount, sixtyThousandChars.length);
  assert.ok(guard.byteCount >= 60000);
  assert.ok(guard.preview.length <= 305, `Preview length (${guard.preview.length}) must be <= 305 chars`);
  assert.ok(guard.preview.endsWith("..."), "Truncated preview must end with ellipsis");
  assert.strictEqual(guard.rawText, sixtyThousandChars);
});

test("Stress: Large-Content Guard - 50,000 characters continuous string without spaces", () => {
  const noSpaceString = "Z".repeat(50000);
  const guard = evaluateContentGuard(noSpaceString);

  assert.strictEqual(guard.isAllowed, true);
  assert.strictEqual(guard.requiresConfirmation, true);
  assert.strictEqual(guard.isTruncated, true);
  assert.strictEqual(guard.preview.length, 303, "300 chars + '...'");
  assert.ok(guard.preview.endsWith("..."));
});

test("Stress: Clipboard Access - Non-text, empty, whitespace-only, and error states", async () => {
  // 1. Empty string
  const adapterEmpty = createContextAdapter({
    mockClipboard: () => ({ success: false, code: CAPTURE_ERROR_CODES.EMPTY_OR_NON_TEXT, text: "" }),
  });
  const resEmpty = await adapterEmpty.captureClipboard();
  assert.strictEqual(resEmpty.success, false);
  assert.strictEqual(resEmpty.code, CAPTURE_ERROR_CODES.EMPTY_OR_NON_TEXT);

  // 2. Real clipboard object returning whitespace
  const adapterWhitespace = createContextAdapter({
    clipboard: { readText: () => "   \t\r\n   " },
  });
  const resWhitespace = await adapterWhitespace.captureClipboard();
  assert.strictEqual(resWhitespace.success, false);
  assert.strictEqual(resWhitespace.code, CAPTURE_ERROR_CODES.EMPTY_OR_NON_TEXT);

  // 3. Clipboard throwing access locked exception
  const adapterLocked = createContextAdapter({
    clipboard: {
      readText: () => {
        throw new Error("Win32 OpenClipboard timeout: Access is denied");
      },
    },
  });
  const resLocked = await adapterLocked.captureClipboard();
  assert.strictEqual(resLocked.success, false);
  assert.strictEqual(resLocked.code, CAPTURE_ERROR_CODES.CLIPBOARD_ACCESS_ERROR);
  assert.ok(resLocked.message.includes("locked"));

  // 4. Missing clipboard object altogether
  const adapterNoClip = createContextAdapter({ clipboard: null });
  const resNoClip = await adapterNoClip.captureClipboard();
  assert.strictEqual(resNoClip.success, false);
  assert.strictEqual(resNoClip.code, CAPTURE_ERROR_CODES.CLIPBOARD_ACCESS_ERROR);
});

test("Stress: Sanitization - Null bytes, control chars, CRLF normalization, and boundary types", () => {
  const dirty = "Alpha\x00Beta\x01Gamma\x08Delta\x0B\x0CEpsilon\x0E\x1FZeta\r\nLine2   \r\n\r\n\r\n\r\nLine3";
  const cleaned = cleanTextContent(dirty);

  assert.strictEqual(cleaned, "AlphaBetaGammaDeltaEpsilonZeta\nLine2\n\nLine3");
  assert.ok(!cleaned.includes("\x00"), "Null bytes must be completely stripped");
  assert.ok(!cleaned.includes("\r"), "Carriage returns must be normalized to LF");
  assert.ok(!cleaned.includes("\n\n\n"), "Consecutive newlines > 2 must be collapsed");

  // Preserves tabs and single/double newlines
  const tabbed = "Column1\tColumn2\nRow1\tValue";
  assert.strictEqual(cleanTextContent(tabbed), "Column1\tColumn2\nRow1\tValue");

  // Boundary primitives
  assert.strictEqual(cleanTextContent(null), "");
  assert.strictEqual(cleanTextContent(undefined), "");
  assert.strictEqual(cleanTextContent(12345), "12345");
  assert.strictEqual(cleanTextContent(false), "false");
});

test("Stress: CJK Characters & Emojis - Multi-byte encoding, byte counts, and boundary checks", () => {
  const cjkContent = "💊 Quick Pill 快速药丸 🚀\n这是一个关于Windows桌面动态岛的笔记。\n包含日文日本語テストと한국어테스트。";
  const cleaned = cleanTextContent(cjkContent);
  assert.ok(cleaned.includes("💊"));
  assert.ok(cleaned.includes("快速药丸"));
  assert.ok(cleaned.includes("日本語"));
  assert.ok(cleaned.includes("한국어"));

  const guard = evaluateContentGuard(cjkContent);
  assert.ok(guard.byteCount > guard.charCount, "UTF-8 byteCount must exceed charCount for CJK and emojis");

  // Multi-byte emojis around truncation boundary
  const emojiStream = "😀".repeat(160); // 160 emojis = 320 chars in JS string (surrogate pairs)
  const emojiGuard = evaluateContentGuard(emojiStream);
  assert.strictEqual(emojiGuard.isLarge, true);
  assert.strictEqual(emojiGuard.isTruncated, true);
  assert.ok(emojiGuard.preview.endsWith("..."));
});

test("Stress: Context Adapter - UIPI Honest Reporting with and without clipboard fallback", async () => {
  const mockForegroundWindow = {
    appName: "Visual Studio Code",
    windowTitle: "contextAdapter.js - Quick Pill",
    processName: "Code.exe",
    pid: 9944,
    timestamp: new Date().toISOString(),
  };

  const adapter = createContextAdapter({
    mockForeground: mockForegroundWindow,
    clipboard: { readText: () => "Captured text from external clipboard" },
  });

  // 1. Without fallback: honest error report
  const noFallbackRes = await adapter.getContextualCapture({
    method: "external_selection",
    fallbackToClipboard: false,
  });
  assert.strictEqual(noFallbackRes.success, false);
  assert.strictEqual(noFallbackRes.code, CAPTURE_ERROR_CODES.SELECTION_UNAVAILABLE_UIPI);
  assert.ok(noFallbackRes.message.includes("UIPI"));
  assert.strictEqual(noFallbackRes.sourceMetadata.appName, "Visual Studio Code");

  // 2. With fallback: transparent fallback with honesty flag
  const fallbackRes = await adapter.getContextualCapture({
    method: "external_selection",
    fallbackToClipboard: true,
  });
  assert.strictEqual(fallbackRes.success, true);
  assert.strictEqual(fallbackRes.code, CAPTURE_ERROR_CODES.SELECTION_UNAVAILABLE_UIPI);
  assert.strictEqual(fallbackRes.fallbackUsed, true);
  assert.strictEqual(fallbackRes.content, "Captured text from external clipboard");
  assert.strictEqual(fallbackRes.sourceMetadata.appName, "Visual Studio Code");
});

// ===========================================================================
// SECTION 2: Hashtag Tokenization Edge Cases
// ===========================================================================

test("Stress: Hashtag Tokenization - Chained hashes, prefixes, and punctuation boundaries", () => {
  // #tag#tag2 -> first tag matches, second tag is not preceded by a delimiter
  const chained = extractTags("Checking #tag#tag2 and #first #second");
  assert.ok(chained.includes("tag"));
  assert.ok(chained.includes("first"));
  assert.ok(chained.includes("second"));
  assert.ok(!chained.includes("tag2"), "Second chained tag without delimiter is not extracted");

  // Punctuation and brackets
  const bracketed = extractTags("Tags: (#paren) [#bracket] {#brace} <#angle> \"#quote\" '#single'");
  assert.deepStrictEqual(bracketed, ["angle", "brace", "bracket", "paren", "quote", "single"]);

  // Double hashes (##tag) are ATX headings without space, not hashtags
  assert.deepStrictEqual(extractTags("##tag1 and ###tag2"), []);
});

test("Stress: Hashtag Tokenization - Issue numbers and pure digits rejected", () => {
  const issueText = "Resolving #123, #4567, #007, #2026, and #0";
  const tags = extractTags(issueText);
  assert.deepStrictEqual(tags, [], "Pure numbers must never be extracted as tags");

  // Mixed numbers and letters are valid tags
  const validTags = extractTags("Versions #v1 #m2_release #task_99 #m2");
  assert.deepStrictEqual(validTags, ["m2", "m2_release", "task_99", "v1"]);
});

test("Stress: Hashtag Tokenization - Hex color codes vs semantic English words", () => {
  // Hex colors should be excluded
  const hexText = "Colors: #ffffff, #FFFFFF, #fff, #000, #ff9500, #34c759, #1a2b3c, #AABBCCDD";
  const hexTags = extractTags(hexText);
  assert.deepStrictEqual(hexTags, [], "Hex color codes must not be parsed as tags");

  // Semantic English words matching hex character dictionary must be preserved as tags
  const wordText = "Semantic words: #bed #cab #dad #bad #fee #bee #ace #act";
  const wordTags = extractTags(wordText);
  assert.deepStrictEqual(wordTags, ["ace", "act", "bad", "bed", "bee", "cab", "dad", "fee"]);

  // Non-hex color names
  const colorNames = extractTags("Named colors: #blue #red #green #purple");
  assert.deepStrictEqual(colorNames, ["blue", "green", "purple", "red"]);
});

test("Stress: Hashtag Tokenization - Code blocks, comments, and URLs with hash anchors", () => {
  const textWithCode = `
Here is a note with real tag #validtag.
\`\`\`javascript
// #commentTagInsideCode
const color = '#ff0000';
/* #blockCommentTag */
\`\`\`
Also inline code \`#inlineNotATag\` should be ignored.
And URLs like https://github.com/org/repo#section-anchor and http://example.com/#hash are ignored.
Plain text comment: // #notatag
`;

  const tags = extractTags(textWithCode);
  assert.ok(tags.includes("validtag"), "Real tag outside code must be extracted");
  assert.ok(!tags.includes("commenttaginsidecode"), "Tags in code blocks must be ignored");
  assert.ok(!tags.includes("blockcommenttag"), "Tags in block comments in code must be ignored");
  assert.ok(!tags.includes("inlinenotatag"), "Tags in inline code must be ignored");
  assert.ok(!tags.includes("section-anchor"), "URL anchors must be ignored");
  assert.ok(!tags.includes("hash"), "URL anchors must be ignored");
  assert.ok(tags.includes("notatag"), "Tags in plain text comments without code fences are treated as text tags");
});

test("Stress: Hashtag Tokenization - Markdown headings are strictly ignored", () => {
  const markdownNote = `
# Main Document Title
## Section 2 Heading
### Subsection 3 Heading
#### Level 4 Heading
##### Level 5 Heading
###### Level 6 Heading

Text containing an actual #legittag within the paragraph.
`;

  const tags = extractTags(markdownNote);
  assert.deepStrictEqual(tags, ["legittag"]);
});

test("Stress: Hashtag Tokenization - International, Unicode, and CJK tags", () => {
  const unicodeNote = "Categorized as #工作 #読書 #개발 #café #münchen #español #naïve";
  const tags = extractTags(unicodeNote);

  assert.ok(tags.includes("工作"), "Chinese tag preserved");
  assert.ok(tags.includes("読書"), "Japanese tag preserved");
  assert.ok(tags.includes("개발"), "Korean tag preserved");
  assert.ok(tags.includes("café"), "Accented French tag preserved");
  assert.ok(tags.includes("münchen"), "German umlaut tag preserved");
  assert.ok(tags.includes("español"), "Spanish tag preserved");
  assert.ok(tags.includes("naïve"), "Diaeresis tag preserved");
});

test("Stress: Tag Engine - Multi-tag filtering and index aggregation under high volume", () => {
  const engine = new TagEngine();
  const testNotes = [];

  for (let i = 0; i < 200; i++) {
    testNotes.push({
      id: `note-${i}`,
      title: `Note ${i}`,
      content: `Body for note ${i}`,
      tags: i % 2 === 0 ? ["work", "priority"] : ["personal", "todo"],
      isArchived: i >= 180, // 20 archived notes
    });
  }

  const index = engine.buildIndex(testNotes);
  assert.strictEqual(index.tags.work.count, 90);
  assert.strictEqual(index.tags.work.archivedCount, 10);
  assert.strictEqual(index.tags.work.totalCount, 100);

  // AND filter
  const andFilter = engine.filter(testNotes, ["work", "priority"], { mode: "AND" });
  assert.strictEqual(andFilter.length, 90, "Active notes with both tags");

  // OR filter
  const orFilter = engine.filter(testNotes, ["work", "personal"], { mode: "OR" });
  assert.strictEqual(orFilter.length, 180, "All active notes matching either tag");

  // Autocomplete suggestion prefix
  const suggestions = engine.suggest(index, "per", 5);
  assert.ok(suggestions.includes("personal"));
});

// ===========================================================================
// SECTION 3: Full-Text Notes Search Stress Testing
// ===========================================================================

test("Stress: Notes Search - Regex metacharacters do not crash and match literally", () => {
  const notes = [
    { id: "1", title: "C++ Development Guide", content: "Details on C++20 pointers and templates." },
    { id: "2", title: "Regex Cheat Sheet", content: "Patterns: ^start, end$, (foo|bar), [a-z]+, \\d+, *wildcard*" },
    { id: "3", title: "Question & Answer?", content: "Is this safe? Yes! 100% (guaranteed)." },
    { id: "4", title: "Math Equations", content: "Formula: a + b = c * d / e" },
    { id: "5", title: "Windows Paths", content: "Location: C:\\Users\\Administrator\\AppData\\Local" },
  ];

  const dangerousQueries = [
    "C++",
    "^start",
    "end$",
    "(foo|bar)",
    "[a-z]+",
    "\\d+",
    "*wildcard*",
    "?",
    "+",
    "*",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "|",
    "\\",
    ".*",
    ".+",
    "a + b",
    "AppData\\Local",
  ];

  for (const q of dangerousQueries) {
    assert.doesNotThrow(() => {
      const results = searchNotes(notes, q);
      assert.ok(Array.isArray(results), `searchNotes must return array for query: ${q}`);
    }, `Regex syntax error thrown on query: ${q}`);

    assert.doesNotThrow(() => {
      filterInbox(notes, { query: q });
    }, `filterInbox crashed on query: ${q}`);
  }

  // Literal match verification for C++
  const cppResults = searchNotes(notes, "c++");
  assert.ok(cppResults.length >= 1, "Should match note 1 containing C++");
  assert.strictEqual(cppResults[0].note.id, "1");

  // Literal match verification for backslash path
  const pathResults = searchNotes(notes, "appdata\\local");
  assert.ok(pathResults.length >= 1);
  assert.strictEqual(pathResults[0].note.id, "5");
});

test("Stress: Notes Search - Empty queries, whitespace-only, and defensive types", () => {
  const notes = [{ id: "n1", title: "Test Note", content: "Content body" }];

  const emptyInputs = ["", "   ", "\t\t\n", null, undefined, 12345, {}, []];
  for (const input of emptyInputs) {
    const res = searchNotes(notes, input);
    assert.deepStrictEqual(res, [], `Expected empty results for empty/invalid query: ${JSON.stringify(input)}`);

    const score = scoreNote(notes[0], input);
    assert.strictEqual(score.score, 0);
  }
});

test("Stress: Notes Search - Conjunction bonus and hierarchical ranking", () => {
  const notes = [
    {
      id: "exact-title",
      title: "React Architecture",
      content: "General overview",
      updatedAt: "2026-10-15T12:00:00Z",
    },
    {
      id: "partial-title",
      title: "React Performance Tuning",
      content: "Details on hooks",
      updatedAt: "2026-10-15T12:00:00Z",
    },
    {
      id: "both-tokens-content",
      title: "Frontend Guide",
      content: "Discussion of React and Architecture best practices in Quick Pill",
      updatedAt: "2026-10-15T12:00:00Z",
    },
    {
      id: "single-token-content",
      title: "Backend Guide",
      content: "Discussion of React components only",
      updatedAt: "2026-10-15T12:00:00Z",
    },
  ];

  const results = searchNotes(notes, "react architecture");
  assert.ok(results.length >= 3);

  // Exact title must score highest
  assert.strictEqual(results[0].note.id, "exact-title", "Exact title match must rank first");

  // Both tokens in content receives +400 conjunction bonus, beating single token match
  const bothTokens = results.find((r) => r.note.id === "both-tokens-content");
  const singleToken = results.find((r) => r.note.id === "single-token-content");
  assert.ok(bothTokens, "both-tokens-content should be found");
  if (singleToken) {
    assert.ok(bothTokens.score > singleToken.score, "Conjunction match must score higher than single-token match");
  }
});

test("Stress: Notes Search - Snippet extraction and highlight intervals on long content", () => {
  const prefix = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(250);
  const middle = " CRITICAL_KEYWORD_DISCOVERY is right here in the center of the paragraph. ";
  const suffix = "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ".repeat(250);
  const fullContent = prefix + middle + suffix;

  const { snippet, highlights } = extractSnippet(fullContent, ["critical_keyword_discovery"], 140);

  assert.ok(snippet.includes("CRITICAL_KEYWORD_DISCOVERY"), "Snippet must center around the matching token");
  assert.ok(snippet.length <= 160, `Snippet length (${snippet.length}) must be bounded`);
  assert.ok(snippet.startsWith("... "), "Buried token snippet must start with prefix ellipsis");
  assert.ok(snippet.endsWith(" ..."), "Buried token snippet must end with suffix ellipsis");

  assert.ok(highlights.length === 1, "Must have exactly 1 highlight interval");
  const hl = highlights[0];
  assert.ok(hl.start >= 0);
  assert.ok(hl.end <= snippet.length);
  const highlightedText = snippet.slice(hl.start, hl.end);
  assert.strictEqual(highlightedText, "CRITICAL_KEYWORD_DISCOVERY");
});

test("Stress: Notes Search - Non-overlapping highlight intervals", () => {
  const text = "Quick Pill is an agile desktop dynamic island application";
  const highlights = findHighlights(text, ["quick", "quick pill", "pill"]);

  assert.strictEqual(highlights.length, 1, "Overlapping tokens must be merged into a single interval");
  assert.strictEqual(highlights[0].start, 0);
  assert.strictEqual(highlights[0].end, 10);
  assert.strictEqual(text.slice(highlights[0].start, highlights[0].end), "Quick Pill");
});

// ===========================================================================
// SECTION 4: Note-to-Task Conversion Stress Testing
// ===========================================================================

test("Stress: Task Conversion - Standard markdown headings, lists, checkboxes", () => {
  const testCases = [
    { input: "# Heading 1 Task", expected: "Heading 1 Task" },
    { input: "### Deep Heading 3 Task", expected: "Deep Heading 3 Task" },
    { input: "###### Maximum H6 Task", expected: "Maximum H6 Task" },
    { input: "- Bullet Item Task", expected: "Bullet Item Task" },
    { input: "* Star Bullet Item", expected: "Star Bullet Item" },
    { input: "+ Plus Bullet Item", expected: "Plus Bullet Item" },
    { input: "1. Numbered Item Task", expected: "Numbered Item Task" },
    { input: "42) Parenthesis Number Task", expected: "Parenthesis Number Task" },
    { input: "- [ ] Unchecked Task Item", expected: "Unchecked Task Item" },
    { input: "- [x] Checked Task Item", expected: "Checked Task Item" },
    { input: "* [X] Uppercase Checked Item", expected: "Uppercase Checked Item" },
    { input: "> Blockquote Task Item", expected: "Blockquote Task Item" },
    { input: "**Bold Task Title**", expected: "Bold Task Title" },
    { input: "*Italic Task Title*", expected: "Italic Task Title" },
    { input: "`Code Snippet Task`", expected: "Code Snippet Task" },
    { input: "~~Strikethrough Task~~", expected: "Strikethrough Task" },
  ];

  for (const { input, expected } of testCases) {
    const title = extractTaskTitle(input);
    assert.strictEqual(title, expected, `Failed to cleanly extract title from: "${input}"`);
  }
});

test("Stress: Task Conversion - Long multiline notes with blank lines and word truncation", () => {
  const multilineNote = `
  
     \t  
\r\n

# Actual Primary Task
Here is additional body line 1
Here is additional body line 2
`;
  assert.strictEqual(extractTaskTitle(multilineNote), "Actual Primary Task");

  // Overlong title word-boundary truncation (<=60 chars)
  const longSentence = "Configure audio mixer endpoint listeners and verify WASAPI volume changes under load";
  const truncated = extractTaskTitle(longSentence, "", 60);

  assert.ok(truncated.length <= 60, `Title length ${truncated.length} must be <= 60 chars`);
  assert.ok(truncated.endsWith("..."), "Must end with ellipsis");
  assert.strictEqual(truncated, "Configure audio mixer endpoint listeners and verify...");

  // Continuous long string without spaces
  const continuousLong = "X".repeat(120);
  const truncatedContinuous = extractTaskTitle(continuousLong, "", 60);
  assert.ok(truncatedContinuous.length <= 60);
  assert.ok(truncatedContinuous.endsWith("..."));

  // Empty or whitespace-only content
  assert.strictEqual(extractTaskTitle(""), "Untitled Task");
  assert.strictEqual(extractTaskTitle("    \n\t  \r\n  "), "Untitled Task");
});

test("Stress: Task Conversion - Polymorphic task normalization handles mixed legacy & modern lists", () => {
  const mixedTasks = [
    "Legacy task string A",
    { id: "mod-1", title: "Modern Task 1", completed: false, body: "Detailed notes" },
    "Legacy task string B",
    { id: "mod-2", title: "Modern Task 2", completed: true, body: "" },
    null,
    undefined,
    12345,
    { title: "Object missing id" },
  ];

  const normalized = mixedTasks.map((t, idx) => normalizeTask(t, idx));

  assert.strictEqual(normalized.length, 8);

  // Legacy string items
  assert.strictEqual(normalized[0].id, "legacy_0");
  assert.strictEqual(normalized[0].title, "Legacy task string A");
  assert.strictEqual(normalized[0].isLegacy, true);
  assert.strictEqual(normalized[0].completed, false);

  assert.strictEqual(normalized[2].id, "legacy_2");
  assert.strictEqual(normalized[2].title, "Legacy task string B");
  assert.strictEqual(normalized[2].isLegacy, true);

  // Modern structured items
  assert.strictEqual(normalized[1].id, "mod-1");
  assert.strictEqual(normalized[1].title, "Modern Task 1");
  assert.strictEqual(normalized[1].body, "Detailed notes");
  assert.strictEqual(normalized[1].isLegacy, false);
  assert.strictEqual(normalized[1].completed, false);

  assert.strictEqual(normalized[3].id, "mod-2");
  assert.strictEqual(normalized[3].completed, true);
  assert.strictEqual(normalized[3].isLegacy, false);

  // Malformed items safely normalized to prevent React render crash
  assert.strictEqual(normalized[4].isLegacy, true);
  assert.strictEqual(normalized[4].title, "Untitled Task");
  assert.strictEqual(normalized[5].isLegacy, true);
  assert.strictEqual(normalized[5].title, "Untitled Task");
  assert.strictEqual(normalized[6].isLegacy, true);

  // Missing id generated
  assert.ok(normalized[7].id.startsWith("task_7_"));
  assert.strictEqual(normalized[7].title, "Object missing id");
});

test("Stress: Task Conversion - Source note is deeply immutable and unmutated", () => {
  const sourceNote = Object.freeze({
    id: "frozen-note-uuid",
    title: "Original Immutable Note",
    content: "## Meeting Decisions\n1. Launch Quick Pill\n2. Verify all tests",
    tags: Object.freeze(["planning", "m2"]),
    isPinned: true,
    isArchived: false,
    createdAt: "2026-10-15T10:00:00Z",
    updatedAt: "2026-10-15T10:00:00Z",
  });

  const task = convertNoteToTask(sourceNote);

  // Verification of task fields
  assert.strictEqual(task.title, "Meeting Decisions");
  assert.strictEqual(task.body, sourceNote.content);
  assert.strictEqual(task.noteId, "frozen-note-uuid");
  assert.strictEqual(task.completed, false);
  assert.strictEqual(task.source, "quick_notes");

  // Mutate task
  task.completed = true;
  task.title = "Completely Mutated Task Title";
  task.body = "Mutated Task Body";

  // Source note must remain intact
  assert.strictEqual(sourceNote.title, "Original Immutable Note");
  assert.strictEqual(sourceNote.isPinned, true);
  assert.strictEqual(sourceNote.isArchived, false);
});

// ===========================================================================
// SECTION 5: Adversarial Bug Reproductions (Empirical Evidence)
// ===========================================================================

test("Bug Investigation: taskConverter - Nested markdown prefixes (> - [ ] # ) must be cleanly stripped", () => {
  // A task like "- [ ] # Task" or "> - [ ] Task" represents markdown checkboxes with headers or blockquotes
  const nestedHeader = extractTaskTitle("- [ ] # Nested Task Title");
  const nestedQuote = extractTaskTitle("> - [ ] Blockquoted Task");
  const quoteHeader = extractTaskTitle("> # Blockquoted Header");

  // EMPIRICAL BUG CHECK:
  // In taskConverter.js lines 29-35, single-pass non-looping regexes leave prefixes unstripped
  assert.strictEqual(
    nestedHeader,
    "Nested Task Title",
    `Bug: - [ ] # prefix was not stripped cleanly, got: "${nestedHeader}"`
  );
  assert.strictEqual(
    nestedQuote,
    "Blockquoted Task",
    `Bug: > - [ ] prefix was not stripped cleanly, got: "${nestedQuote}"`
  );
  assert.strictEqual(
    quoteHeader,
    "Blockquoted Header",
    `Bug: > # prefix was not stripped cleanly, got: "${quoteHeader}"`
  );
});

test("Bug Investigation: taskConverter - Whitespace-only content must fallback to note title", () => {
  // When a note has a title but an empty or whitespace-only content body,
  // converting to task must preserve the note's existing title rather than defaulting to "Untitled Task"
  const titlePreserved = extractTaskTitle("   \n\t  ", "Sprint Review & Demo", 60);

  // EMPIRICAL BUG CHECK:
  // In taskConverter.js line 21: (content || fallbackTitle || "") evaluates truthy "   ",
  // which trims to "" and discards fallbackTitle!
  assert.strictEqual(
    titlePreserved,
    "Sprint Review & Demo",
    `Bug: Whitespace content discarded fallbackTitle, got: "${titlePreserved}"`
  );
});

test("Bug Investigation: contextAdapter - evaluateContentGuard must not crash on truthy non-string inputs", () => {
  // evaluateContentGuard is an exported public utility; passing non-string truthy primitives should not throw TypeError
  assert.doesNotThrow(() => {
    evaluateContentGuard(12345);
  }, "Bug: evaluateContentGuard threw TypeError on number input");

  assert.doesNotThrow(() => {
    evaluateContentGuard(true);
  }, "Bug: evaluateContentGuard threw TypeError on boolean input");
});

test("Bug Investigation: contextAdapter - deriveAutoTitle should support East Asian full-width sentence terminators", () => {
  // In Chinese/Japanese, sentences end with '。', '！', '？' without trailing spaces
  const chineseNote = "这是一个非常重要的会议决议。后续是详细执行计划。";
  const derivedTitle = deriveAutoTitle(chineseNote);

  // EMPIRICAL BUG CHECK:
  // In contextAdapter.js line 134: regex only looks for ASCII [.!?](?=\s|$)
  assert.strictEqual(
    derivedTitle,
    "这是一个非常重要的会议决议。",
    `Bug: deriveAutoTitle did not split on CJK full stop '。', got: "${derivedTitle}"`
  );
});
