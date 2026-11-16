const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const MANIFEST_PATH = path.join(ROOT, 'web app', 'public', 'version.json');
const STORE_CONFIG_PATH = path.join(ROOT, 'src-tauri', 'msix', 'store.config.json');

const SEARCH_DIRS_WIN = [
  path.join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'nsis'),
  path.join(ROOT, 'release-artifacts'),
  path.join(ROOT, 'dist'),
  path.join(ROOT, 'out', 'make'),
];

const SEARCH_DIRS_LINUX_APPIMAGE = [
  path.join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'appimage'),
  path.join(ROOT, 'release-artifacts'),
];

const SEARCH_DIRS_LINUX_DEB = [
  path.join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'deb'),
  path.join(ROOT, 'release-artifacts'),
];

const SEARCH_DIRS_LINUX_RPM = [
  path.join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'rpm'),
  path.join(ROOT, 'release-artifacts'),
];

function parseCliFlag(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const eqPrefix = `${flag}=`;
  const eqArg = process.argv.find((a) => a.startsWith(eqPrefix));
  return eqArg ? eqArg.slice(eqPrefix.length) : null;
}

function findLatestArtifact(dirs, filterFn, explicitPath, version) {
  if (explicitPath && fs.existsSync(explicitPath)) {
    const stat = fs.statSync(explicitPath);
    return { path: explicitPath, name: path.basename(explicitPath), mtime: stat.mtimeMs, size: stat.size };
  }
  const candidates = [];

  function walk(dir, depth) {
    if (depth > 4 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.isFile() && filterFn(entry.name)) {
        if (version && !entry.name.includes(version)) continue;
        const stat = fs.statSync(full);
        candidates.push({ path: full, name: entry.name, mtime: stat.mtimeMs, size: stat.size });
      }
    }
  }

  for (const dir of dirs) walk(dir, 0);
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0] || null;
}

