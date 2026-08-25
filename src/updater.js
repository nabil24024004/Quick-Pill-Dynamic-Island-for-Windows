/**
 * src/updater.js - Native Auto-Updater Engine for Quick Pill
 * 
 * Features:
 * - HTTPS manifest fetching with redirect resolution
 * - Semantic version comparator (semver)
 * - Platform & architecture matching
 * - Chunked streaming downloader with progress & speed calculation
 * - SHA-256 integrity verification
 * - Silent NSIS installer execution (/S) and graceful application exit
 */

const { app, shell } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

// Primary remote manifest URL (hosted on Cloudflare R2 / Website)
const DEFAULT_MANIFEST_URL = 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json';

class AppUpdater extends EventEmitter {
  constructor() {
    super();
    this.manifestUrl = DEFAULT_MANIFEST_URL;
    this.currentVersion = app ? app.getVersion() : '5.1.0';
    this.status = 'idle'; // 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
    this.updateInfo = null;
    this.downloadedFilePath = null;
    this.currentDownloadRequest = null;
    this.lastProgressEmit = 0;
  }

  setManifestUrl(url) {
    if (url) this.manifestUrl = url;
  }

  /**
   * Compare two semantic version strings (e.g., "5.1.0" > "5.1.0")
   * Returns:
   *   1 if v1 > v2
   *  -1 if v1 < v2
   *   0 if v1 === v2
   */
  compareVersions(v1, v2) {
    const cleanV1 = (v1 || '0.0.0').replace(/^v/i, '').trim();
    const cleanV2 = (v2 || '0.0.0').replace(/^v/i, '').trim();

    const [main1, pre1] = cleanV1.split('-');
    const [main2, pre2] = cleanV2.split('-');

    const parts1 = main1.split('.').map(n => parseInt(n, 10) || 0);
    const parts2 = main2.split('.').map(n => parseInt(n, 10) || 0);

    const maxLen = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < maxLen; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }

    // Handle pre-releases: a version with no pre-release tag is greater than a pre-release version
    if (!pre1 && pre2) return 1;
    if (pre1 && !pre2) return -1;
    if (pre1 && pre2) {
      return pre1.localeCompare(pre2);
    }

