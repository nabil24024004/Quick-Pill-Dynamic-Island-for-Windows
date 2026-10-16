// @ts-check
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PROGRESS_CATEGORIES, PROGRESS_STATUSES } = require("../types");

class FileOperationsProvider {
  /**
   * @param {import("../ProgressRegistry").ProgressRegistry} registry
   * @param {object} [options]
   */
  constructor(registry, options = {}) {
    this.providerId = "file-operations";
    this.registry = registry;
    this.options = options;

    /** @type {Map<string, { readStream?: fs.ReadStream, writeStream?: fs.WriteStream, isPaused: boolean, isCancelled: boolean, params: object }>} */
    this.activeJobs = new Map();
  }

  /**
   * Starts a genuine file copy or move operation
   * @param {object} params
   * @param {string} params.sourcePath
   * @param {string} params.destinationPath
   * @param {boolean} [params.isMove=false]
   * @returns {Promise<string>} Operation ID
   */
  async startCopy({ sourcePath, destinationPath, isMove = false }) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source path does not exist: ${sourcePath}`);
    }

    const stat = fs.statSync(sourcePath);
    const isDirectory = stat.isDirectory();
    const fileName = path.basename(sourcePath);
    const opId = `file-op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const category = PROGRESS_CATEGORIES.FILE_OPERATION;

    let totalBytes = 0;
    let fileList = [];

    if (isDirectory) {
      fileList = this._scanDirectory(sourcePath);
      totalBytes = fileList.reduce((acc, f) => acc + f.size, 0);
    } else {
      totalBytes = stat.size;
      fileList = [{ relative: fileName, full: sourcePath, size: totalBytes }];
    }

    const title = `${isMove ? "Moving" : "Copying"} ${fileName}`;
    const subtitle = isDirectory ? `${fileList.length} items to ${path.basename(destinationPath)}` : `To ${path.basename(path.dirname(destinationPath))}`;

    this.registry.register({
      id: opId,
      title,
      subtitle,
      applicationName: "Quick Pill Files",
      category,
      status: PROGRESS_STATUSES.RUNNING,
      progress: 0,
      completedUnits: 0,
      totalUnits: fileList.length,
      unitLabel: "files",
      bytesCompleted: 0,
      totalBytes,
      destinationPath: isDirectory ? destinationPath : path.dirname(destinationPath),
      capabilities: {
        canPause: true,
        canResume: true,
        canCancel: true,
        canRetry: true,
        canOpenDestination: true,
        canDismiss: true
      },
      metadata: {
        sourcePath,
        destinationPath,
        isMove,
        isDirectory
      }
    }, this.providerId);

    const job = {
      isPaused: false,
      isCancelled: false,
      params: { sourcePath, destinationPath, isMove, isDirectory }
    };
    this.activeJobs.set(opId, job);

    // Asynchronously perform copy
    this._executeCopyJob(opId, fileList, totalBytes, sourcePath, destinationPath, isMove, isDirectory)
      .catch((err) => {
        if (!job.isCancelled) {
          this.registry.fail(opId, err, this.providerId);
        }
      })
      .finally(() => {
        this.activeJobs.delete(opId);
      });