function computeSha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const version = pkg.version;

  const installer = findLatestArtifact(
    SEARCH_DIRS_WIN,
    (name) => {
      const lower = name.toLowerCase();
      return lower.endsWith('.exe') && lower.includes('setup') && !lower.includes('uninst');
    },
    parseCliFlag('--win-exe'),
    version
  );
  const linuxAppImage = findLatestArtifact(
    SEARCH_DIRS_LINUX_APPIMAGE,
    (name) => name.toLowerCase().endsWith('.appimage'),
    parseCliFlag('--linux-appimage'),
    version
  );
  const linuxDeb = findLatestArtifact(
    SEARCH_DIRS_LINUX_DEB,
    (name) => name.toLowerCase().endsWith('.deb'),
    parseCliFlag('--linux-deb'),
    version
  );
  const linuxRpm = findLatestArtifact(
    SEARCH_DIRS_LINUX_RPM,
    (name) => name.toLowerCase().endsWith('.rpm'),
    parseCliFlag('--linux-rpm'),
    version
  );

  let existing = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (_) {}
  }

  const sameVersion = existing.version === version;
  const rawExistingPlatforms = sameVersion ? (existing.platforms || {}) : {};
  const existingPlatforms = {};
  for (const [k, entry] of Object.entries(rawExistingPlatforms)) {
    if (k === 'ms-store') {
      existingPlatforms[k] = entry;
    } else if (entry && typeof entry.url === 'string' && entry.url.includes(`v${version}`)) {
      existingPlatforms[k] = entry;
    }
  }
  if (!installer && !linuxAppImage && !linuxDeb && !linuxRpm && !existingPlatforms['win32-x64']) {
    console.error(`[generate-manifest] No installer artifacts matching v${version} found.`);
    process.exit(1);
  }

  let storeConfig = {};
  if (fs.existsSync(STORE_CONFIG_PATH)) {
    try {
      storeConfig = JSON.parse(fs.readFileSync(STORE_CONFIG_PATH, 'utf8'));
    } catch (_) {}
  }

  const r2Base = 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev';
  const storeProductId = String(
    process.env.MSIX_STORE_PRODUCT_ID ||
    storeConfig.storeProductId ||
    existing.storeProductId ||
    ''
  ).trim();
  const msStoreUrl = storeProductId
    ? `https://apps.microsoft.com/detail/${storeProductId}?mode=direct`
    : (storeConfig.storeUrlFallback || existing.msStoreUrl || 'https://apps.microsoft.com/search?query=Quick+Pill');

  const platforms = { ...existingPlatforms };

  if (installer) {
    platforms['win32-x64'] = {
      url: `${r2Base}/QuickPill-Windows-v${version}-Setup.exe`,
      sha256: computeSha256(installer.path),
      size: installer.size,
      installerType: 'nsis',
    };
  } else if (!platforms['win32-x64']) {
    platforms['win32-x64'] = {
      url: `${r2Base}/QuickPill-Windows-v${version}-Setup.exe`,
      installerType: 'nsis',
    };
  }

  platforms['ms-store'] = {
    url: msStoreUrl,
    productId: storeProductId,
    installerType: 'msix',
  };

  if (linuxAppImage) {
    platforms['linux-x64'] = {
      url: `${r2Base}/QuickPill-Linux-v${version}.AppImage`,
      sha256: computeSha256(linuxAppImage.path),
      size: linuxAppImage.size,
      installerType: 'appimage',
    };
  } else if (!platforms['linux-x64']) {
    platforms['linux-x64'] = {
      url: `${r2Base}/QuickPill-Linux-v${version}.AppImage`,
      installerType: 'appimage',
    };
  }

  if (linuxDeb) {
    platforms['linux-deb'] = {
      url: `${r2Base}/QuickPill-Linux-v${version}.deb`,
      sha256: computeSha256(linuxDeb.path),
      size: linuxDeb.size,
      installerType: 'deb',
    };
  } else if (!platforms['linux-deb']) {
    platforms['linux-deb'] = {
      url: `${r2Base}/QuickPill-Linux-v${version}.deb`,
      installerType: 'deb',
    };
  }

  if (linuxRpm) {
    platforms['linux-rpm'] = {
      url: `${r2Base}/QuickPill-Linux-v${version}.rpm`,
      sha256: computeSha256(linuxRpm.path),
      size: linuxRpm.size,
      installerType: 'rpm',
    };
  } else if (!platforms['linux-rpm']) {
    platforms['linux-rpm'] = {
      url: `${r2Base}/QuickPill-Linux-v${version}.rpm`,
      installerType: 'rpm',
    };
  }

  const manifest = {
    version,
    name: `${pkg.productName || 'Quick Pill'} ${version}`,
    releaseDate: new Date().toISOString().slice(0, 10),
    mandatory: existing.mandatory ?? false,
    minSupportedVersion: existing.minSupportedVersion || '4.0.0',
    storeProductId,
    msStoreUrl,
    changelog: Array.isArray(existing.changelog) ? existing.changelog : [],
    platforms,
  };

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`[generate-manifest] Wrote ${MANIFEST_PATH}`);
  console.log(`  Version:        ${version}`);
  if (installer) {
    console.log(`  Windows Setup:  ${installer.path} (${installer.size} bytes)`);
  }
  if (linuxAppImage) {
    console.log(`  Linux AppImage: ${linuxAppImage.path} (${linuxAppImage.size} bytes)`);
  }
  if (linuxDeb) {
    console.log(`  Linux DEB:      ${linuxDeb.path} (${linuxDeb.size} bytes)`);
  }
  if (linuxRpm) {
    console.log(`  Linux RPM:      ${linuxRpm.path} (${linuxRpm.size} bytes)`);
  }
  console.log(`  MS Store URL:   ${msStoreUrl}${storeProductId ? '' : ' (fallback search until storeProductId is set)'}`);
}

main();
