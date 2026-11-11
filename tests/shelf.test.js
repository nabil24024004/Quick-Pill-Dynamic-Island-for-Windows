"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const { createShelfEngine, formatFileSize } = require("../src/services/shelf");

test("formatFileSize - handles bytes, KB, MB, GB and boundary values", () => {
  assert.equal(formatFileSize(0), "0 B");
  assert.equal(formatFileSize(512), "512 B");
  assert.equal(formatFileSize(1024), "1.0 KB");
  assert.equal(formatFileSize(1536), "1.5 KB");
  assert.equal(formatFileSize(1024 * 1024 * 2.4), "2.4 MB");
  assert.equal(formatFileSize(1024 * 1024 * 1024 * 1.5), "1.50 GB");
  assert.equal(formatFileSize(null), "0 B");
  assert.equal(formatFileSize("invalid"), "0 B");
  assert.equal(formatFileSize(-10), "0 B");
});

test("ShelfEngine - staging files into isolated temp directory", async () => {
  const testTempDir = path.join(os.tmpdir(), `test-shelf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  fs.mkdirSync(testTempDir, { recursive: true });

  // Create mock source files
  const srcDir = path.join(testTempDir, "source");
  fs.mkdirSync(srcDir, { recursive: true });
  const testFile1 = path.join(srcDir, "beach.jpg");
  fs.writeFileSync(testFile1, "fake-image-bytes-content-for-testing");

  const testSubDir = path.join(srcDir, "Project files");
  fs.mkdirSync(testSubDir, { recursive: true });
  fs.writeFileSync(path.join(testSubDir, "document.txt"), "hello world");

  const shelfStagingDir = path.join(testTempDir, "staging");
  const engine = createShelfEngine({
    tempDir: shelfStagingDir,
    app: {
      getFileIcon: async () => ({
        isEmpty: () => false,
        toDataURL: () => "data:image/png;base64,mockicon"
      })
    },
    shell: {
      openPath: async (p) => true,
      showItemInFolder: (p) => true
    }
  });

  // 1. Initially empty
  assert.equal(engine.getItems().length, 0);

  // 2. Add single file
  const itemsAfterFile = await engine.addFiles([testFile1]);
  assert.equal(itemsAfterFile.length, 1);
  assert.equal(itemsAfterFile[0].name, "beach.jpg");
  assert.equal(itemsAfterFile[0].ext, "jpg");
  assert.equal(itemsAfterFile[0].isFolder, false);
  assert.equal(itemsAfterFile[0].iconDataUrl, "data:image/png;base64,mockicon");
  assert.ok(fs.existsSync(itemsAfterFile[0].stagedPath));
  assert.equal(fs.readFileSync(itemsAfterFile[0].stagedPath, "utf8"), "fake-image-bytes-content-for-testing");

  // 3. Add folder
  const itemsAfterFolder = await engine.addFiles([testSubDir]);
  assert.equal(itemsAfterFolder.length, 2);
  const folderItem = itemsAfterFolder.find((it) => it.name === "Project files");
  assert.ok(folderItem);
  assert.equal(folderItem.isFolder, true);
  assert.equal(folderItem.sizeFormatted, "Folder");
  assert.ok(fs.existsSync(path.join(folderItem.stagedPath, "document.txt")));

  // 4. Non-existent file is ignored safely
  const itemsAfterBogus = await engine.addFiles(["C:\\non_existent_file_path_12345.xyz"]);
  assert.equal(itemsAfterBogus.length, 2);

  // 4b. Dropping an already-staged file back onto the shelf does not duplicate it
  const itemsAfterSelfDrop = await engine.addFiles([itemsAfterFile[0].stagedPath]);
  assert.equal(itemsAfterSelfDrop.length, 2);

  // 5. Remove single item
  const updatedItems = engine.removeItem(itemsAfterFile[0].id);
  assert.equal(updatedItems.length, 1);
  assert.equal(fs.existsSync(itemsAfterFile[0].stagedPath), false);

  // 6. Clear all
  const emptyItems = engine.clearShelf();
  assert.equal(emptyItems.length, 0);
  assert.equal(engine.getItems().length, 0);

  // Clean up test temp dir
  fs.rmSync(testTempDir, { recursive: true, force: true });
});

test("ShelfEngine - startDrag and openFile interfaces", async () => {
  const testTempDir = path.join(os.tmpdir(), `test-shelf-drag-${Date.now()}`);
  fs.mkdirSync(testTempDir, { recursive: true });
  const testFile = path.join(testTempDir, "report.pdf");
  fs.writeFileSync(testFile, "pdf-data");

  let openedPath = null;
  let dragPayload = null;

  const engine = createShelfEngine({
    tempDir: path.join(testTempDir, "staging"),
    shell: {
      openPath: async (p) => {
        openedPath = p;
        return "";
      }
    }
  });

  const [item] = await engine.addFiles([testFile]);

  // Test openFile
  await engine.openFile(item.id);
  assert.equal(openedPath, item.stagedPath);

  // Test startDrag
  const mockSender = {
    startDrag: (payload) => {
      dragPayload = payload;
    }
  };

  const success = await engine.startDrag(item.id, mockSender);
  assert.equal(success, true);
  assert.equal(dragPayload.file, item.stagedPath);
  assert.ok(dragPayload.icon && String(dragPayload.icon).startsWith("data:image/png;base64,"));

  // Clean up
  fs.rmSync(testTempDir, { recursive: true, force: true });
});

test("ShelfEngine - image and PDF thumbnail generation", async () => {
  const testTempDir = path.join(os.tmpdir(), `test-shelf-thumb-${Date.now()}`);
  fs.mkdirSync(testTempDir, { recursive: true });
  const imgFile = path.join(testTempDir, "preview.png");
  fs.writeFileSync(imgFile, "mock-png-data");
  const pdfFile = path.join(testTempDir, "document.pdf");
  fs.writeFileSync(pdfFile, "mock-pdf-data");

  let pdfRendered = false;
  let itemsChangedCount = 0;

  const engine = createShelfEngine({
    tempDir: path.join(testTempDir, "staging"),
    nativeImage: {
      createFromPath: (filePath) => ({
        isEmpty: () => false,
        resize: () => ({
          toDataURL: () => "data:image/png;base64,mockImageThumbnail"
        })
      }),
      createFromDataURL: (dataUrl) => ({
        isEmpty: () => false,
        resize: () => ({
          toDataURL: () => dataUrl
        })
      })
    },
    renderPdfThumbnail: async (pdfPath) => {
      pdfRendered = true;
      return "data:image/png;base64,mockPdfCoverPage";
    },
    onItemsChange: () => {
      itemsChangedCount++;
    }
  });

  const addedItems = await engine.addFiles([imgFile, pdfFile]);
  assert.equal(addedItems.length, 2);

  const imgItem = addedItems.find((it) => it.name === "preview.png");
  assert.ok(imgItem);
  assert.equal(imgItem.thumbnailDataUrl, "data:image/png;base64,mockImageThumbnail");

  // Allow async PDF thumbnail renderer to resolve
  await new Promise((resolve) => setTimeout(resolve, 50));
  const pdfItem = engine.getItems().find((it) => it.name === "document.pdf");
  assert.ok(pdfItem);
  assert.equal(pdfRendered, true);
  assert.equal(pdfItem.thumbnailDataUrl, "data:image/png;base64,mockPdfCoverPage");
  assert.ok(itemsChangedCount > 0);

  fs.rmSync(testTempDir, { recursive: true, force: true });
});