    return opId;
  }

  /**
   * Starts a file checksum hash verification operation (SHA-256)
   * @param {object} params
   * @param {string} params.sourcePath
   * @returns {Promise<string>} Operation ID
   */
  async startHash({ sourcePath }) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`File does not exist: ${sourcePath}`);
    }

    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      throw new Error("Hashing folders directly is not supported");
    }

    const fileName = path.basename(sourcePath);
    const opId = `hash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const totalBytes = stat.size;

    this.registry.register({
      id: opId,
      title: `Hashing ${fileName}`,
      subtitle: "Calculating SHA-256 checksum…",
      applicationName: "Quick Pill Security",
      category: PROGRESS_CATEGORIES.OTHER,
      status: PROGRESS_STATUSES.RUNNING,
      progress: 0,
      bytesCompleted: 0,
      totalBytes,
      destinationPath: path.dirname(sourcePath),
      capabilities: {
        canPause: false,
        canResume: false,
        canCancel: true,
        canRetry: true,
        canOpenDestination: true,
        canDismiss: true
      },
      metadata: { sourcePath }
    }, this.providerId);

    const job = { isPaused: false, isCancelled: false, params: { sourcePath } };
    this.activeJobs.set(opId, job);

    const hash = crypto.createHash("sha256");
    const readStream = fs.createReadStream(sourcePath, { highWaterMark: 128 * 1024 });
    job.readStream = readStream;

    let bytesRead = 0;
    let lastEmit = Date.now();

    readStream.on("data", (chunk) => {
      if (job.isCancelled) {
        readStream.destroy();
        return;
      }

      hash.update(chunk);
      bytesRead += chunk.length;

      const now = Date.now();
      if (now - lastEmit >= 100 || bytesRead === totalBytes) {
        lastEmit = now;
        const progress = totalBytes > 0 ? (bytesRead / totalBytes) * 100 : 0;
        this.registry.update(opId, {
          progress,
          bytesCompleted: bytesRead
        }, this.providerId);
      }
    });

    readStream.on("end", () => {
      if (job.isCancelled) return;
      const digest = hash.digest("hex");
      this.registry.complete(opId, { sha256: digest }, this.providerId);
      this.registry.update(opId, {
        subtitle: `SHA-256: ${digest.slice(0, 16)}…`,
        progress: 100
      }, this.providerId);
      this.activeJobs.delete(opId);
    });

    readStream.on("error", (err) => {
      if (!job.isCancelled) {
        this.registry.fail(opId, err, this.providerId);
      }
      this.activeJobs.delete(opId);
    });

    return opId;
  }

  /**
   * Internal worker executing file copying
   * @private
   */
  async _executeCopyJob(opId, fileList, totalBytes, sourceRoot, destRoot, isMove, isDirectory) {
    const job = this.activeJobs.get(opId);
    if (!job) return;

    let overallBytesCompleted = 0;
    let filesDone = 0;
    let lastEmit = Date.now();

    for (const item of fileList) {
      if (job.isCancelled) break;

      const relativePath = item.relative;
      const targetFilePath = isDirectory 
        ? path.join(destRoot, relativePath)
        : (fs.existsSync(destRoot) && fs.statSync(destRoot).isDirectory()
            ? path.join(destRoot, path.basename(sourceRoot))
            : destRoot);

      // Ensure directory exists
      const targetDir = path.dirname(targetFilePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Stream file with chunked accounting
      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(item.full, { highWaterMark: 64 * 1024 });
        const writeStream = fs.createWriteStream(targetFilePath);

        job.readStream = readStream;
        job.writeStream = writeStream;

        let fileBytes = 0;

        readStream.on("data", (chunk) => {
          if (job.isCancelled) {
            readStream.destroy();
            writeStream.destroy();
            try { if (fs.existsSync(targetFilePath)) fs.unlinkSync(targetFilePath); } catch (_) {}
            return reject(new Error("Operation cancelled"));
          }

          writeStream.write(chunk);
          fileBytes += chunk.length;
          overallBytesCompleted += chunk.length;

          const now = Date.now();
          if (now - lastEmit >= 100 || overallBytesCompleted === totalBytes) {
            lastEmit = now;
            const progress = totalBytes > 0 ? (overallBytesCompleted / totalBytes) * 100 : 0;
            this.registry.update(opId, {
              progress,
              bytesCompleted: overallBytesCompleted,
              completedUnits: filesDone,
              subtitle: `Processing ${path.basename(item.full)}`
            }, this.providerId);
          }
        });

        readStream.on("end", () => {
          writeStream.end();
        });

        writeStream.on("finish", () => {
          filesDone++;
          if (isMove && !isDirectory) {
            try { fs.unlinkSync(item.full); } catch (_) {}
          }
          resolve(true);
        });

        readStream.on("error", (err) => {
          writeStream.destroy();
          reject(err);
        });

        writeStream.on("error", (err) => {
          readStream.destroy();
          reject(err);
        });
      });
    }

    if (job.isCancelled) {
      this.registry.cancel(opId, this.providerId);
      return;
    }

    if (isMove && isDirectory) {
      try {
        fs.rmSync(sourceRoot, { recursive: true, force: true });
      } catch (_) {}
    }

    this.registry.update(opId, {
      status: PROGRESS_STATUSES.COMPLETED,
      progress: 100,
      completedUnits: fileList.length,
      bytesCompleted: totalBytes,
      subtitle: `${isMove ? "Moved" : "Copied"} ${fileList.length} item${fileList.length === 1 ? "" : "s"} successfully`,
      capabilities: {
        canPause: false,
        canResume: false,
        canCancel: false,
        canRetry: false,
        canOpenDestination: true,
        canDismiss: true
      }
    }, this.providerId);
  }

  /**
   * Scans a directory recursively
   * @private
   */
  _scanDirectory(dirPath, base = "") {
    let results = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.join(base, entry.name);

      if (entry.isDirectory()) {
        results = results.concat(this._scanDirectory(fullPath, relPath));
      } else if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        results.push({ relative: relPath, full: fullPath, size: stat.size });
      }
    }

    return results;
  }

  /**
   * Handles action routing for file operations
   */
  async handleAction(operationId, action, params, op) {
    const job = this.activeJobs.get(operationId);

    if (action === "pause") {
      if (job && job.readStream && !job.isPaused) {
        job.readStream.pause();
        job.isPaused = true;
        this.registry.pause(operationId, this.providerId);
        return { success: true };
      }
    }

    if (action === "resume") {
      if (job && job.readStream && job.isPaused) {
        job.readStream.resume();
        job.isPaused = false;
        this.registry.resume(operationId, this.providerId);
        return { success: true };
      }
    }

    if (action === "cancel") {
      if (job) {
        job.isCancelled = true;
        if (job.readStream) job.readStream.destroy();
        if (job.writeStream) job.writeStream.destroy();
      }
      this.registry.cancel(operationId, this.providerId);
      return { success: true };
    }

    if (action === "retry") {
      const metadata = op?.metadata || {};
      if (metadata.sourcePath && metadata.destinationPath) {
        this.startCopy({
          sourcePath: metadata.sourcePath,
          destinationPath: metadata.destinationPath,
          isMove: metadata.isMove
        });
        return { success: true };
      }
    }

    return undefined;
  }
}

module.exports = {
  FileOperationsProvider
};
