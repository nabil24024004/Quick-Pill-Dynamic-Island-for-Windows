const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const MANIFEST_PATH = path.join(ROOT, 'web app', 'public', 'version.json');
const STORE_CONFIG_PATH = path.join(ROOT, 'src-tauri', 'msix', 'store.config.json');

const SEARCH_DIRS = [
  path.join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'nsis'),
  path.join(ROOT, 'dist'),
  path.join(ROOT, 'out', 'make'),
];

function findInstallerExe(dirs) {
  const candidates = [];

  function walk(dir, depth) {
    if (depth > 4 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
        const lower = entry.name.toLowerCase();
        if (lower.includes('setup') && !lower.includes('uninst')) {
          const stat = fs.statSync(full);
          candidates.push({ path: full, name: entry.name, mtime: stat.mtimeMs, size: stat.size });
        }
      }
    }
  }

  for (const dir of dirs) walk(dir, 0);
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0] || null;
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const installer = findInstallerExe(SEARCH_DIRS);
  if (!installer) {
    console.error('[generate-manifest] No setup .exe found in:', SEARCH_DIRS.join(', '));
    process.exit(1);
  }

  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(installer.path));
  const sha256 = hash.digest('hex');

  let existing = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (_) {}
  }

  let storeConfig = {};
  if (fs.existsSync(STORE_CONFIG_PATH)) {
    try {
      storeConfig = JSON.parse(fs.readFileSync(STORE_CONFIG_PATH, 'utf8'));
    } catch (_) {}
  }

  const version = pkg.version;
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

  const manifest = {
    version,
    name: `${pkg.productName || 'Quick Pill'} ${version}`,
    releaseDate: new Date().toISOString().slice(0, 10),
    mandatory: existing.mandatory ?? false,
    minSupportedVersion: existing.minSupportedVersion || '4.0.0',
    storeProductId,
    msStoreUrl,
    changelog: Array.isArray(existing.changelog) ? existing.changelog : [],
    platforms: {
      'win32-x64': {
        url: `${r2Base}/QuickPill-Windows-v${version}-Setup.exe`,
        sha256,
        size: installer.size,
        installerType: 'nsis',
      },
      'ms-store': {
        url: msStoreUrl,
        productId: storeProductId,
        installerType: 'msix',
      },
    },
  };

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`[generate-manifest] Wrote ${MANIFEST_PATH}`);
  console.log(`  Version:      ${version}`);
  console.log(`  Installer:    ${installer.path}`);
  console.log(`  R2 Object:    QuickPill-Windows-v${version}-Setup.exe`);
  console.log(`  SHA-256:      ${sha256}`);
  console.log(`  Size:         ${installer.size} bytes`);
  console.log(`  MS Store URL: ${msStoreUrl}${storeProductId ? '' : ' (fallback search until storeProductId is set)'}`);
}

main();
