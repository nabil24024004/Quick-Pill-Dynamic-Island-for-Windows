import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, 
  X, 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Code, 
  Archive, 
  File,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

/**
 * Extracts native filesystem paths from a DataTransfer object using the host bridge helper
 * with fallback to File.path when available.
 */
export function extractFilePathsFromDataTransfer(dataTransfer) {
  const droppedFiles = dataTransfer?.files;
  if (!droppedFiles || droppedFiles.length === 0) return [];

  const filePaths = [];
  for (let i = 0; i < droppedFiles.length; i++) {
    const file = droppedFiles[i];
    if (!file) continue;
    let resolved = "";
    if (window.electronAPI?.shelf?.getPathForFile) {
      resolved = window.electronAPI.shelf.getPathForFile(file);
    } else if (window.electronAPI?.getPathForFile) {
      resolved = window.electronAPI.getPathForFile(file);
    }
    if (!resolved && typeof file.path === "string") {
      resolved = file.path;
    }
    if (resolved && typeof resolved === "string" && resolved.trim()) {
      filePaths.push(resolved.trim());
    }
  }
  return filePaths;
}

/**
 * Returns a styled 3D badge icon or rich thumbnail preview for files and folders,
 * with full visual preview rendering for images and PDFs.
 */
function renderFileVisual(itemOrExt, isFolderParam, iconDataUrlParam, thumbnailDataUrlParam) {
  let ext = "";
  let isFolder = false;
  let iconDataUrl = null;
  let thumbnailDataUrl = null;

  if (itemOrExt && typeof itemOrExt === "object") {
    ext = itemOrExt.ext || "";
    isFolder = Boolean(itemOrExt.isFolder);
    iconDataUrl = itemOrExt.iconDataUrl || null;
    thumbnailDataUrl = itemOrExt.thumbnailDataUrl || null;
  } else {
    ext = itemOrExt || "";
    isFolder = Boolean(isFolderParam);
    iconDataUrl = iconDataUrlParam || null;
    thumbnailDataUrl = thumbnailDataUrlParam || null;
  }

  const cleanExt = (ext || "").toLowerCase();

  // 1. Direct Visual Preview for Images and PDFs with thumbnailDataUrl
  if (thumbnailDataUrl) {
    const isPdf = cleanExt === "pdf";
    return (
      <div style={{
        width: 46,
        height: 46,
        borderRadius: 12,
        background: isPdf ? "#ffffff" : "#14151b",
        border: isPdf ? "1.5px solid rgba(239, 68, 68, 0.4)" : "1.5px solid rgba(255, 255, 255, 0.16)",
        boxShadow: isPdf ? "0 4px 12px rgba(239, 68, 68, 0.25)" : "0 4px 12px rgba(0,0,0,0.5)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }}>
        <img 
          src={thumbnailDataUrl} 
          alt="" 
          style={{
            width: "100%",
            height: "100%",
            objectFit: isPdf ? "contain" : "cover",
            display: "block"
          }} 
          draggable={false} 
        />
        {/* Subtle pill badge in corner showing extension */}
        <span style={{
          position: "absolute",
          bottom: 2,
          right: 2,
          background: isPdf ? "rgba(220, 38, 38, 0.95)" : "rgba(10, 14, 23, 0.85)",
          backdropFilter: "blur(4px)",
          color: "#ffffff",
          fontSize: 7.5,
          fontWeight: 800,
          padding: "1px 3.5px",
          borderRadius: 4,
          border: isPdf ? "0.5px solid rgba(255,255,255,0.4)" : "0.5px solid rgba(56, 189, 248, 0.35)",
          lineHeight: 1,
          letterSpacing: "0.2px",
          textTransform: "uppercase"
        }}>
          {isPdf ? "PDF" : cleanExt.slice(0, 4)}
        </span>
      </div>
    );
  }

  // 2. Folder visual
  if (isFolder) {
    return (
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35), inset 0 1px 1px rgba(255,255,255,0.45)"
      }}>
        <Folder size={24} color="#fff" fill="rgba(255,255,255,0.22)" />
      </div>
    );
  }

  // 3. Dedicated PDF card when thumbnail is still loading or unavailable
  if (cleanExt === "pdf") {
    return (
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4), inset 0 1px 1px rgba(255,255,255,0.4)",
        position: "relative"
      }}>
        <FileText size={20} color="#fff" />
        <span style={{
          position: "absolute",
          bottom: 2,
          background: "rgba(0, 0, 0, 0.6)",
          color: "#ffffff",
          fontSize: 7.5,
          fontWeight: 800,
          padding: "0.5px 3.5px",
          borderRadius: 3,
          lineHeight: 1
        }}>
          PDF
        </span>
      </div>
    );
  }

  // 4. Image card (fallback if thumbnail not yet ready)
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "avif"].includes(cleanExt)) {
    return (
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(56, 189, 248, 0.35), inset 0 1px 1px rgba(255,255,255,0.4)",
        position: "relative"
      }}>
        <ImageIcon size={20} color="#fff" />
        <span style={{
          position: "absolute",
          bottom: 2,
          background: "rgba(0, 0, 0, 0.6)",
          color: "#38bdf8",
          fontSize: 7.5,
          fontWeight: 800,
          padding: "0.5px 3.5px",
          borderRadius: 3,
          lineHeight: 1,
          textTransform: "uppercase"
        }}>
          {cleanExt.slice(0, 4)}
        </span>
      </div>
    );
  }

  // 5. Audio files
  if (["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(cleanExt)) {
    return (
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(236, 72, 153, 0.35), inset 0 1px 1px rgba(255,255,255,0.4)"
      }}>
        <Music size={22} color="#fff" />
      </div>
    );
  }

  // 6. Video files
  if (["mp4", "mkv", "mov", "avi", "webm"].includes(cleanExt)) {
    return (
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(168, 85, 247, 0.35), inset 0 1px 1px rgba(255,255,255,0.4)"
      }}>
        <Video size={22} color="#fff" />
      </div>
    );
  }

  // 7. Code files
  if (["js", "jsx", "ts", "tsx", "html", "css", "py", "rs", "go", "json", "c", "cpp", "cs", "java"].includes(cleanExt)) {
    return (
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35), inset 0 1px 1px rgba(255,255,255,0.4)"
      }}>
        <Code size={22} color="#fff" />
      </div>
    );
  }

  // 8. Archive files
  if (["zip", "rar", "7z", "tar", "gz"].includes(cleanExt)) {
    return (
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(249, 115, 22, 0.35), inset 0 1px 1px rgba(255,255,255,0.4)"
      }}>
        <Archive size={22} color="#fff" />
      </div>
    );
  }

  // 9. Document files
  if (["doc", "docx", "txt", "md", "rtf", "xls", "xlsx", "ppt", "pptx"].includes(cleanExt)) {
    return (
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(239, 68, 68, 0.35), inset 0 1px 1px rgba(255,255,255,0.4)"
      }}>
        <FileText size={22} color="#fff" />
      </div>
    );
  }

  // 10. Native OS Icon
  if (iconDataUrl) {
    return (
      <img 
        src={iconDataUrl} 
        alt="" 
        style={{ width: 42, height: 42, objectFit: "contain", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }} 
        draggable={false}
      />
    );
  }

  return (
    <div style={{
      width: 44,
      height: 44,
      borderRadius: 12,
      background: "linear-gradient(135deg, #64748b 0%, #334155 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 12px rgba(100, 116, 139, 0.35), inset 0 1px 1px rgba(255,255,255,0.4)"
    }}>
      <File size={22} color="#fff" />
    </div>
  );
}