    return 0;
  }

  /**
   * Determine the platform-arch key (e.g., "win32-x64", "darwin-arm64", "linux-x64")
   */
  getPlatformKey() {
    const platform = process.platform;
    const arch = process.arch;
    return `${platform}-${arch}`;
  }

  /**
   * Fetch JSON data from URL, automatically following HTTP/HTTPS redirects
   */
  fetchJson(url, timeoutMs = 12000, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        return reject(new Error('Too many redirects while fetching update manifest.'));
      }

      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, {
        headers: {
          'User-Agent': `QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,
          'Accept': 'application/json, text/plain, */*'
        },
        timeout: timeoutMs
      }, (res) => {
        // Handle 3xx Redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).href;
          return this.fetchJson(redirectUrl, timeoutMs, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode !== 200) {
          res.resume(); // Consume response data to free memory
          return reject(new Error(`Server returned HTTP ${res.statusCode}: ${res.statusMessage}`));
        }

        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Invalid JSON received from update manifest: ${e.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out while checking for updates.'));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Check for updates against remote manifest
   */
  async checkForUpdates() {
    if (this.status === 'checking' || this.status === 'downloading') {
      return { status: this.status, updateInfo: this.updateInfo };
    }

    this.status = 'checking';
    this.emit('checking');

    try {
      // Append cache buster query parameter
      const cacheBustUrl = `${this.manifestUrl}${this.manifestUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      const manifest = await this.fetchJson(cacheBustUrl);

      if (!manifest || !manifest.version) {
        throw new Error('Update manifest is missing required "version" field.');
      }

      const remoteVersion = manifest.version;
      const hasUpdate = this.compareVersions(remoteVersion, this.currentVersion) > 0;

      if (hasUpdate) {
        const platformKey = this.getPlatformKey();
        const platformData = manifest.platforms?.[platformKey] ||
          manifest.platforms?.[`${process.platform}-x64`] ||
          manifest.platforms?.['win32-x64'];

        const downloadUrl = platformData?.url || '';

        this.updateInfo = {
          version: remoteVersion,
          currentVersion: this.currentVersion,
          name: manifest.name || `Quick Pill v${remoteVersion}`,
          releaseDate: manifest.releaseDate || '',
          mandatory: !!manifest.mandatory,
          changelog: Array.isArray(manifest.changelog) ? manifest.changelog : [],
          downloadUrl: downloadUrl,
          sha256: platformData?.sha256 || '',
          size: platformData?.size || 0,
          installerType: platformData?.installerType || 'nsis'
        };

        this.status = 'available';
        this.emit('update-available', this.updateInfo);
        return { status: 'available', updateInfo: this.updateInfo };
      } else {
        this.status = 'not-available';
        const notAvailableInfo = { currentVersion: this.currentVersion, latestVersion: remoteVersion };
        this.emit('update-not-available', notAvailableInfo);
        return { status: 'not-available', updateInfo: notAvailableInfo };
      }
    } catch (err) {
      this.status = 'error';
      const errMsg = err.message || 'Unknown error occurred while checking for updates.';
      this.emit('error', errMsg);
      return { status: 'error', error: errMsg };
    }
  }

  /**
   * Download the update package to a temporary directory with progress tracking
   */
  startDownload() {
    if (!this.updateInfo || !this.updateInfo.downloadUrl) {
      const err = new Error('No update available or download URL is missing.');
      this.emit('error', err.message);
      return Promise.reject(err);
    }

    if (this.status === 'downloading') {
      return Promise.resolve({ status: 'downloading' });
    }

    this.status = 'downloading';
    this.emit('download-started', this.updateInfo);

    const tempDir = app.getPath('temp');
    const ext = process.platform === 'win32' ? '.exe' : process.platform === 'darwin' ? '.dmg' : '.deb';
    const tempFileName = `quick-pill-update-v${this.updateInfo.version}${ext}`;
    const targetFilePath = path.join(tempDir, tempFileName);

    return new Promise((resolve, reject) => {
      // Remove any leftover partial file
      if (fs.existsSync(targetFilePath)) {
        try { fs.unlinkSync(targetFilePath); } catch (_) { }
      }

      const fileStream = fs.createWriteStream(targetFilePath);
      let transferredBytes = 0;
      let totalBytes = this.updateInfo.size || 0;
      let startTime = Date.now();
      let lastBytes = 0;
      let lastTime = startTime;
      let currentSpeed = 0;

      const downloadWithRedirects = (currentUrl, maxRedirects = 5) => {
        if (maxRedirects <= 0) {
          fileStream.close();
          const err = new Error('Too many redirects while downloading update binary.');
          this.status = 'error';
          this.emit('error', err.message);
          return reject(err);
        }

        const client = currentUrl.startsWith('https') ? https : http;
        const req = client.get(currentUrl, {
          headers: {
            'User-Agent': `QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`
          }
        }, (res) => {
          // Handle Redirects
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, currentUrl).href;
            return downloadWithRedirects(redirectUrl, maxRedirects - 1);
          }

          if (res.statusCode !== 200) {
            fileStream.close();
            try { fs.unlinkSync(targetFilePath); } catch (_) { }
            const err = new Error(`Download failed with status HTTP ${res.statusCode}: ${res.statusMessage}`);
            this.status = 'error';
            this.emit('error', err.message);
            return reject(err);
          }

          const contentLength = parseInt(res.headers['content-length'], 10);
          if (!isNaN(contentLength) && contentLength > 0) {
            totalBytes = contentLength;
          }

          res.on('data', (chunk) => {
            transferredBytes += chunk.length;
            fileStream.write(chunk);

            const now = Date.now();
            // Throttle progress events to max once every 100ms
            if (now - this.lastProgressEmit >= 100 || transferredBytes === totalBytes) {
              const timeDelta = (now - lastTime) / 1000;
              if (timeDelta >= 0.5) {
                currentSpeed = Math.round((transferredBytes - lastBytes) / timeDelta);
                lastBytes = transferredBytes;
                lastTime = now;
              }

              const percent = totalBytes > 0 ? Math.min(100, Math.round((transferredBytes / totalBytes) * 1000) / 10) : 0;

              const progressData = {
                percent,
                transferredBytes,
                totalBytes,
                speedBytesPerSec: currentSpeed
              };

              this.lastProgressEmit = now;
              this.emit('download-progress', progressData);
            }
          });

          res.on('end', () => {
            fileStream.end();
          });

          res.on('error', (err) => {
            fileStream.close();
            try { fs.unlinkSync(targetFilePath); } catch (_) { }
            this.status = 'error';
            this.emit('error', err.message);
            reject(err);
          });
        });

        this.currentDownloadRequest = req;

        req.on('error', (err) => {
          fileStream.close();
          try { fs.unlinkSync(targetFilePath); } catch (_) { }
          this.status = 'error';
          this.emit('error', err.message);
          reject(err);
        });
      };

      fileStream.on('finish', () => {
        this.currentDownloadRequest = null;

        // Verify SHA-256 if provided
        if (this.updateInfo.sha256 && this.updateInfo.sha256.trim() !== '') {
          try {
            const hash = crypto.createHash('sha256');
            const fileBuf = fs.readFileSync(targetFilePath);
            hash.update(fileBuf);
            const calculatedSha = hash.digest('hex');

            if (calculatedSha.toLowerCase() !== this.updateInfo.sha256.trim().toLowerCase()) {
              try { fs.unlinkSync(targetFilePath); } catch (_) { }
              const err = new Error('Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.');
              this.status = 'error';
              this.emit('error', err.message);
              return reject(err);
            }
          } catch (hashErr) {
            console.warn('Could not verify SHA-256 checksum:', hashErr);
          }
        }

        this.downloadedFilePath = targetFilePath;
        this.status = 'downloaded';
        const downloadResult = {
          version: this.updateInfo.version,
          filePath: targetFilePath
        };
        this.emit('update-downloaded', downloadResult);
        resolve(downloadResult);
      });

      fileStream.on('error', (err) => {
        try { fs.unlinkSync(targetFilePath); } catch (_) { }
        this.status = 'error';
        this.emit('error', err.message);
        reject(err);
      });

      downloadWithRedirects(this.updateInfo.downloadUrl);
    });
  }

  /**
   * Cancel in-flight download
   */
  cancelDownload() {
    if (this.currentDownloadRequest) {
      try {
        this.currentDownloadRequest.destroy();
      } catch (_) { }
      this.currentDownloadRequest = null;
    }
    this.status = 'idle';
    this.emit('download-cancelled');
  }

  /**
   * Execute the installer and quit the application
   */
  installAndRelaunch() {
    if (!this.downloadedFilePath || !fs.existsSync(this.downloadedFilePath)) {
      const err = new Error('No downloaded update file found to install.');
      this.emit('error', err.message);
      return false;
    }

    const filePath = this.downloadedFilePath;
    const platform = process.platform;

    try {
      if (platform === 'win32') {
        // Run NSIS setup silently with /S (or standard flag)
        // NSIS oneClick automatically closes running instances, updates files, and restarts
        const child = spawn(filePath, ['/S'], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();

        // Give the OS a moment to spawn the child process before exiting
        setTimeout(() => {
          if (app) {
            app.isQuitting = true;
            app.quit();
          } else {
            process.exit(0);
          }
        }, 300);
        return true;
      } else if (platform === 'darwin') {
        shell.openPath(filePath);
        setTimeout(() => {
          if (app) app.quit();
        }, 500);
        return true;
      } else {
        shell.openPath(filePath);
        setTimeout(() => {
          if (app) app.quit();
        }, 500);
        return true;
      }
    } catch (err) {
      this.emit('error', `Failed to launch installer: ${err.message}`);
      return false;
    }
  }
}

// Export singleton instance
const autoUpdater = new AppUpdater();
module.exports = { autoUpdater, AppUpdater };
