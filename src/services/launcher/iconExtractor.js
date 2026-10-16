"use strict";

const fs = require("fs");
const path = require("path");

// Clean inline fallback SVG icons encoded as base64 data URLs
const WIN32_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
const UWP_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>`;

const FALLBACK_ICONS = {
  win32: `data:image/svg+xml;base64,${Buffer.from(WIN32_FALLBACK_SVG).toString("base64")}`,
  uwp: `data:image/svg+xml;base64,${Buffer.from(UWP_FALLBACK_SVG).toString("base64")}`,
};

const GENERIC_DRIVE_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAADc0lEQVR4nOyYTU/bMBjHH5emNKQvKRVs0jThXvgOHLkwvsPuu+2+w+67TjvuuvM+AssOkzpOfIJprfamMsoYlUCVsD0/T+LUCQmFdYFO6h9Sp7Yb//x/HtuUMsy5yjDnigE33w4UKAAhlS4Vk/qVKWBCStV//KC08eabUlip+8QldtX3P55sMChIMaCSAFLiyMBsCJBAg0sRwujmsIwhoVDFgEJbh45JGpUAY1AzAeNuDK9fhCoW0XIwBEIIG1RGgNpdumdWHywL5kuGmAaTlH+JPEMJoSi+lAXKhF8xuK0QU45ZrpkFABDlv8TcVFGYw3sNqPtCobIclGCHmManwY2DEUmUClKmJlCQin36P1Ds4P3XfRmuTMqzSRj179HTDvNffpImzOgc7TjhYlJnzzZLUJAmJ0ly8MRqpWYRbT/UBycyCXWRmuyDmHAy3HjRQBYNjmW3e8AffVAseYpEe6QG7X/5fn1K/cHz8/Per+Of21tbW71p3ePQKBECkSO41QhTSvBbXkD8Ily15LKQ0UKBm4kxqLou91trQbfb5dO6x4Ay2jIwrAhCZeRW1V3h8fGmLxEde/GEbszIwF1xebO1GgRTICcO4uDaFSXCo4y2E3RMX6VSKZ4AOod5aDv5NyJI1+NrTQ0Z5EMmHKSjK3IoDGdYUju9lzAJNbbBTBs1TtzzVnh73deQAc/qc2kfxI6ra/eCeq3Ol5aW4DYkhIDR6ah3PBxsa/XstlIartVeD+pe7dbgUDhWvVHjrdX1S04m/qL+uL8fvNvb43B34ru7u4EuO6YiAfj75IQPh0O6xyTGxWBKuy7dnla63n5Out7I1B8eHnL7WQnAarUKlUoFZtE0mPSE0v1c14VcwOXlZQLED+DBe9Y5o+PN63v6RGGZM7YHyHL0qijY702JDLmA6CBeqBEfQedVBw5OD6DyvAK1zzXIU1Y6XNU3DW/fm/EzAR3HiWcwrozBGTngfHXIVay3HzZNWbDT8hmlx1JXASoNQhTtQRuOXhzBQ/3TGDR0/CFzQWQpL99MWzpH7ftyOflVPfFONzLjIH7IHYQJq5zrrda8urxJZPVDhlxAffSoRqPBxuMx3IV836fjz1YCsNls9nd2dnj0XbKorwOZz0Y38bq4uHifqIc51//zz6N51QJwVi0AZ9UCcFYtAGfVHwAAAP//J0lmmwAAAAZJREFUAwCmQsi0YlNeygAAAABJRU5ErkJggg==';

/**
 * Returns a fallback icon for the specified application type.
 * @param {'win32' | 'uwp'} [type]
 * @returns {string}
 */
function getFallbackIcon(type = "win32") {
  return FALLBACK_ICONS[type] || FALLBACK_ICONS.win32;
}

/**
 * Extracts a high-resolution icon for a Win32 executable.
 * @param {string} targetPath
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
async function extractWin32Icon(targetPath, options = {}) {
  if (!targetPath) return getFallbackIcon("win32");

  // Clean path of quotes or icon index
  const cleanPath = targetPath.replace(/^["']|["']$/g, "").replace(/,\s*-?\d+$/, "").trim();
  if (!cleanPath) return getFallbackIcon("win32");

  // If Electron's app.getFileIcon is provided
  if (typeof options.getFileIcon === "function") {
    try {
      const nativeImg = await options.getFileIcon(cleanPath, { size: "large" });
      if (nativeImg && !nativeImg.isEmpty()) {
        const dataUrl = nativeImg.toDataURL();
        if (dataUrl && dataUrl.startsWith("data:")) {
          return dataUrl;
        }
      }
    } catch (_) {}
  }

  // Check if file is a direct .ico
  if (cleanPath.toLowerCase().endsWith(".ico")) {
    try {
      if (fs.existsSync(cleanPath)) {
        const buf = fs.readFileSync(cleanPath);
        return `data:image/x-icon;base64,${buf.toString("base64")}`;
      }
    } catch (_) {}
  }

  return getFallbackIcon("win32");
}

/**
 * Resolves a packaged UWP logo file from its package directory.
 * Searches for highest available resolution targetsize or scale variant in Assets.
 * @param {string} installLocation
 * @param {string} logoRelPath
 * @returns {string}
 */
function resolveUwpIcon(installLocation, logoRelPath) {
  if (!installLocation || !logoRelPath) return getFallbackIcon("uwp");

  try {
    const fullLogoPath = path.join(installLocation, logoRelPath);
    if (fs.existsSync(fullLogoPath)) {
      const buf = fs.readFileSync(fullLogoPath);
      return `data:image/png;base64,${buf.toString("base64")}`;
    }

    const dir = path.dirname(fullLogoPath);
    const baseName = path.basename(logoRelPath, path.extname(logoRelPath));

    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);

      // Prioritize high-resolution unplated targetsize assets
      const priorityPatterns = [
        new RegExp(`^${baseName}\\.targetsize-256(?:_altform-unplated)?\\.png$`, "i"),
        new RegExp(`^${baseName}\\.targetsize-96(?:_altform-unplated)?\\.png$`, "i"),
        new RegExp(`^${baseName}\\.scale-200\\.png$`, "i"),
        new RegExp(`^${baseName}\\.targetsize-48(?:_altform-unplated)?\\.png$`, "i"),
        new RegExp(`^${baseName}\\.scale-150\\.png$`, "i"),
        new RegExp(`^${baseName}\\.targetsize-32(?:_altform-unplated)?\\.png$`, "i"),
        new RegExp(`^${baseName}\\.scale-100\\.png$`, "i"),
        new RegExp(`^${baseName}\\.(?:png|jpg)$`, "i"),
      ];

      for (const pattern of priorityPatterns) {
        const match = files.find((f) => pattern.test(f));
        if (match) {
          const matchPath = path.join(dir, match);
          const buf = fs.readFileSync(matchPath);
          return `data:image/png;base64,${buf.toString("base64")}`;
        }
      }
    }
  } catch (_) {}

  return getFallbackIcon("uwp");
}

/**
 * Extracts a UWP icon from its package AppxManifest.xml and Assets folder.
 * @param {string} appId
 * @param {string} [installLocation]
 * @returns {string}
 */
function extractUwpIconFromPackage(appId, installLocation) {
  if (!installLocation) return getFallbackIcon("uwp");

  try {
    const manifestPath = path.join(installLocation, "AppxManifest.xml");
    if (fs.existsSync(manifestPath)) {
      const xml = fs.readFileSync(manifestPath, "utf8");
      // Look for Square44x44Logo or Square150x150Logo
      const logoMatch =
        xml.match(/Square44x44Logo\s*=\s*"([^"]+)"/i) ||
        xml.match(/Square150x150Logo\s*=\s*"([^"]+)"/i) ||
        xml.match(/Logo\s*=\s*"([^"]+)"/i);

      if (logoMatch && logoMatch[1]) {
        return resolveUwpIcon(installLocation, logoMatch[1]);
      }
    }
  } catch (_) {}

  // Try standard Assets default logo locations
  const commonAssets = [
    "Assets\\Square44x44Logo.png",
    "Assets\\Square150x150Logo.png",
    "Assets\\Logo.png",
    "Assets\\AppList.png",
  ];

  for (const asset of commonAssets) {
    const icon = resolveUwpIcon(installLocation, asset);
    if (icon && !icon.startsWith("data:image/svg+xml")) {
      return icon;
    }
  }

  return getFallbackIcon("uwp");
}

/**
 * Enriches a catalog array with extracted icons with bounded concurrency.
 * Preserves existing valid icons to avoid redundant disk I/O.
 * @param {Array<Object>} catalog
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
async function extractCatalogIcons(catalog, options = {}) {
  if (!Array.isArray(catalog)) return [];

  const concurrency = options.concurrency || 10;
  const enriched = [...catalog];

  // Map of existing icons for fast lookup
  const existingIconMap = new Map();
  if (Array.isArray(options.existingCatalog)) {
    for (const item of options.existingCatalog) {
      if (item && item.id && item.icon && typeof item.icon === "string" && !item.icon.includes("svg+xml") && item.icon !== GENERIC_DRIVE_ICON) {
        existingIconMap.set(item.id, item.icon);
        if (item.launch) existingIconMap.set(item.launch, item.icon);
      }
    }
  }

  let index = 0;
  async function worker() {
    while (index < enriched.length) {
      const i = index++;
      const app = enriched[i];
      if (!app) continue;

      // 1. Keep existing high-res icon if already cached (ignore bad drive icons)
      if (app.icon && typeof app.icon === "string" && !app.icon.includes("svg+xml") && app.icon !== GENERIC_DRIVE_ICON) {
        continue;
      }
      const cached = existingIconMap.get(app.id) || (app.launch ? existingIconMap.get(app.launch) : null);
      if (cached && cached !== GENERIC_DRIVE_ICON) {
        app.icon = cached;
        continue;
      }

      // 2. Extract based on app type
      if (app.type === "uwp") {
        app.icon = extractUwpIconFromPackage(app.appId, app.installLocation);
      } else {
        let iconSource = null;
        if (app.iconLocation && typeof app.iconLocation === "string") {
          const cleaned = app.iconLocation.replace(/,\s*-?\d+$/, "").replace(/^["']|["']$/g, "").trim();
          if (cleaned && fs.existsSync(cleaned)) {
            iconSource = app.iconLocation;
          }
        }
        if (!iconSource) {
          iconSource = app.target || app.launch;
        }
        app.icon = await extractWin32Icon(iconSource, options);
      }
    }
  }

  const workers = [];
  for (let w = 0; w < Math.min(concurrency, enriched.length); w++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return enriched;
}

/**
 * Loads the application catalog cache from disk.
 * @param {string} cachePath
 * @returns {{ version: number, updatedAt: number, count: number, apps: Array<Object> } | null}
 */
function loadAppCache(cachePath) {
  if (!cachePath) return null;
  try {
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, "utf8");
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.apps)) {
        return parsed;
      }
      // If legacy format: array directly
      if (Array.isArray(parsed)) {
        return {
          version: 1,
          updatedAt: Date.now(),
          count: parsed.length,
          apps: parsed,
        };
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Atomically saves the application catalog cache to disk.
 * @param {string} cachePath
 * @param {Array<Object>} catalog
 */
function saveAppCache(cachePath, catalog) {
  if (!cachePath || !Array.isArray(catalog)) return;

  const dir = path.dirname(cachePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const payload = {
    version: 1,
    updatedAt: Date.now(),
    count: catalog.length,
    apps: catalog,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const tmpPath = `${cachePath}.tmp.${process.pid}.${Date.now()}`;

  fs.writeFileSync(tmpPath, jsonStr, "utf8");

  let retries = 3;
  while (retries > 0) {
    try {
      fs.renameSync(tmpPath, cachePath);
      return;
    } catch (_) {
      retries--;
      if (retries === 0) {
        try {
          fs.copyFileSync(tmpPath, cachePath);
          fs.unlinkSync(tmpPath);
          return;
        } catch (copyErr) {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          throw copyErr;
        }
      }
      const waitTill = Date.now() + 25;
      while (Date.now() < waitTill) {}
    }
  }
}

module.exports = {
  getFallbackIcon,
  extractWin32Icon,
  resolveUwpIcon,
  extractUwpIconFromPackage,
  extractCatalogIcons,
  loadAppCache,
  saveAppCache,
};