const getFileTypeIcon = renderFileVisual;

export default function Shelf({ accentColor = "#38bdf8" }) {
  const [items, setItems] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef(null);
  const isSelfDraggingRef = useRef(false);
  const dragOverResetTimerRef = useRef(null);
  const dragPressRef = useRef(null);
  const wasDraggedRef = useRef(false);

  const checkScrollability = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  const scrollByAmount = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleWheel = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      e.stopPropagation();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      el.scrollLeft += delta;
      checkScrollability();
    }
  };

  const triggerNativeDragOut = (item) => {
    if (!item || isSelfDraggingRef.current) return;
    isSelfDraggingRef.current = true;
    wasDraggedRef.current = true;
    if (dragPressRef.current) {
      dragPressRef.current.started = true;
    }
    setIsDragOver(false);
    window.dispatchEvent(new CustomEvent("shelf-native-drag-start"));
    if (window.electronAPI?.shelf?.startDrag) {
      const islandEl = document.getElementById("Island");
      const r = islandEl ? islandEl.getBoundingClientRect() : null;
      const bounds = r && r.width > 0 ? {
        left: Math.round(r.left),
        top: Math.round(r.top),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom)
      } : null;
      window.electronAPI.shelf.startDrag(item.id || item.stagedPath, bounds);
    }
    setTimeout(() => {
      isSelfDraggingRef.current = false;
    }, 30000);
  };

  // Load items on mount and subscribe to IPC updates
  useEffect(() => {
    let isMounted = true;

    if (window.electronAPI?.shelf?.getItems) {
      window.electronAPI.shelf.getItems().then((currentItems) => {
        if (isMounted && Array.isArray(currentItems)) {
          setItems(currentItems);
        }
      }).catch((err) => {
        console.error("Failed to load shelf items:", err);
      });
    }

    let unsubscribeUpdate = null;
    if (window.electronAPI?.shelf?.onUpdate) {
      unsubscribeUpdate = window.electronAPI.shelf.onUpdate((updatedItems) => {
        if (isMounted && Array.isArray(updatedItems)) {
          setItems(updatedItems);
        }
      });
    }

    let unsubscribeDragEnd = null;
    if (window.electronAPI?.shelf?.onDragEnded) {
      unsubscribeDragEnd = window.electronAPI.shelf.onDragEnded(() => {
        isSelfDraggingRef.current = false;
        dragPressRef.current = null;
        if (isMounted) setIsDragOver(false);
      });
    }

    const handleWindowMouseMove = (e) => {
      const press = dragPressRef.current;
      if (!press || press.started) return;
      if ((e.buttons & 1) !== 1) {
        dragPressRef.current = null;
        return;
      }
      const dist = Math.hypot(e.clientX - press.startX, e.clientY - press.startY);
      if (dist >= 5) {
        triggerNativeDragOut(press.item);
      }
    };

    const handleWindowMouseUp = () => {
      dragPressRef.current = null;
    };

    const handleGlobalFileDragOver = () => {
      if (isSelfDraggingRef.current || !isMounted) return;
      setIsDragOver(true);
      if (dragOverResetTimerRef.current) clearTimeout(dragOverResetTimerRef.current);
      dragOverResetTimerRef.current = setTimeout(() => {
        if (isMounted) setIsDragOver(false);
      }, 240);
    };

    const handleGlobalFileDragEnd = () => {
      if (dragOverResetTimerRef.current) {
        clearTimeout(dragOverResetTimerRef.current);
        dragOverResetTimerRef.current = null;
      }
      if (isMounted) setIsDragOver(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("quick-pill-file-drag-over", handleGlobalFileDragOver);
    window.addEventListener("quick-pill-file-drag-end", handleGlobalFileDragEnd);

    return () => {
      isMounted = false;
      if (dragOverResetTimerRef.current) clearTimeout(dragOverResetTimerRef.current);
      if (typeof unsubscribeUpdate === "function") unsubscribeUpdate();
      if (typeof unsubscribeDragEnd === "function") unsubscribeDragEnd();
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("quick-pill-file-drag-over", handleGlobalFileDragOver);
      window.removeEventListener("quick-pill-file-drag-end", handleGlobalFileDragEnd);
    };
  }, []);

  // Update scrollability indicators on item changes or viewport adjustments
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScrollability();
    el.addEventListener("scroll", checkScrollability, { passive: true });
    window.addEventListener("resize", checkScrollability);
    return () => {
      el.removeEventListener("scroll", checkScrollability);
      window.removeEventListener("resize", checkScrollability);
    };
  }, [items, checkScrollability]);

  const activateDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    if (isSelfDraggingRef.current) return;
    if (!isDragOver) setIsDragOver(true);
    if (dragOverResetTimerRef.current) clearTimeout(dragOverResetTimerRef.current);
    dragOverResetTimerRef.current = setTimeout(() => {
      setIsDragOver(false);
    }, 240);
  };

  const handleDragEnter = (e) => {
    activateDragOver(e);
  };

  const handleDragOver = (e) => {
    activateDragOver(e);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) {
      return;
    }
    if (dragOverResetTimerRef.current) {
      clearTimeout(dragOverResetTimerRef.current);
      dragOverResetTimerRef.current = null;
    }
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverResetTimerRef.current) {
      clearTimeout(dragOverResetTimerRef.current);
      dragOverResetTimerRef.current = null;
    }
    setIsDragOver(false);

    if (isSelfDraggingRef.current) {
      isSelfDraggingRef.current = false;
      return;
    }

    const filePaths = extractFilePathsFromDataTransfer(e.dataTransfer);
    if (filePaths.length > 0 && window.electronAPI?.shelf?.addFiles) {
      try {
        const updated = await window.electronAPI.shelf.addFiles(filePaths);
        if (Array.isArray(updated)) setItems(updated);
      } catch (err) {
        console.error("Failed to add files to shelf:", err);
      }
    }
  };

  // Handle clicking an item (open with default application)
  const handleItemClick = (e, item) => {
    e.stopPropagation();
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    if (window.electronAPI?.shelf?.openFile) {
      window.electronAPI.shelf.openFile(item.id || item.stagedPath);
    }
  };

  // Handle mouse down on an item to prime drag-out fallback
  const handleItemMouseDown = (e, item) => {
    if (e.button !== 0) return;
    if (e.target && e.target.closest && e.target.closest("button")) return;
    wasDraggedRef.current = false;
    dragPressRef.current = {
      item,
      startX: e.clientX,
      startY: e.clientY,
      started: false
    };
  };

  // Handle right-clicking an item (show in File Explorer)
  const handleItemContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.electronAPI?.shelf?.showInFolder) {
      window.electronAPI.shelf.showInFolder(item.id || item.stagedPath);
    }
  };

  // Handle removing single item
  const handleRemoveItem = (e, id) => {
    e.stopPropagation();
    if (window.electronAPI?.shelf?.removeItem) {
      window.electronAPI.shelf.removeItem(id).then((updated) => {
        if (Array.isArray(updated)) setItems(updated);
      });
    }
  };

  // Handle clearing all items
  const handleClear = (e) => {
    e.stopPropagation();
    if (window.electronAPI?.shelf?.clear) {
      window.electronAPI.shelf.clear().then((updated) => {
        if (Array.isArray(updated)) setItems(updated);
      });
    }
  };

  // Handle dragging an item OUT to OS / external app
  const handleDragStart = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    triggerNativeDragOut(item);
  };

  const hasItems = items.length > 0;

  return (
    <div 
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        padding: "8px 14px 10px 14px",
        boxSizing: "border-box",
        position: "relative"
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header bar: "Shelf", optional "Clear" button, centered status */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
        paddingLeft: 4,
        paddingRight: 4,
        position: "relative",
        minHeight: 22
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, zIndex: 2 }}>
          <span style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.01em",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)"
          }}>
            Shelf
          </span>

          {hasItems && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={handleClear}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#9ca3af",
                borderRadius: 999,
                padding: "2px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                outline: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.color = "#9ca3af";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
              }}
            >
              Clear
            </motion.button>
          )}
        </div>

        {/* Centered Status indicator */}
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          opacity: 0.85,
          pointerEvents: "none"
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: hasItems ? "#10b981" : "rgba(255,255,255,0.25)",
            boxShadow: hasItems ? "0 0 8px rgba(16, 185, 129, 0.65)" : "none"
          }} />
          <span style={{ fontSize: 11.5, color: "#9ca3af", fontWeight: 500 }}>
            {hasItems ? `${items.length} ${items.length === 1 ? "file" : "files"}` : "Session Stash"}
          </span>
        </div>

        <div style={{ width: 24 }} />
      </div>

      {/* Main Body: Drop Zone and/or Populated Carousel */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        minHeight: 0
      }}>
        {/* Left Scroll Navigation Button */}
        {hasItems && canScrollLeft && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); scrollByAmount(-180); }}
            title="Scroll left"
            style={{
              position: "absolute",
              left: 4,
              top: "50%",
              transform: "translateY(-50%)",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(15, 23, 42, 0.88)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              backdropFilter: "blur(8px)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 15,
              boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(56, 189, 248, 0.35)";
              e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(15, 23, 42, 0.88)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
            }}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
        )}

        {/* Right Scroll Navigation Button */}
        {hasItems && canScrollRight && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); scrollByAmount(180); }}
            title="Scroll right"
            style={{
              position: "absolute",
              right: 4,
              top: "50%",
              transform: "translateY(-50%)",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(15, 23, 42, 0.88)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              backdropFilter: "blur(8px)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 15,
              boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(56, 189, 248, 0.35)";
              e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(15, 23, 42, 0.88)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
            }}
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        )}

        {/* Populated File Carousel (remains mounted underneath when dragging over) */}
        {hasItems && (
          <div
            ref={scrollRef}
            className="shelf-scrollable"
            data-scrollable="true"
            data-horizontal-scrollable="true"
            onWheel={handleWheel}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              overflowX: "auto",
              overflowY: "hidden",
              padding: "4px 8px 6px 8px",
              boxSizing: "border-box",
              scrollBehavior: "smooth",
              opacity: isDragOver ? 0.35 : 1,
              transition: "opacity 0.15s ease"
            }}
          >
            {items.map((item) => {
              const isHovered = hoveredItemId === item.id;

              return (
                <div
                  key={item.id}
                  className="shelf-item"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onMouseDown={(e) => handleItemMouseDown(e, item)}
                  onClick={(e) => handleItemClick(e, item)}
                  onContextMenu={(e) => handleItemContextMenu(e, item)}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  title={`${item.name} (${item.sizeFormatted})\nClick to open · Drag out to copy · Right-click to reveal`}
                  style={{
                    flexShrink: 0,
                    width: 82,
                    height: 92,
                    borderRadius: 14,
                    background: isHovered 
                      ? "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)" 
                      : "transparent",
                    border: isHovered ? "1px solid rgba(255, 255, 255, 0.16)" : "1px solid transparent",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "grab",
                    position: "relative",
                    padding: "4px 3px 2px 3px",
                    boxSizing: "border-box",
                    transition: "background 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
                    transform: isHovered ? "translateY(-1px)" : "none",
                    WebkitUserDrag: "element"
                  }}
                >
                  {/* Delete 'X' button on hover */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleRemoveItem(e, item.id)}
                        title="Remove from Shelf"
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "rgba(239, 68, 68, 0.9)",
                          border: "none",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          zIndex: 5,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.5)"
                        }}
                      >
                        <X size={11} strokeWidth={2.5} />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* File Visual (Image thumbnail, PDF cover, OS icon, or 3D badge) */}
                  <div style={{ marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    {renderFileVisual(item)}
                  </div>

                  {/* File Name (2-line clamp with word break for easy distinction) */}
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: "#f3f4f6",
                    textAlign: "center",
                    width: "100%",
                    maxHeight: 26,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    wordBreak: "break-all",
                    lineHeight: 1.2,
                    pointerEvents: "none"
                  }}>
                    {item.name}
                  </span>

                  {/* File Size / Type */}
                  <span style={{
                    fontSize: 9,
                    color: "#9ca3af",
                    textAlign: "center",
                    lineHeight: 1.1,
                    marginTop: 2,
                    pointerEvents: "none"
                  }}>
                    {item.sizeFormatted}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State OR Drag-Over Overlay */}
        {(!hasItems || isDragOver) && (
          <motion.div
            initial={{ opacity: 0.85 }}
            animate={{ 
              opacity: 1,
              borderColor: isDragOver ? accentColor : "rgba(255, 255, 255, 0.18)",
              backgroundColor: isDragOver 
                ? (hasItems ? "rgba(10, 14, 22, 0.78)" : "rgba(56, 189, 248, 0.08)") 
                : "rgba(18, 19, 24, 0.4)"
            }}
            transition={{ duration: 0.15 }}
            style={{
              position: hasItems ? "absolute" : "relative",
              inset: hasItems ? 0 : undefined,
              zIndex: hasItems ? 10 : 1,
              backdropFilter: hasItems && isDragOver ? "blur(3px)" : "none",
              width: "100%",
              height: "100%",
              borderRadius: 16,
              border: `1.5px dashed ${isDragOver ? accentColor : "rgba(255, 255, 255, 0.18)"}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              boxSizing: "border-box",
              cursor: "default",
              pointerEvents: "none"
            }}
          >
            <motion.div
              animate={isDragOver ? { y: [-2, 2, -2] } : { y: 0 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            >
              <Inbox size={26} color={isDragOver ? accentColor : "#9ca3af"} />
            </motion.div>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: isDragOver ? "#ffffff" : "#e5e7eb",
              letterSpacing: "-0.01em"
            }}>
              {isDragOver ? "Release to add" : "Drop files here"}
            </span>
            <span style={{
              fontSize: 10.5,
              color: "#6b7280",
              fontWeight: 400
            }}>
              Drag out anytime · click to open
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
