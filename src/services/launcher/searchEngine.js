"use strict";

/**
 * Quick Pill Search Engine
 * Hierarchical scoring: Exact > Alias > Acronym > Prefix > Word Boundary > Fuzzy Subsequence
 * Secondary ranking: Frequency boost + Exponential time decay recency boost + Favorite boost + Running window boost
 */

const DEFAULT_ALIASES = Object.freeze({
  calc: ["calculator", "calc.exe"],
  calculator: ["calculator"],
  term: ["windows terminal", "terminal"],
  wt: ["windows terminal"],
  terminal: ["windows terminal"],
  ps: ["powershell", "windows powershell", "pwsh"],
  pwsh: ["powershell", "windows powershell"],
  powershell: ["powershell", "windows powershell"],
  chrome: ["google chrome"],
  edge: ["microsoft edge", "edge"],
  code: ["visual studio code", "code"],
  vscode: ["visual studio code"],
  vsc: ["visual studio code"],
  cmd: ["command prompt", "cmd.exe"],
  explorer: ["file explorer", "explorer.exe"],
  taskmgr: ["task manager"],
  paint: ["paint", "mspaint.exe"],
  notepad: ["notepad", "notepad.exe"],
  word: ["microsoft word"],
  excel: ["microsoft excel"],
  ppt: ["microsoft powerpoint"],
  settings: ["settings", "windows settings"],
});

const DEFAULT_SEARCH_OPTIONS = Object.freeze({
  limit: 8,
  minFuzzyScore: 15,
  includeRunningWindows: true,
  halfLifeDays: 4.6,
  maxFrequencyBoost: 120,
  maxRecencyBoost: 150,
  favoriteBoost: 80,
  runningWindowBoost: 50,
});

/**
 * Extracts initials/acronym from title (e.g. "Windows Terminal" -> "wt", "Visual Studio Code" -> "vsc")
 * @param {string} text
 * @returns {string}
 */
function extractAcronym(text) {
  if (!text || typeof text !== "string") return "";
  const words = text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/);
  return words.map((w) => w[0]?.toLowerCase() || "").join("");
}

/**
 * High-performance subsequence matcher with consecutive & boundary bonuses.
 * Returns integer score (0 = no match).
 * @param {string} query
 * @param {string} target
 * @returns {number}
 */
function scoreSubsequence(query, target) {
  if (!query || !target) return 0;
  const qLen = query.length;
  const tLen = target.length;
  if (qLen === 0 || tLen === 0 || qLen > tLen) return 0;

  let qIdx = 0;
  let score = 0;
  let consecutive = 0;
  let prevMatchIdx = -1;

  for (let tIdx = 0; tIdx < tLen && qIdx < qLen; tIdx++) {
    const qChar = query[qIdx];
    const tChar = target[tIdx];

    if (qChar === tChar) {
      qIdx++;
      let charScore = 10;

      // Start of string bonus
      if (tIdx === 0) charScore += 30;

      // Word boundary bonus (after space, dash, dot, slash, underscore)
      if (tIdx > 0 && /[\s\-_./]/.test(target[tIdx - 1])) {
        charScore += 25;
      }

      // Consecutive match bonus
      if (prevMatchIdx === tIdx - 1) {
        consecutive++;
        charScore += consecutive * 15;
      } else {
        consecutive = 0;
        if (prevMatchIdx !== -1) {
          const gap = tIdx - prevMatchIdx - 1;
          charScore -= Math.min(gap * 2, 20);
        }
      }

      prevMatchIdx = tIdx;
      score += charScore;
    }
  }

  if (qIdx < qLen) return 0;

  const ratio = qLen / tLen;
  return Math.max(1, Math.round(score * (0.4 + 0.6 * ratio)));
}

function matchesTokenBoundary(text, token) {
  if (!text || !token) return false;
  if (text === token) return true;
  const idx = text.indexOf(token);
  if (idx === -1) return false;
  let pos = idx;
  const tokenLen = token.length;
  const textLen = text.length;
  while (pos !== -1) {
    const beforeOk = pos === 0 || /[\s\-_.]/.test(text[pos - 1]);
    const afterOk = pos + tokenLen === textLen || /[\s\-_.]/.test(text[pos + tokenLen]);
    if (beforeOk && afterOk) return true;
    pos = text.indexOf(token, pos + 1);
  }
  return false;
}

