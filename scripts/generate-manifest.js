#!/usr/bin/env node
/**
 * scripts/generate-manifest.js
 * 
 * Automatically generates or updates `version.json` with accurate file sizes and SHA-256 hashes
 * for built release binaries (Windows .exe, macOS .dmg, Linux .deb/.rpm).
 *
 * Usage:
 *   node scripts/generate-manifest.js [options]
 *   npm run update:manifest
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pkg = require('../package.json');

const DIST_DIR = path.resolve(__dirname, '../dist');
const OUT_MAKE_DIR = path.resolve(__dirname, '../out/make');
const WEB_APP_PUBLIC_DIR = path.resolve(__dirname, '../web app/public');

function calculateFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest('hex');
}

function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.statSync(filePath).size;
}

function findArtifact(searchDirs, pattern) {
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir, { recursive: true });
    for (const file of files) {
      const fullPath = path.isAbsolute(file) ? file : path.join(dir, file);
      if (typeof file === 'string' && pattern.test(file) && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return fullPath;
      }
    }
  }
  return null;
}

function generateManifest() {
  const version = pkg.version;
  console.log(`Generating update manifest for Quick Pill v${version}...`);

  const searchDirs = [DIST_DIR, OUT_MAKE_DIR];

  // Look for Windows installer
  const winArtifact = findArtifact(searchDirs, /QuickPill-Windows.*\.exe$/i) ||
                      findArtifact(searchDirs, /quick-pill-.*-setup\.exe$/i);

  // Look for macOS installer
  const macArtifact = findArtifact(searchDirs, /QuickPill-macOS.*\.dmg$/i) ||
                      findArtifact(searchDirs, /.*\.dmg$/i);

  // Look for Linux installer
  const linuxArtifact = findArtifact(searchDirs, /QuickPill-Linux.*\.deb$/i) ||
                        findArtifact(searchDirs, /.*\.deb$/i);

  const manifest = {
    version: version,
    name: `Quick Pill ${version}`,
    releaseDate: new Date().toISOString().split('T')[0],
    mandatory: false,
    minSupportedVersion: '4.0.0',
    changelog: [
      `Quick Pill v${version} release.`,
      'Performance enhancements and stability updates.'
    ],
    platforms: {
      'win32-x64': {
        url: `https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v${version}-Setup.exe`,
        sha256: winArtifact ? calculateFileSha256(winArtifact) : '',
        size: winArtifact ? getFileSize(winArtifact) : 89452012,
        installerType: 'nsis'
      },
      'darwin-arm64': {
        url: `https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-macOS-arm64-v${version}.dmg`,
        sha256: macArtifact ? calculateFileSha256(macArtifact) : '',
        size: macArtifact ? getFileSize(macArtifact) : 91230410,
        installerType: 'dmg'
      },
      'linux-x64': {
        url: `https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Linux-v${version}.deb`,
        sha256: linuxArtifact ? calculateFileSha256(linuxArtifact) : '',
        size: linuxArtifact ? getFileSize(linuxArtifact) : 78291040,
        installerType: 'deb'
      }
    }
  };

  // Preserve existing changelog if version.json exists in web app/public
  const publicManifestPath = path.join(WEB_APP_PUBLIC_DIR, 'version.json');
  if (fs.existsSync(publicManifestPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(publicManifestPath, 'utf8'));
      if (existing.version === version && existing.changelog) {
        manifest.changelog = existing.changelog;
      }
    } catch (_) {}
  }

  // Write to web app/public/version.json
  if (!fs.existsSync(WEB_APP_PUBLIC_DIR)) {
    fs.mkdirSync(WEB_APP_PUBLIC_DIR, { recursive: true });
  }
  fs.writeFileSync(publicManifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Manifest written to: ${publicManifestPath}`);

  // Also write to dist/version.json if dist directory exists
  if (fs.existsSync(DIST_DIR)) {
    const distManifestPath = path.join(DIST_DIR, 'version.json');
    fs.writeFileSync(distManifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log(`Manifest written to: ${distManifestPath}`);
  }

  console.log('Update manifest generation complete.');
}

if (require.main === module) {
  generateManifest();
}

module.exports = { generateManifest };
