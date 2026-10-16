"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { EventEmitter } = require("node:events");

const {
  normalizeExePath,
  normalizeAppName,
  deduplicateCatalog,
} = require("../src/services/launcher/discovery");

const {
  getFallbackIcon,
  extractCatalogIcons,
  saveAppCache,
  loadAppCache,
} = require("../src/services/launcher/iconExtractor");

const {
  extractAcronym,
  scoreSubsequence,
  calculateScore,
  createSearchEngine,
  DEFAULT_ALIASES,
} = require("../src/services/launcher/searchEngine");

const {
  createWindowManager,
  WINDOW_ACTIVATION_CODES,
} = require("../src/services/launcher/windowManager");

const {
  createLauncherEngine,
} = require("../src/services/launcher/index");

test("discovery - normalizeExePath handles quotes, icon indices, slashes, and env vars", () => {
  // Quoted paths
  assert.strictEqual(
    normalizeExePath('"C:\\Program Files\\App\\app.exe"'),
    "c:\\program files\\app\\app.exe"
  );
  assert.strictEqual(
    normalizeExePath("'C:/Games/game.exe'"),
    "c:\\games\\game.exe"
  );

  // Icon indices
  assert.strictEqual(
    normalizeExePath("C:\\Windows\\System32\\shell32.dll,0"),
    "c:\\windows\\system32\\shell32.dll"
  );
  assert.strictEqual(
    normalizeExePath('"C:\\Program Files\\Office\\app.exe",-1'),
    "c:\\program files\\office\\app.exe"
  );

  // Forward slashes
  assert.strictEqual(
    normalizeExePath("C:/Tools/Git/bin/git.exe"),
    "c:\\tools\\git\\bin\\git.exe"
  );

  // Environment variables
  const tempDir = process.env.TEMP || "C:\\TEMP";
  const normalizedTemp = tempDir.replace(/\//g, "\\").toLowerCase();
  assert.strictEqual(
    normalizeExePath("%TEMP%\\tool.exe"),
    `${normalizedTemp}\\tool.exe`
  );
});

test("discovery - normalizeAppName strips architecture tags and version strings", () => {
  assert.strictEqual(normalizeAppName("Google Chrome (64-bit)"), "Google Chrome");
  assert.strictEqual(normalizeAppName("Visual Studio Code (x86)"), "Visual Studio Code");
  assert.strictEqual(normalizeAppName("Upscayl 2.15.0"), "Upscayl");
  assert.strictEqual(normalizeAppName("OBS Studio v30.1.2"), "OBS Studio");
  assert.strictEqual(normalizeAppName("7-Zip 23.01 (x64)"), "7-Zip");
  assert.strictEqual(normalizeAppName("Slack"), "Slack");
});

test("discovery - deduplicateCatalog collapses duplicates and merges metadata", () => {
  const rawData = [
    // Start menu entry
    {
      name: "Google Chrome",
      target: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: "--profile-directory=Default",
      source: "start-menu",
      type: "win32",
    },
    // Registry entry for the same app
    {
      name: "Google Chrome 120.0 (64-bit)",
      displayIcon: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe,0",
      publisher: "Google LLC",
      version: "120.0.6099.130",
      source: "registry",
    },
    // App Paths alias for the same app
    {
      alias: "chrome.exe",
      target: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      source: "app-paths",
    },
    // UWP entry
    {
      name: "Calculator",
      appId: "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App",
      type: "uwp",
      source: "uwp",
    },
    // Duplicate UWP entry
    {
      name: "Calculator",
      appId: "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App",
      type: "uwp",
      source: "uwp",
    },
  ];

  const deduped = deduplicateCatalog(rawData);

  // Should have exactly 2 unique apps: Calculator and Google Chrome
  assert.strictEqual(deduped.length, 2);

  const chrome = deduped.find((a) => a.id.includes("chrome"));
  assert.ok(chrome);
  assert.strictEqual(chrome.name, "Google Chrome"); // Start Menu name preserved
  assert.strictEqual(chrome.publisher, "Google LLC"); // Merged from Registry
  assert.strictEqual(chrome.version, "120.0.6099.130"); // Merged from Registry
  assert.ok(chrome.aliases.includes("chrome.exe")); // Merged from App Paths
  assert.strictEqual(chrome.args, "--profile-directory=Default");

  const calc = deduped.find((a) => a.type === "uwp");
  assert.ok(calc);
  assert.strictEqual(calc.appId, "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App");
  assert.strictEqual(calc.launch, "shell:AppsFolder\\Microsoft.WindowsCalculator_8wekyb3d8bbwe!App");
});

test("iconExtractor - getFallbackIcon and cache persistence", () => {
  const winIcon = getFallbackIcon("win32");
  const uwpIcon = getFallbackIcon("uwp");
  assert.ok(winIcon.startsWith("data:image/svg+xml;base64,"));
  assert.ok(uwpIcon.startsWith("data:image/svg+xml;base64,"));
  assert.notStrictEqual(winIcon, uwpIcon);

  // Test atomic app-cache save and load
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-cache-test-"));
  const cacheFile = path.join(tmpDir, "app-cache.json");

  try {
    const sampleCatalog = [
      { id: "win32-chrome", name: "Google Chrome", launch: "C:\\chrome.exe", type: "win32" },
      { id: "uwp-calc", name: "Calculator", launch: "shell:AppsFolder\\calc", type: "uwp" },
    ];

    saveAppCache(cacheFile, sampleCatalog);
    assert.ok(fs.existsSync(cacheFile));

    const loaded = loadAppCache(cacheFile);
    assert.ok(loaded);
    assert.strictEqual(loaded.count, 2);
    assert.strictEqual(loaded.apps.length, 2);
    assert.strictEqual(loaded.apps[0].name, "Google Chrome");

    // Corrupted file recovery
    fs.writeFileSync(cacheFile, "CORRUPT_JSON_{{", "utf8");
    assert.strictEqual(loadAppCache(cacheFile), null);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

test("iconExtractor - extractCatalogIcons preserves existing cached icons", async () => {
  const catalog = [
    {
      id: "app-1",
      name: "Cached App",
      type: "win32",
      icon: "data:image/png;base64,ALREADY_CACHED_ICON",
    },
    {
      id: "app-2",
      name: "Fallback App",
      type: "win32",
      launch: "C:\\non_existent_path.exe",
    },
  ];

  const enriched = await extractCatalogIcons(catalog, { concurrency: 2 });
  assert.strictEqual(enriched[0].icon, "data:image/png;base64,ALREADY_CACHED_ICON");
  assert.ok(enriched[1].icon.startsWith("data:image/"));
});

test("searchEngine - acronym extraction and subsequence scoring", () => {
  assert.strictEqual(extractAcronym("Windows Terminal"), "wt");
  assert.strictEqual(extractAcronym("Visual Studio Code"), "vsc");
  assert.strictEqual(extractAcronym("Google Chrome"), "gc");
  assert.strictEqual(extractAcronym("PowerShell"), "ps");
  assert.strictEqual(extractAcronym(""), "");

  // Subsequence scoring
  assert.ok(scoreSubsequence("term", "windows terminal") > 0);
  assert.ok(scoreSubsequence("wt", "windows terminal") > 0);
  assert.ok(scoreSubsequence("calc", "calculator") > 0);
  assert.strictEqual(scoreSubsequence("xyz", "calculator"), 0);
  assert.strictEqual(scoreSubsequence("toolongquery", "short"), 0);

  // Consecutive matches should score higher than fragmented matches
  const consecutiveScore = scoreSubsequence("calc", "calculator");
  const fragmentedScore = scoreSubsequence("cltr", "calculator");
  assert.ok(consecutiveScore > fragmentedScore);
});

test("searchEngine - hierarchical scoring tiers and secondary boosts", () => {
  const now = Date.now();

  const chromeApp = {
    name: "Google Chrome",
    target: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    aliases: ["chrome", "google chrome"],
  };

  const wtApp = {
    name: "Windows Terminal",
    target: "wt.exe",
    _acronym: "wt",
  };

  const calcApp = {
    name: "Calculator",
    target: "calc.exe",
  };

  // 1. Alias Match: "wt" -> Windows Terminal
  const wtScore = calculateScore("wt", wtApp, {}, now);
  assert.ok(wtScore);
  assert.ok(wtScore.baseMatchScore >= 850);

  // 2. Alias Match: "calc" -> Calculator
  const calcScore = calculateScore("calc", calcApp, {}, now);
  assert.ok(calcScore);
  assert.strictEqual(calcScore.matchType, "alias");
  assert.strictEqual(calcScore.baseMatchScore, 950);

  // 3. Exact Name Match: "google chrome"
  const exactScore = calculateScore("google chrome", chromeApp, {}, now);
  assert.ok(exactScore);
  assert.strictEqual(exactScore.matchType, "exact_name");
  assert.strictEqual(exactScore.baseMatchScore, 1000);

  // 4. Prefix Match on Name: "google"
  const prefixScore = calculateScore("google", chromeApp, {}, now);
  assert.ok(prefixScore);
  assert.strictEqual(prefixScore.matchType, "prefix_name");
  assert.ok(prefixScore.baseMatchScore >= 750 && prefixScore.baseMatchScore <= 800);

  // 5. Word Boundary Match: "chrome"
  const wordScore = calculateScore("chrome", chromeApp, {}, now);
  assert.ok(wordScore);

  // 6. Recency and frequency boosts
  const activeApp = {
    ...chromeApp,
    launchCount: 10,
    lastLaunch: now - 3600000, // 1 hour ago
    isFavorite: true,
  };
  const activeScore = calculateScore("google chrome", activeApp, {}, now);
  assert.ok(activeScore.freqBoost > 0);
  assert.ok(activeScore.recencyBoost > 100);
  assert.ok(activeScore.totalScore > exactScore.totalScore);
});

test("searchEngine - full search ranking and empty query behavior", () => {
  const engine = createSearchEngine();

  const catalog = [
    { id: "1", name: "Google Chrome", launch: "chrome.exe", isFavorite: true },
    { id: "2", name: "Calculator", launch: "calc.exe", isFavorite: false },
    { id: "3", name: "Windows Terminal", launch: "wt.exe", isFavorite: false },
    { id: "4", name: "Visual Studio Code", launch: "code.exe", isFavorite: true },
  ];

  const runningWindows = [
    { hWnd: "1001", title: "Project - Visual Studio Code", processName: "Code", isMinimized: false },
  ];

  // Empty query: Returns running window + favorites first
  const emptyResults = engine.search("", catalog, runningWindows);
  assert.ok(emptyResults.length > 0);
  assert.strictEqual(emptyResults[0].kind, "window");
  assert.strictEqual(emptyResults[1].isFavorite, true);

  // Search "calc" -> Calculator is #1
  const calcResults = engine.search("calc", catalog, runningWindows);
  assert.ok(calcResults.length > 0);
  assert.strictEqual(calcResults[0].name, "Calculator");

  // Search "code" -> Visual Studio Code (both app and window)
  const codeResults = engine.search("code", catalog, runningWindows);
  assert.ok(codeResults.length >= 2);
  assert.ok(codeResults.some((r) => r.name.includes("Visual Studio Code")));
});

test("windowManager - handles activation error codes and mock execution", async () => {
  const mockWindowsList = [
    { hWnd: "2001", title: "Document - Word", pid: 5000, processName: "WINWORD", className: "OpusApp", isMinimized: true },
    { hWnd: "2002", title: "Browser - Chrome", pid: 6000, processName: "chrome", className: "Chrome_WidgetWin_1", isMinimized: false },
  ];

  const manager = createWindowManager({
    mockWindows: () => mockWindowsList,
    mockActivate: (hWnd) => {
      if (hWnd === "2001") return { success: true, code: WINDOW_ACTIVATION_CODES.SUCCESS };
      if (hWnd === "9999") return { success: false, code: WINDOW_ACTIVATION_CODES.WINDOW_NOT_FOUND, error: "Window not found" };
      if (hWnd === "7777") return { success: false, code: WINDOW_ACTIVATION_CODES.ELEVATION_REQUIRED, error: "Elevated" };
      return { success: false, code: WINDOW_ACTIVATION_CODES.FOREGROUND_RESTRICTED, error: "Restricted" };
    },
  });

  const windows = await manager.getRunningWindows();
  assert.strictEqual(windows.length, 2);
  assert.strictEqual(windows[0].isMinimized, true);

  // Successful activation
  const resSuccess = await manager.activateWindow("2001");
  assert.strictEqual(resSuccess.success, true);
  assert.strictEqual(resSuccess.code, WINDOW_ACTIVATION_CODES.SUCCESS);

  // Elevation required
  const resElev = await manager.activateWindow("7777");
  assert.strictEqual(resElev.success, false);
  assert.strictEqual(resElev.code, WINDOW_ACTIVATION_CODES.ELEVATION_REQUIRED);

  // Window not found
  const resNotFound = await manager.activateWindow("9999");
  assert.strictEqual(resNotFound.success, false);
  assert.strictEqual(resNotFound.code, WINDOW_ACTIVATION_CODES.WINDOW_NOT_FOUND);
});

test("launcherEngine - unified facade integrates catalog, search, and favorites", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-facade-test-"));

  try {
    const engine = createLauncherEngine({
      userDataPath: tmpDir,
      discovery: {
        getCatalog: async () => [
          { id: "app-1", name: "Slack", launch: "slack.exe", type: "win32" },
          { id: "app-2", name: "Spotify", launch: "spotify.exe", type: "win32" },
        ],
        reindex: async () => 2,
      },
      mockWindows: () => [
        { hWnd: "3001", title: "General - Slack", pid: 1234, processName: "slack", className: "Slack", isMinimized: false },
      ],
      mockActivate: () => ({ success: true, code: "SUCCESS" }),
    });

    const catalog = await engine.getCatalog();
    assert.strictEqual(catalog.length, 2);

    // Set favorites
    await engine.setFavorites(["slack.exe"]);
    const favs = await engine.getFavorites();
    assert.deepStrictEqual(favs, ["slack.exe"]);

    // Search query
    const results = await engine.searchApps("slack");
    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].name.includes("Slack"), true);

    // Running windows
    const running = await engine.getRunningWindows();
    assert.strictEqual(running.length, 1);
    assert.strictEqual(running[0].title, "General - Slack");

    // Activate window
    const actRes = await engine.activateWindow("3001");
    assert.strictEqual(actRes.success, true);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

test("searchEngine - multi-target search by executable and dynamic item aliases", () => {
  const engine = createSearchEngine();
  const catalog = [
    {
      id: "chrome",
      name: "Google Chrome",
      launch: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      target: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    },
    {
      id: "photo",
      name: "Affinity Photo",
      launch: "C:\\Apps\\photo.exe",
      target: "C:\\Apps\\photo.exe",
      aliases: ["photoeditor", "ap"],
    },
  ];

  // 1. Searching by executable name matches Google Chrome
  const exeResults = engine.search("chrome.exe", catalog);
  assert.ok(exeResults.length > 0);
  assert.strictEqual(exeResults[0].name, "Google Chrome");

  // 2. Searching by dynamic item alias matches Affinity Photo
  const aliasResults = engine.search("photoeditor", catalog);
  assert.ok(aliasResults.length > 0);
  assert.strictEqual(aliasResults[0].name, "Affinity Photo");
});

test("searchEngine - exact match priority, token boundary matching and scoring invariants", () => {
  // 1. Exact name evaluated before alias
  const calcScore = calculateScore("calculator", { name: "Calculator", launch: "C:\\calc.exe" });
  assert.strictEqual(calcScore.matchType, "exact_name");
  assert.strictEqual(calcScore.baseMatchScore, 1000);

  const notepadScore = calculateScore("notepad", { name: "Notepad", launch: "C:\\notepad.exe" });
  assert.strictEqual(notepadScore.matchType, "exact_name");
  assert.strictEqual(notepadScore.baseMatchScore, 1000);

  // 2. Token boundary avoids loose matches (Notepad++ does not match alias 'notepad')
  const notepadPlusScore = calculateScore("notepad", { name: "Notepad++", launch: "C:\\notepad++.exe" });
  assert.strictEqual(notepadPlusScore.matchType, "prefix_name");
  assert.ok(notepadScore.totalScore > notepadPlusScore.totalScore);

  // 3. Exact match with 0 boosts ALWAYS outranks prefix match with max boosts
  const exactApp = { name: "Spotify", launch: "C:\\spotify.exe", launchCount: 0, lastLaunch: 0, isFavorite: false };
  const prefixApp = {
    name: "Spotify Downloader",
    launch: "C:\\dl.exe",
    launchCount: 100,
    lastLaunch: Date.now(),
    isFavorite: true,
    kind: "window",
  };
  const sExact = calculateScore("spotify", exactApp);
  const sPrefix = calculateScore("spotify", prefixApp);
  assert.ok(sExact.totalScore > sPrefix.totalScore);

  // 4. Exact match with 0 boosts ALWAYS outranks fuzzy match with max boosts
  const fuzzyApp = {
    name: "Special Long Action Clock Kernel",
    launch: "C:\\kernel.exe",
    launchCount: 100,
    lastLaunch: Date.now(),
    isFavorite: true,
    kind: "window",
  };
  const sFuzzy = calculateScore("slack", fuzzyApp);
  const sExactSlack = calculateScore("slack", { name: "Slack", launch: "C:\\slack.exe", launchCount: 0 });
  assert.ok(sExactSlack.totalScore > sFuzzy.totalScore);
});

test("searchEngine - defensive input handling on null and corrupted payloads", () => {
  const engine = createSearchEngine();

  // Null & undefined catalog
  assert.deepStrictEqual(engine.search("test", null), []);
  assert.deepStrictEqual(engine.search("test", undefined), []);

  // Null runningWindows
  assert.ok(Array.isArray(engine.search("test", [{ id: "1", name: "Test" }], null)));

  // Corrupted catalog items
  const corruptItems = [
    null,
    undefined,
    {},
    { id: "empty" },
    { name: null, launch: null },
    { name: "Valid App", launch: "C:\\valid.exe" },
  ];
  const corruptRes = engine.search("valid", corruptItems);
  assert.strictEqual(corruptRes.length, 1);
  assert.strictEqual(corruptRes[0].name, "Valid App");

  // Empty query sort with missing item names
  const missingNameRes = engine.search("", [{ id: "1", name: "Zeta" }, { id: "2" }, { id: "3", name: "Alpha" }]);
  assert.ok(Array.isArray(missingNameRes));
});

test("launcherEngine - launchApp resolves friendly app names and aliases against catalog", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-resolve-test-"));
  const spawnedTargets = [];

  try {
    const spotifyExe = path.join(tmpDir, "Spotify.exe");
    const codeExe = path.join(tmpDir, "code.exe");
    fs.writeFileSync(spotifyExe, "");
    fs.writeFileSync(codeExe, "");

    const engine = createLauncherEngine({
      userDataPath: tmpDir,
      spawn: (target, args, opts) => {
        spawnedTargets.push({ target, args, opts });
        const emitter = new EventEmitter();
        emitter.unref = () => {};
        return emitter;
      },
      discovery: {
        getCatalog: async () => [
          { id: "app-spotify", name: "Spotify", launch: spotifyExe, type: "win32" },
          { id: "app-calc", name: "Calculator", launch: "shell:AppsFolder\\Microsoft.WindowsCalculator_8wekyb3d8bbwe!App", type: "uwp" },
          { id: "app-code", name: "Visual Studio Code", launch: codeExe, aliases: ["vscode"], type: "win32" },
        ],
        reindex: async () => 3,
      },
    });

    await engine.getCatalog();

    // 1. Friendly name "Spotify" resolves to full path
    const resSpotify = await engine.launchApp("Spotify");
    assert.strictEqual(resSpotify.success, true);
    assert.strictEqual(spawnedTargets[0].target, spotifyExe);

    // 2. Friendly alias "vscode" resolves to full path
    const resCode = await engine.launchApp("vscode");
    assert.strictEqual(resCode.success, true);
    assert.strictEqual(spawnedTargets[1].target, codeExe);

    // 3. Friendly name "Calculator" resolves to UWP shell URI
    const resCalc = await engine.launchApp("Calculator");
    assert.strictEqual(resCalc.success, true);
    assert.strictEqual(spawnedTargets[2].target, "explorer.exe");
    assert.ok(spawnedTargets[2].args.includes("shell:AppsFolder\\Microsoft.WindowsCalculator_8wekyb3d8bbwe!App"));
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