/**
 * Calculates match score and secondary boosts for a single item.
 * @param {string} query
 * @param {Object} item
 * @param {Object} [options]
 * @param {number} [now]
 * @returns {{ totalScore: number, baseMatchScore: number, freqBoost: number, recencyBoost: number, matchType: string } | null}
 */
function calculateScore(query, item, options = {}, now = Date.now()) {
  if (!item || typeof item !== "object") return null;

  const q = (query || "").toLowerCase().trim();
  if (!q) return null;

  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const aliasesMap = { ...DEFAULT_ALIASES, ...(opts.customAliases || {}) };

  const name = (item.name || item.title || "").toLowerCase();
  const rawTarget = item.launchTarget || item.launch || item.target || item.processName || "";
  const exe = rawTarget.split(/[/\\]/).pop().toLowerCase();
  const acronym = item._acronym || extractAcronym(item.name || item.title || "");

  let baseMatchScore = 0;
  let matchType = "none";

  const itemAliases = Array.isArray(item.aliases) ? item.aliases : [];
  const aliasTargets = aliasesMap[q] || [];

  const matchesAliasTarget = (t) => {
    if (!t) return false;
    const targetLower = t.toLowerCase();
    if (name === targetLower) return true;
    if (exe === targetLower || exe === `${targetLower}.exe`) return true;
    if (matchesTokenBoundary(name, targetLower)) return true;
    if (itemAliases.some((a) => (a || "").toLowerCase() === targetLower)) return true;
    return false;
  };

  const hasGlobalAliasMatch = aliasTargets.some(matchesAliasTarget);
  const exactItemAlias = itemAliases.find((a) => (a || "").toLowerCase() === q);
  const prefixItemAlias =
    !exactItemAlias && q.length >= 2
      ? itemAliases.find((a) => (a || "").toLowerCase().startsWith(q))
      : null;

  // 1. Exact Name Match (MUST BE EVALUATED BEFORE ALIASES)
  if (name === q) {
    baseMatchScore = 1000;
    matchType = "exact_name";
  }
  // 2. Alias Match (Global map or exact dynamic item alias)
  else if (hasGlobalAliasMatch || exactItemAlias) {
    baseMatchScore = 950;
    matchType = "alias";
  }
  // 3. Exact Executable Match
  else if (exe === q || exe === `${q}.exe`) {
    baseMatchScore = 920;
    matchType = "exact_exe";
  }
  // 4. Exact Acronym Match (e.g. wt -> Windows Terminal)
  else if (acronym === q) {
    baseMatchScore = 850;
    matchType = "exact_acronym";
  }
  // 5. Prefix Match on Name
  else if (name.startsWith(q)) {
    baseMatchScore = 800 - Math.min((name.length - q.length) * 2, 80);
    matchType = "prefix_name";
  }
  // 6. Prefix Match on Executable
  else if (exe.startsWith(q)) {
    baseMatchScore = 750 - Math.min((exe.length - q.length) * 2, 70);
    matchType = "prefix_exe";
  }
  // 7. Prefix Match on Dynamic Item Alias
  else if (prefixItemAlias) {
    baseMatchScore = 760 - Math.min((prefixItemAlias.length - q.length) * 2, 60);
    matchType = "alias";
  }
  // 8. Acronym Prefix Match (e.g. vs -> Visual Studio Code)
  else if (acronym.startsWith(q) && q.length >= 2) {
    baseMatchScore = 700;
    matchType = "prefix_acronym";
  }
  // 9. Word Boundary Prefix Match
  else {
    const words = name ? name.split(/[\s\-_.]+/) : [];
    const wordIdx = words.findIndex((w) => w.startsWith(q));
    if (wordIdx !== -1) {
      baseMatchScore = 650 - Math.min(wordIdx * 25, 100);
      matchType = "word_boundary";
    } else {
      // 10. Fuzzy Subsequence Match
      const nameFuzzy = scoreSubsequence(q, name);
      const exeFuzzy = scoreSubsequence(q, exe);
      const bestFuzzy = Math.max(nameFuzzy, exeFuzzy);
      if (bestFuzzy >= opts.minFuzzyScore) {
        baseMatchScore = Math.min(bestFuzzy, 500);
        matchType = "fuzzy";
      }
    }
  }

  if (baseMatchScore === 0) return null;

  // Secondary Boosts
  let freqBoost = 0;
  if (item.launchCount && item.launchCount > 0) {
    freqBoost = Math.min(item.launchCount * 12, opts.maxFrequencyBoost);
  }

  let recencyBoost = 0;
  if (item.lastLaunch && item.lastLaunch > 0) {
    const daysSince = Math.max(0, (now - item.lastLaunch) / 86400000);
    const decayMultiplier = Math.exp(-0.15 * daysSince);
    recencyBoost = Math.round(opts.maxRecencyBoost * decayMultiplier);
  }

  const favoriteBoost = item.isFavorite ? opts.favoriteBoost : 0;
  const runningBoost = item.kind === "window" ? opts.runningWindowBoost : 0;
  const rawBoosts = freqBoost + recencyBoost + favoriteBoost + runningBoost;

  // Invariant Scoring Hierarchy Protection:
  // Tier ceilings ensure that lower tiers (prefix, fuzzy, word boundary)
  // CANNOT surpass an unboosted exact match (base 1000).
  const TIER_CEILINGS = {
    exact_name: Infinity,
    alias: 990,
    exact_exe: 945,
    exact_acronym: 910,
    prefix_name: 845,
    prefix_exe: 845,
    prefix_acronym: 845,
    word_boundary: 695,
    fuzzy: 545,
  };

  const ceiling = TIER_CEILINGS[matchType] ?? 990;
  const totalScore = Math.min(baseMatchScore + rawBoosts, ceiling);

  return { totalScore, baseMatchScore, freqBoost, recencyBoost, matchType };
}

