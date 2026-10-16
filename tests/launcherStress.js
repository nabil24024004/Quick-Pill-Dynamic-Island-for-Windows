"use strict";

const { performance } = require("perf_hooks");
const {
  createSearchEngine,
  calculateScore,
  scoreSubsequence,
  extractAcronym,
  DEFAULT_ALIASES,
} = require("../src/services/launcher/searchEngine");

const {
  normalizeExePath,
  normalizeAppName,
  deduplicateCatalog,
} = require("../src/services/launcher/discovery");

console.log("===============================================================");
console.log("  QUICK PILL MILESTONE 1 - EMPIRICAL STRESS TEST HARNESS      ");
console.log("  Search & Ranking Engine and Discovery Deduplication         ");
console.log("===============================================================\n");

const suiteStats = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
};

function assertTest(name, condition, details = "") {
  suiteStats.total++;
  if (condition) {
    suiteStats.passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    suiteStats.failed++;
    console.log(`  [FAIL] ${name}`);
    if (details) console.log(`         -> ${details}`);
    suiteStats.failures.push({ name, details });
  }
}

// ============================================================================
// SUITE 1: Extreme & Adversarial Query Inputs
// ============================================================================
console.log("SUITE 1: Extreme & Adversarial Query Inputs");
const engine = createSearchEngine();
const basicCatalog = [
  { id: "1", name: "Google Chrome", launch: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", target: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
  { id: "2", name: "Calculator", launch: "C:\\Windows\\System32\\calc.exe", target: "C:\\Windows\\System32\\calc.exe" },
  { id: "3", name: "Visual Studio Code", launch: "C:\\Tools\\code.exe", target: "C:\\Tools\\code.exe" },
  { id: "4", name: "🚀 Rocket Launch Manager", launch: "C:\\Games\\rocket.exe", target: "C:\\Games\\rocket.exe" },
  { id: "5", name: "微信 WeChat", launch: "C:\\Tencent\\WeChat\\WeChat.exe", target: "C:\\Tencent\\WeChat\\WeChat.exe" },
];

// 1.1 Empty & whitespace queries
try {
  const emptyRes = engine.search("", basicCatalog);
  assertTest("Empty string query returns default results without crashing", Array.isArray(emptyRes) && emptyRes.length > 0);

  const wsRes = engine.search("   \t  \n ", basicCatalog);
  assertTest("Whitespace-only query returns default results without crashing", Array.isArray(wsRes) && wsRes.length > 0);

  const nullRes = engine.search(null, basicCatalog);
  assertTest("Null query returns default results without crashing", Array.isArray(nullRes) && nullRes.length > 0);

  const undefRes = engine.search(undefined, basicCatalog);
  assertTest("Undefined query returns default results without crashing", Array.isArray(undefRes) && undefRes.length > 0);
} catch (err) {
  assertTest("Empty query handling", false, `Threw exception: ${err.message}`);
}

// 1.2 Extreme length queries
try {
  const q1k = "a".repeat(1000);
  const t0 = performance.now();
  const res1k = engine.search(q1k, basicCatalog);
  const dur1k = performance.now() - t0;
  assertTest("1,000-character query executes safely with 0 matches", Array.isArray(res1k) && res1k.length === 0, `Latency: ${dur1k.toFixed(2)}ms`);

  const q10k = "b".repeat(10000);
  const t1 = performance.now();
  const res10k = engine.search(q10k, basicCatalog);
  const dur10k = performance.now() - t1;
  assertTest("10,000-character query executes safely with 0 matches", Array.isArray(res10k) && res10k.length === 0, `Latency: ${dur10k.toFixed(2)}ms`);

  const q100k = "c".repeat(100000);
  const t2 = performance.now();
  const res100k = engine.search(q100k, basicCatalog);
  const dur100k = performance.now() - t2;
  assertTest("100,000-character query executes safely with 0 matches", Array.isArray(res100k) && res100k.length === 0, `Latency: ${dur100k.toFixed(2)}ms`);
} catch (err) {
  assertTest("Extreme length query handling", false, `Threw exception: ${err.message}`);
}

// 1.3 Regex metacharacters
const regexQueries = [
  ".*",
  "+",
  "[a-z]+",
  "\\d+",
  "(foo|bar)",
  "^$",
  "(?=.*)",
  "[[[",
  "\\",
  "*?",
  "{1,5}",
  "Chrome.*",
  "^Chrome$",
];

for (const pat of regexQueries) {
  try {
    const res = engine.search(pat, basicCatalog);
    assertTest(`Regex metacharacter query "${pat}" handled without ReDoS or syntax error`, Array.isArray(res));
  } catch (err) {
    assertTest(`Regex query "${pat}"`, false, `Threw exception: ${err.message}`);
  }
}

// 1.4 Unicode and Emojis
try {
  const emojiRes = engine.search("🚀", basicCatalog);
  assertTest("Emoji query '🚀' matches emoji application", emojiRes.length > 0 && emojiRes[0].name.includes("Rocket"));

  const cjkRes = engine.search("微信", basicCatalog);
  assertTest("CJK query '微信' matches CJK application", cjkRes.length > 0 && cjkRes[0].name.includes("WeChat"));

  const zalgo = "Z͔͑ͫ̓a͎̋ͯlͫ̆͛̔ǵ͚͋̆oͮ";
  const zalgoRes = engine.search(zalgo, basicCatalog);
  assertTest("Zalgo combining diacritics query handled safely", Array.isArray(zalgoRes));

  const nullByte = "Chrome\0Injected";
  const nullByteRes = engine.search(nullByte, basicCatalog);
  assertTest("Null byte string query handled safely", Array.isArray(nullByteRes));
} catch (err) {
  assertTest("Unicode / emoji query handling", false, `Threw exception: ${err.message}`);
}

// ============================================================================
// SUITE 2: Edge Case Catalogs & Robustness
// ============================================================================
console.log("\nSUITE 2: Edge Case Catalogs & Robustness");

// 2.1 Empty catalog
try {
  const emptyCatRes = engine.search("chrome", []);
  assertTest("Empty catalog [] returns empty array without error", Array.isArray(emptyCatRes) && emptyCatRes.length === 0);
} catch (err) {
  assertTest("Empty catalog [] handling", false, `Threw: ${err.message}`);
}

// 2.2 Null and Undefined catalog
try {
  const nullCatRes = engine.search("chrome", null);
  assertTest("Null catalog handled safely without throwing TypeError", Array.isArray(nullCatRes) && nullCatRes.length === 0);
} catch (err) {
  assertTest("Null catalog handled safely without throwing TypeError", false, `Threw TypeError: ${err.message}`);
}

try {
  const undefCatRes = engine.search("chrome", undefined);
  assertTest("Undefined catalog handled safely without throwing TypeError", Array.isArray(undefCatRes) && undefCatRes.length === 0);
} catch (err) {
  assertTest("Undefined catalog handled safely without throwing TypeError", false, `Threw TypeError: ${err.message}`);
}

// 2.3 Null Running Windows
try {
  const nullWinRes = engine.search("chrome", basicCatalog, null);
  assertTest("Null runningWindows handled safely without throwing TypeError", Array.isArray(nullWinRes));
} catch (err) {
  assertTest("Null runningWindows handled safely without throwing TypeError", false, `Threw TypeError: ${err.message}`);
}

// 2.4 Corrupted / Malformed Catalog Items
try {
  const corruptItems = [
    null,
    undefined,
    {},
    { id: "empty" },
    { name: null, launch: null },
    { name: "Valid App", launch: "C:\\valid.exe", target: "C:\\valid.exe" },
  ];
  const corruptRes = engine.search("valid", corruptItems);
  assertTest("Corrupted catalog items (null, undefined, missing fields) handled without crashing", Array.isArray(corruptRes) && corruptRes.length === 1);
} catch (err) {
  assertTest("Corrupted catalog items (null, undefined, missing fields) handled without crashing", false, `Threw TypeError: ${err.message}`);
}

// 2.5 Empty Query Sort with Missing Item Names
try {
  const missingNameCatalog = [
    { id: "1", name: "Zeta App" },
    { id: "2" }, // missing name
    { id: "3", name: "Alpha App" },
  ];
  const missingNameRes = engine.search("", missingNameCatalog);
  assertTest("Empty query sort handles catalog items with missing or undefined name without crashing", Array.isArray(missingNameRes));
} catch (err) {
  assertTest("Empty query sort handles catalog items with missing or undefined name without crashing", false, `Threw TypeError: ${err.message}`);
}

// ============================================================================
// SUITE 3: 10,000 Apps Scale & Performance Benchmark
// ============================================================================
console.log("\nSUITE 3: 10,000 Apps Scale & Performance Benchmark");
try {
  const scaleCatalog = [];
  const words = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Omni", "Hyper", "Ultra", "Super", "Micro", "Pro", "Studio", "Cloud", "Work", "Dev"];

  for (let i = 0; i < 10000; i++) {
    const w1 = words[i % words.length];
    const w2 = words[(i * 3) % words.length];
    const w3 = words[(i * 7) % words.length];
    scaleCatalog.push({
      id: `app-${i}`,
      name: `${w1} ${w2} ${w3} v${i}`,
      launch: `C:\\Program Files\\Vendor\\App${i}\\binary.exe`,
      target: `C:\\Program Files\\Vendor\\App${i}\\binary.exe`,
      launchCount: i % 25,
      lastLaunch: Date.now() - (i % 30) * 86400000,
      isFavorite: i % 50 === 0,
      _acronym: `${w1[0]}${w2[0]}${w3[0]}`.toLowerCase(),
    });
  }

  // Inject target needle at index 9,500
  scaleCatalog[9500] = {
    id: "app-needle",
    name: "Quantum Cryptographic Workstation",
    launch: "C:\\Security\\qcw.exe",
    target: "C:\\Security\\qcw.exe",
    launchCount: 0,
    lastLaunch: 0,
    isFavorite: false,
    _acronym: "qcw",
  };

  const tStart = performance.now();
  const searchResult = engine.search("cryptographic", scaleCatalog);
  const searchDuration = performance.now() - tStart;

  assertTest(
    `Single search on 10,000 items executes in < 100ms (Actual: ${searchDuration.toFixed(2)}ms)`,
    searchDuration < 100,
    `Duration was ${searchDuration.toFixed(2)}ms`
  );
  assertTest(
    "Search on 10,000 items accurately locates needle target",
    searchResult.length > 0 && searchResult[0].name === "Quantum Cryptographic Workstation"
  );

  // Multi-query latency benchmark
  const testQueries = ["alpha", "hyper", "ultra pro", "nonexistentquery999", "dev", "studio cloud"];
  const tMulti = performance.now();
  for (const q of testQueries) {
    engine.search(q, scaleCatalog);
  }
  const avgLatency = (performance.now() - tMulti) / testQueries.length;
  assertTest(
    `Average search latency across 6 queries on 10,000 items is < 60ms (Actual: ${avgLatency.toFixed(2)}ms)`,
    avgLatency < 60,
    `Average was ${avgLatency.toFixed(2)}ms`
  );
} catch (err) {
  assertTest("10,000 apps scale benchmark", false, `Threw: ${err.message}`);
}

// ============================================================================
// SUITE 4: Discovery Deduplication Stress
// ============================================================================
console.log("\nSUITE 4: Discovery Deduplication Stress");
try {
  assertTest("deduplicateCatalog handles null safely", Array.isArray(deduplicateCatalog(null)) && deduplicateCatalog(null).length === 0);
  assertTest("deduplicateCatalog handles undefined safely", Array.isArray(deduplicateCatalog(undefined)) && deduplicateCatalog(undefined).length === 0);
  assertTest("deduplicateCatalog handles non-array string safely", Array.isArray(deduplicateCatalog("invalid")) && deduplicateCatalog("invalid").length === 0);

  // Deduplicating 10,000 raw discovery entries
  const rawItems = [];
  for (let i = 0; i < 10000; i++) {
    const appIndex = i % 1000; // 1,000 distinct apps with 10 duplicate variants each
    const src = ["start-menu", "registry", "app-paths", "uwp"][i % 4];

    if (src === "uwp") {
      rawItems.push({
        name: `UWP Package ${appIndex}`,
        appId: `Vendor.Package${appIndex}_8wekyb3d8bbwe!App`,
        type: "uwp",
        source: "uwp",
      });
    } else if (src === "registry") {
      rawItems.push({
        name: `Win32 App ${appIndex} (64-bit)`,
        displayIcon: `C:\\Program Files\\App${appIndex}\\app.exe,0`,
        publisher: "Vendor Corp",
        version: "2.4.1",
        source: "registry",
      });
    } else if (src === "app-paths") {
      rawItems.push({
        alias: `app${appIndex}.exe`,
        target: `C:\\Program Files\\App${appIndex}\\app.exe`,
        source: "app-paths",
      });
    } else {
      rawItems.push({
        name: `Win32 App ${appIndex}`,
        target: `C:\\Program Files\\App${appIndex}\\app.exe`,
        args: "--start",
        source: "start-menu",
        type: "win32",
      });
    }
  }

  const tDedup = performance.now();
  const deduped = deduplicateCatalog(rawItems);
  const dedupDuration = performance.now() - tDedup;

  assertTest(
    `10,000 raw items deduplication completes in < 150ms (Actual: ${dedupDuration.toFixed(2)}ms)`,
    dedupDuration < 150,
    `Duration was ${dedupDuration.toFixed(2)}ms`
  );
  assertTest(
    `10,000 raw items correctly collapsed into <= 1000 unique apps (Actual: ${deduped.length})`,
    deduped.length <= 1000
  );

  // Conflicting names on identical executable path
  const conflictingRaw = [
    { name: "My Favorite Editor", target: "C:\\Tools\\editor.exe", source: "start-menu" },
    { name: "Editor v1.0", target: "C:\\Tools\\editor.exe", source: "registry", displayIcon: "C:\\Tools\\editor.exe" },
    { name: "Code Editor Pro", target: "C:\\Tools\\editor.exe", source: "start-menu" },
  ];
  const dedupConflicting = deduplicateCatalog(conflictingRaw);
  assertTest("Conflicting shortcuts pointing to identical path collapse to 1 catalog entry", dedupConflicting.length === 1);
  assertTest("Conflicting shortcuts retain alternate names in aliases", dedupConflicting[0].aliases.length >= 2);
} catch (err) {
  assertTest("Discovery deduplication stress", false, `Threw: ${err.message}`);
}

// ============================================================================
// SUITE 5: Hierarchical Scoring & Ranking Invariants
// ============================================================================
console.log("\nSUITE 5: Hierarchical Scoring & Ranking Invariants");

// 5.1 Exact Executable Search via searchEngine.search()
{
  const chromeApp = {
    id: "chrome",
    name: "Google Chrome",
    launch: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    target: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  };
  const searchExeRes = engine.search("chrome.exe", [chromeApp]);
  assertTest(
    "Multi-Target Search: Searching 'chrome.exe' matches Google Chrome via its executable path",
    searchExeRes.length > 0 && searchExeRes[0].name === "Google Chrome",
    searchExeRes.length === 0 ? "Result was empty [] because search() mapped 'launch' to 'launchTarget' while calculateScore expects 'launch' or 'target'" : ""
  );
}

// 5.2 Item Aliases Search via searchEngine.search()
{
  const photoApp = {
    id: "affinity",
    name: "Affinity Photo",
    launch: "C:\\Apps\\photo.exe",
    target: "C:\\Apps\\photo.exe",
    aliases: ["photoeditor", "ap"],
  };
  const searchAliasRes = engine.search("photoeditor", [photoApp]);
  assertTest(
    "Multi-Target Search: Searching custom item alias 'photoeditor' matches Affinity Photo",
    searchAliasRes.length > 0 && searchAliasRes[0].name === "Affinity Photo",
    searchAliasRes.length === 0 ? "Result was empty [] because calculateScore only checks item.aliases if query is in hardcoded DEFAULT_ALIASES" : ""
  );
}

// 5.3 Invariant: Exact Match Must Outrank Prefix Match (0 boosts)
{
  const exactApp = { name: "Spotify", launch: "C:\\spotify.exe", target: "C:\\spotify.exe" };
  const prefixApp = { name: "Spotify Downloader", launch: "C:\\downloader.exe", target: "C:\\downloader.exe" };
  const sExact = calculateScore("spotify", exactApp);
  const sPrefix = calculateScore("spotify", prefixApp);
  assertTest(
    "Scoring Invariant 1A: Exact match beats Prefix match with identical 0 boosts",
    sExact.totalScore > sPrefix.totalScore,
    `Exact: ${sExact.totalScore} vs Prefix: ${sPrefix.totalScore}`
  );
}

// 5.4 Invariant: Exact Match Must Outrank Prefix Match Even With Max Secondary Boosts
{
  const exactApp = {
    name: "Spotify",
    launch: "C:\\spotify.exe",
    target: "C:\\spotify.exe",
    launchCount: 0,
    lastLaunch: 0,
    isFavorite: false,
  };
  const prefixApp = {
    name: "Spotify Downloader",
    launch: "C:\\downloader.exe",
    target: "C:\\downloader.exe",
    launchCount: 100, // Max frequency boost (+120)
    lastLaunch: Date.now(), // Max recency boost (+150)
    isFavorite: true, // Favorite boost (+80)
    kind: "window", // Running window boost (+50)
  };
  const sExact = calculateScore("spotify", exactApp);
  const sPrefix = calculateScore("spotify", prefixApp);
  assertTest(
    "Scoring Invariant 1B: Exact match MUST ALWAYS outrank Prefix match, even when prefix has maximum boosts",
    sExact.totalScore > sPrefix.totalScore,
    `Exact score (0 boosts): ${sExact.totalScore} vs Prefix score (MAX boosts): ${sPrefix.totalScore}`
  );
}

// 5.5 Invariant: Exact Match Must Outrank Fuzzy Match Even With Max Secondary Boosts
{
  const exactApp = {
    name: "Slack",
    launch: "C:\\slack.exe",
    target: "C:\\slack.exe",
    launchCount: 0,
    lastLaunch: 0,
    isFavorite: false,
  };
  const fuzzyApp = {
    name: "Special Long Action Clock Kernel", // S-l-a-c-k subsequence match
    launch: "C:\\kernel.exe",
    target: "C:\\kernel.exe",
    launchCount: 100,
    lastLaunch: Date.now(),
    isFavorite: true,
    kind: "window",
  };
  const sExact = calculateScore("slack", exactApp);
  const sFuzzy = calculateScore("slack", fuzzyApp);
  assertTest(
    "Scoring Invariant 1C: Exact match MUST ALWAYS outrank Fuzzy match, even when fuzzy has maximum boosts",
    sExact.totalScore > sFuzzy.totalScore,
    `Exact score (0 boosts): ${sExact.totalScore} vs Fuzzy score (MAX boosts): ${sFuzzy?.totalScore}`
  );
}

// 5.6 Invariant: Exact App Names in DEFAULT_ALIASES Must Yield 'exact_name' Tier (1000)
{
  const calcApp = { name: "Calculator", launch: "C:\\calc.exe", target: "C:\\calc.exe" };
  const sCalc = calculateScore("calculator", calcApp);
  assertTest(
    "Scoring Invariant 2A: Querying exact name 'calculator' yields 'exact_name' tier (1000) instead of 'alias' (950)",
    sCalc.matchType === "exact_name" && sCalc.baseMatchScore === 1000,
    `Actual matchType: '${sCalc.matchType}', baseScore: ${sCalc.baseMatchScore}`
  );

  const notepadApp = { name: "Notepad", launch: "C:\\notepad.exe", target: "C:\\notepad.exe" };
  const sNotepad = calculateScore("notepad", notepadApp);
  assertTest(
    "Scoring Invariant 2B: Querying exact name 'notepad' yields 'exact_name' tier (1000) instead of 'alias' (950)",
    sNotepad.matchType === "exact_name" && sNotepad.baseMatchScore === 1000,
    `Actual matchType: '${sNotepad.matchType}', baseScore: ${sNotepad.baseMatchScore}`
  );
}

// 5.7 Invariant: Exact 'Notepad' Must Outrank 'Notepad++' on Query 'notepad'
{
  const notepadApp = { name: "Notepad", launch: "C:\\notepad.exe", target: "C:\\notepad.exe" };
  const notepadPlusApp = { name: "Notepad++", launch: "C:\\notepad++.exe", target: "C:\\notepad++.exe" };
  const sNotepad = calculateScore("notepad", notepadApp);
  const sNotepadPlus = calculateScore("notepad", notepadPlusApp);
  assertTest(
    "Scoring Invariant 2C: Exact 'Notepad' MUST outrank 'Notepad++' on query 'notepad'",
    sNotepad.totalScore > sNotepadPlus.totalScore,
    `'Notepad' score: ${sNotepad.totalScore} vs 'Notepad++' score: ${sNotepadPlus.totalScore} (Tied because alias matched both!)`
  );
}

console.log("\n===============================================================");
console.log(`  STRESS TEST RUN FINISHED: ${suiteStats.passed}/${suiteStats.total} PASSED, ${suiteStats.failed} FAILED`);
console.log("===============================================================\n");

if (suiteStats.failed > 0) {
  console.log("SUMMARY OF CONFIRMED INVARIANT VIOLATIONS & VULNERABILITIES:");
  suiteStats.failures.forEach((f, idx) => {
    console.log(`  ${idx + 1}. ${f.name}`);
    if (f.details) console.log(`     Details: ${f.details}`);
  });
}
