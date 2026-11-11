"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");

/**
 * Generates a valid, non-empty 32x32 RGBA PNG data URL for native OS drag operations
 * when app.getFileIcon is unavailable (e.g., directories on Windows).
 * Electron on Windows requires a non-empty NativeImage for webContents.startDrag.
 */
function buildFallbackDragIconDataUrl() {
  const width = 32;
  const height = 32;
  // Raw scanlines: 1 filter byte (0) + width * 4 RGBA bytes per row
  const raw = Buffer.alloc(height * (1 + width * 4), 0);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    raw[rowOffset] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      // Draw a clean rounded 28x24 folder/file card in sky-blue (#38bdf8)
      if (x >= 2 && x < 30 && y >= 4 && y < 28) {
        raw[px] = 56;      // R
        raw[px + 1] = 189; // G
        raw[px + 2] = 248; // B
        raw[px + 3] = 235; // A
      }
    }
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const pngBuffer = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);

  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}

const FALLBACK_DRAG_ICON_DATA_URL = buildFallbackDragIconDataUrl();

/**
 * Formats byte size into human readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (typeof bytes !== "number" || isNaN(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Creates the ShelfEngine for temporary session file staging and native drag handling.
 * Staged files are isolated in %TEMP%/quick-pill-shelf and preserved for the active session.
 * 
 * @param {Object} options
 * @param {Object} [options.app] - Electron app instance
 * @param {Object} [options.shell] - Electron shell instance
 * @param {Object} [options.nativeImage] - Electron nativeImage instance
 * @param {string} [options.tempDir] - Override for temporary shelf directory
 * @returns {Object} ShelfEngine instance
 */