function createSearchEngine(defaultOptions = {}) {
  let customAliases = {};

  return {
    setCustomAliases(aliases) {
      customAliases = { ...aliases };
    },

    getEmptyQueryResults(catalog = [], favorites = [], launchStats = {}, runningWindows = [], limit = 8) {
      const favSet = new Set(Array.isArray(favorites) ? favorites : []);
      const safeCatalog = Array.isArray(catalog) ? catalog : [];
      const safeWindows = Array.isArray(runningWindows) ? runningWindows : [];
      const safeStats = launchStats && typeof launchStats === "object" ? launchStats : {};

      // Normalize catalog applications
      const appItems = safeCatalog
        .filter((a) => a && typeof a === "object")
        .map((a) => {
          const targetKey = a.launch || a.target || a.id || a.launchTarget || "";
          const stat = safeStats[targetKey] || (a.name && safeStats[a.name]) || {};
          return {
            id: a.id || targetKey,
            name: a.name || a.title || "",
            title: a.title || a.name || "",
            subtitle: a.launch || a.target || a.launchTarget || "",
            kind: "app",
            launch: a.launch,
            target: a.target,
            launchTarget: a.launchTarget || a.launch || a.target || "",
            type: a.type || "win32",
            hWnd: null,
            pid: null,
            processName: null,
            isMinimized: false,
            icon: a.icon || null,
            isFavorite: favSet.has(targetKey) || (a.id && favSet.has(a.id)) || Boolean(a.isFavorite),
            launchCount: stat.launchCount || a.launchCount || 0,
            lastLaunch: stat.lastLaunched ? new Date(stat.lastLaunched).getTime() : a.lastLaunch || 0,
            _acronym: a._acronym || extractAcronym(a.name || a.title || ""),
            aliases: Array.isArray(a.aliases) ? a.aliases : [],
          };
        });

      // Normalize running windows
      const windowItems = safeWindows
        .filter((w) => w && typeof w === "object")
        .map((w) => ({
          id: `win-${w.hWnd}`,
          name: w.title || "",
          title: w.title || "",
          subtitle: `Switch to window (${w.processName || ""})`,
          kind: "window",
          launchTarget: null,
          hWnd: w.hWnd,
          pid: w.pid,
          processName: w.processName || "",
          isMinimized: Boolean(w.isMinimized),
          icon: w.icon || null,
          isFavorite: false,
          launchCount: 0,
          lastLaunch: 0,
        }));

      // Sort app items: favorites first, then by launchCount, then by lastLaunch, then alphabetical
      const sortedApps = [...appItems].sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
        if (a.launchCount !== b.launchCount) return b.launchCount - a.launchCount;
        if (a.lastLaunch !== b.lastLaunch) return b.lastLaunch - a.lastLaunch;
        return (a.name || "").localeCompare(b.name || "");
      });

      const combined = [...windowItems.slice(0, 3), ...sortedApps];
      return combined.slice(0, limit).map((item) => ({
        ...item,
        score: 0,
        matchType: "default",
      }));
    },

    search(query, catalog = [], runningWindows = [], launchStats = {}, favorites = [], options = {}) {
      const opts = { ...DEFAULT_SEARCH_OPTIONS, ...defaultOptions, ...options, customAliases };
      const q = (query || "").trim();
      const favSet = new Set(Array.isArray(favorites) ? favorites : []);
      const safeCatalog = Array.isArray(catalog) ? catalog : [];
      const safeWindows = Array.isArray(runningWindows) ? runningWindows : [];
      const safeStats = launchStats && typeof launchStats === "object" ? launchStats : {};

      // If empty query, return default items
      if (!q) {
        return this.getEmptyQueryResults(safeCatalog, favorites, safeStats, safeWindows, opts.limit);
      }

      // Normalize running windows into search candidates
      const windowItems = (opts.includeRunningWindows ? safeWindows : [])
        .filter((w) => w && typeof w === "object")
        .map((w) => ({
          id: `win-${w.hWnd}`,
          name: w.title || "",
          title: w.title || "",
          subtitle: `Switch to window (${w.processName || ""})`,
          kind: "window",
          launchTarget: null,
          hWnd: w.hWnd,
          pid: w.pid,
          processName: w.processName || "",
          isMinimized: Boolean(w.isMinimized),
          icon: w.icon || null,
          isFavorite: false,
          launchCount: 0,
          lastLaunch: 0,
        }));

      // Normalize catalog applications
      const appItems = safeCatalog
        .filter((a) => a && typeof a === "object")
        .map((a) => {
          const targetKey = a.launch || a.target || a.id || a.launchTarget || "";
          const stat = safeStats[targetKey] || (a.name && safeStats[a.name]) || {};
          return {
            id: a.id || targetKey,
            name: a.name || a.title || "",
            title: a.title || a.name || "",
            subtitle: a.launch || a.target || a.launchTarget || "",
            kind: "app",
            launch: a.launch,
            target: a.target,
            launchTarget: a.launchTarget || a.launch || a.target || "",
            type: a.type || "win32",
            hWnd: null,
            pid: null,
            processName: null,
            isMinimized: false,
            icon: a.icon || null,
            isFavorite: favSet.has(targetKey) || (a.id && favSet.has(a.id)) || Boolean(a.isFavorite),
            launchCount: stat.launchCount || a.launchCount || 0,
            lastLaunch: stat.lastLaunched ? new Date(stat.lastLaunched).getTime() : a.lastLaunch || 0,
            _acronym: a._acronym || extractAcronym(a.name || a.title || ""),
            aliases: Array.isArray(a.aliases) ? a.aliases : [],
          };
        });

      const allCandidates = [...windowItems, ...appItems];
      const scored = [];
      const now = Date.now();

      for (const item of allCandidates) {
        const result = calculateScore(q, item, opts, now);
        if (result) {
          scored.push({
            ...item,
            score: result.totalScore,
            matchType: result.matchType,
          });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, opts.limit);
    },
  };
}

class SearchEngine {
  constructor(options = {}) {
    this.engine = createSearchEngine(options);
  }

  setCustomAliases(aliases) {
    this.engine.setCustomAliases(aliases);
  }

  getEmptyQueryResults(catalog, favorites, launchStats, runningWindows, limit) {
    return this.engine.getEmptyQueryResults(catalog, favorites, launchStats, runningWindows, limit);
  }

  search(query, catalog, runningWindows, launchStats, favorites, options) {
    return this.engine.search(query, catalog, runningWindows, launchStats, favorites, options);
  }
}

module.exports = {
  createSearchEngine,
  SearchEngine,
  calculateScore,
  scoreSubsequence,
  extractAcronym,
  DEFAULT_ALIASES,
  DEFAULT_SEARCH_OPTIONS,
};