function createShelfEngine(options = {}) {
  const app = options.app || null;
  const shell = options.shell || null;
  const nativeImage = options.nativeImage || null;
  const renderPdfThumbnail = options.renderPdfThumbnail || null;
  const onItemsChange = options.onItemsChange || null;
  const tempDir = options.tempDir || path.join(os.tmpdir(), "quick-pill-shelf");

  // Ensure staging directory exists
  try {
    fs.mkdirSync(tempDir, { recursive: true });
  } catch (err) {
    console.error("[ShelfEngine] Failed to create tempDir:", err);
  }

  // Active in-memory session registry of shelf items
  let items = [];
  let itemCounter = 0;

  /**
   * Returns list of currently staged shelf items.
   */
  function getItems() {
    // Filter out any items whose files were deleted externally
    items = items.filter((item) => {
      try {
        return fs.existsSync(item.stagedPath);
      } catch (_) {
        return false;
      }
    });
    return [...items];
  }

  /**
   * Adds one or multiple files/folders to the shelf.
   * Copies them safely to %TEMP%/quick-pill-shelf to preserve original files.
   * 
   * @param {string[]|string} filePaths - Absolute path(s)
   * @returns {Promise<Object[]>} Updated items list
   */
  async function addFiles(filePaths) {
    if (!filePaths) return getItems();
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const resolvedTempDir = path.resolve(tempDir).toLowerCase();

    for (const rawPath of paths) {
      if (typeof rawPath !== "string" || !rawPath.trim()) continue;
      const originalPath = path.normalize(rawPath.trim());

      try {
        if (!fs.existsSync(originalPath)) continue;

        // Prevent re-staging a file that is already inside the shelf's own tempDir
        // (e.g. if user drags an item from the shelf and drops it back onto the shelf)
        const resolvedOriginal = path.resolve(originalPath).toLowerCase();
        if (
          resolvedOriginal === resolvedTempDir ||
          resolvedOriginal.startsWith(resolvedTempDir + path.sep) ||
          items.some((it) => path.resolve(it.stagedPath).toLowerCase() === resolvedOriginal)
        ) {
          continue;
        }

        const stat = fs.statSync(originalPath);
        const isFolder = stat.isDirectory();
        const baseName = path.basename(originalPath);

        // Create unique subfolder under tempDir to prevent filename collisions
        const uniqueId = `${Date.now()}_${++itemCounter}_${Math.random().toString(36).substring(2, 8)}`;
        const itemDir = path.join(tempDir, uniqueId);
        fs.mkdirSync(itemDir, { recursive: true });

        const stagedPath = path.join(itemDir, baseName);

        if (isFolder) {
          fs.cpSync(originalPath, stagedPath, { recursive: true });
        } else {
          fs.copyFileSync(originalPath, stagedPath);
        }

        const size = isFolder ? 0 : stat.size;
        const ext = isFolder ? "folder" : (path.extname(baseName).replace(".", "").toLowerCase() || "file");

        // Attempt extracting native OS icon via app.getFileIcon (for files)
        let iconDataUrl = null;
        if (!isFolder && app && typeof app.getFileIcon === "function") {
          try {
            const nativeIcon = await app.getFileIcon(stagedPath, { size: "normal" });
            if (nativeIcon && typeof nativeIcon.isEmpty === "function" && !nativeIcon.isEmpty()) {
              iconDataUrl = nativeIcon.toDataURL();
            }
          } catch (_) {}
        }

        // Generate rich visual preview thumbnails for images
        let thumbnailDataUrl = null;
        const imageExtensions = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "ico", "avif"];
        if (imageExtensions.includes(ext) && !isFolder) {
          if (nativeImage && typeof nativeImage.createFromPath === "function") {
            try {
              const img = nativeImage.createFromPath(stagedPath);
              if (img && typeof img.isEmpty === "function" && !img.isEmpty()) {
                const thumb = img.resize({ width: 120, height: 120, quality: "good" });
                thumbnailDataUrl = thumb.toDataURL();
              }
            } catch (_) {}
          }
        } else if (ext === "svg" && !isFolder) {
          try {
            const svgContent = fs.readFileSync(stagedPath, "utf8");
            if (svgContent && svgContent.includes("<svg")) {
              thumbnailDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
            }
          } catch (_) {}
        }

        const newItem = {
          id: uniqueId,
          name: baseName,
          originalPath,
          stagedPath,
          size,
          sizeFormatted: isFolder ? "Folder" : formatFileSize(size),
          ext,
          isFolder,
          iconDataUrl,
          thumbnailDataUrl,
          addedAt: Date.now()
        };

        // Add to front of shelf (most recent first)
        items.unshift(newItem);

        // For PDFs, asynchronously generate document cover thumbnail via Chromium
        if (ext === "pdf" && !isFolder && typeof renderPdfThumbnail === "function") {
          renderPdfThumbnail(stagedPath).then((pdfThumbUrl) => {
            if (pdfThumbUrl) {
              const targetItem = items.find((it) => it.id === uniqueId);
              if (targetItem) {
                targetItem.thumbnailDataUrl = pdfThumbUrl;
                if (typeof onItemsChange === "function") {
                  onItemsChange(getItems());
                }
              }
            }
          }).catch(() => {});
        }
      } catch (err) {
        console.error(`[ShelfEngine] Failed to add file "${rawPath}":`, err);
      }
    }

    return getItems();
  }

  /**
   * Removes a single item from the shelf by ID and deletes its staged file.
   * @param {string} id
   * @returns {Object[]} Updated items list
   */
  function removeItem(id) {
    const index = items.findIndex((it) => it.id === id);
    if (index === -1) return getItems();

    const [removed] = items.splice(index, 1);
    try {
      const itemDir = path.dirname(removed.stagedPath);
      if (itemDir.startsWith(tempDir) && itemDir !== tempDir) {
        fs.rmSync(itemDir, { recursive: true, force: true });
      } else if (fs.existsSync(removed.stagedPath)) {
        fs.rmSync(removed.stagedPath, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`[ShelfEngine] Failed to delete staged file for item ${id}:`, err);
    }

    return getItems();
  }

  /**
   * Clears all items from the shelf and deletes all staged files in tempDir.
   * @returns {Object[]} Empty items list
   */
  function clearShelf() {
    try {
      if (fs.existsSync(tempDir)) {
        const entries = fs.readdirSync(tempDir);
        for (const entry of entries) {
          const entryPath = path.join(tempDir, entry);
          fs.rmSync(entryPath, { recursive: true, force: true });
        }
      }
    } catch (err) {
      console.error("[ShelfEngine] Error clearing shelf directory:", err);
    }

    items = [];
    return [];
  }

  /**
   * Opens the staged file in its default OS application.
   * @param {string} filePathOrId
   */
  async function openFile(filePathOrId) {
    let target = filePathOrId;
    const found = items.find((it) => it.id === filePathOrId || it.stagedPath === filePathOrId);
    if (found) target = found.stagedPath;

    if (shell && typeof shell.openPath === "function" && target) {
      return await shell.openPath(target);
    }
    return false;
  }

  /**
   * Reveals the staged file in Windows File Explorer.
   * @param {string} filePathOrId
   */
  function showInFolder(filePathOrId) {
    let target = filePathOrId;
    const found = items.find((it) => it.id === filePathOrId || it.stagedPath === filePathOrId);
    if (found) target = found.stagedPath;

    if (shell && typeof shell.showItemInFolder === "function" && target) {
      shell.showItemInFolder(target);
      return true;
    }
    return false;
  }

  /**
   * Initiates a native OS drag-out loop via Electron webContents.startDrag.
   * Must execute synchronously on the IPC tick so Chromium still holds mouse capture.
   * @param {string} filePathOrId
   * @param {Object} eventSender - Electron WebContents
   */
  function startDrag(filePathOrId, eventSender) {
    if (!eventSender || typeof eventSender.startDrag !== "function") return false;

    let target = filePathOrId;
    const found = items.find((it) => it.id === filePathOrId || it.stagedPath === filePathOrId);
    if (found) target = found.stagedPath;

    if (!target || !fs.existsSync(target)) return false;

    let dragIcon = null;

    // 1. Prefer cached thumbnailDataUrl or iconDataUrl synchronously so startDrag runs on the same tick
    const iconSource = (found && (found.thumbnailDataUrl || found.iconDataUrl)) || null;
    if (iconSource && nativeImage && typeof nativeImage.createFromDataURL === "function") {
      try {
        const cachedImg = nativeImage.createFromDataURL(iconSource);
        if (cachedImg && (typeof cachedImg.isEmpty !== "function" || !cachedImg.isEmpty())) {
          dragIcon = cachedImg.resize ? cachedImg.resize({ width: 48, height: 48, quality: "good" }) : cachedImg;
        }
      } catch (_) {}
    }

    // 2. Windows requires a valid NON-EMPTY NativeImage for webContents.startDrag
    if (!dragIcon && nativeImage && typeof nativeImage.createFromDataURL === "function") {
      try {
        const fallbackImg = nativeImage.createFromDataURL(FALLBACK_DRAG_ICON_DATA_URL);
        if (fallbackImg && (typeof fallbackImg.isEmpty !== "function" || !fallbackImg.isEmpty())) {
          dragIcon = fallbackImg;
        }
      } catch (_) {}
    }

    eventSender.startDrag({
      file: target,
      icon: dragIcon || FALLBACK_DRAG_ICON_DATA_URL
    });
    return true;
  }

  return {
    getItems,
    addFiles,
    removeItem,
    clearShelf,
    openFile,
    showInFolder,
    startDrag,
    tempDir,
    FALLBACK_DRAG_ICON_DATA_URL
  };
}

module.exports = {
  createShelfEngine,
  formatFileSize
};
