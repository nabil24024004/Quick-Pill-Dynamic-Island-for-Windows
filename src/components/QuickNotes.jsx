import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Star,
  Archive,
  Trash2,
  Copy,
  Check,
  Tag,
  Undo,
  Clock,
  Sparkles,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  CheckSquare,
  X
} from "lucide-react";

export default function QuickNotes({
  onTaskCreated,
  accentColor = "#10b981",
  textColor = "#ffffff"
}) {
  const [viewMode, setViewMode] = useState("composer"); // 'composer' | 'inbox'
  const [filter, setFilter] = useState("all"); // 'all' | 'recent' | 'pinned' | 'archived'
  const [selectedTag, setSelectedTag] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Composer State
  const [draftContent, setDraftContent] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSaveStatus, setDraftSaveStatus] = useState("saved"); // 'saved' | 'saving' | 'dirty'
  const [activeEditingNoteId, setActiveEditingNoteId] = useState(null);

  // Toast / Modals
  const [statusMessage, setStatusMessage] = useState(null);
  const [contextGuardModal, setContextGuardModal] = useState(null); // { text, charCount, byteCount, preview, source }
  const [undoDeleteNote, setUndoDeleteNote] = useState(null); // deleted note info for undo banner

  const textareaRef = useRef(null);
  const autosaveTimerRef = useRef(null);

  const showStatus = useCallback((msg, duration = 3000) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(prev => prev === msg ? null : prev);
    }, duration);
  }, []);

  // Load notes and tags from backend
  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.notes) {
        const [fetchedNotes, fetchedTags] = await Promise.all([
          window.electronAPI.notes.getNotes(filter, { tag: selectedTag }),
          window.electronAPI.notes.getTags().catch(() => [])
        ]);

        if (Array.isArray(fetchedNotes)) {
          setNotes(fetchedNotes);
          try {
            localStorage.setItem("quick_pill_notes_cache", JSON.stringify(fetchedNotes));
          } catch (_) {}
        }
        if (Array.isArray(fetchedTags)) setTags(fetchedTags);
      } else {
        try {
          const cached = localStorage.getItem("quick_pill_notes_cache");
          if (cached) setNotes(JSON.parse(cached));
        } catch (_) {}
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
      try {
        const cached = localStorage.getItem("quick_pill_notes_cache");
        if (cached) setNotes(JSON.parse(cached));
      } catch (_) {}
    } finally {
      setIsLoading(false);
    }
  }, [filter, selectedTag]);

  // Load dirty draft on startup
  useEffect(() => {
    if (window.electronAPI?.notes?.getDraft) {
      window.electronAPI.notes.getDraft().then(draft => {
        if (draft && typeof draft.content === "string" && draft.content.trim()) {
          setDraftContent(draft.content);
          if (draft.title) setDraftTitle(draft.title);
          setDraftSaveStatus("dirty");
          showStatus("Restored unsaved draft");
        }
      }).catch(() => {});
    }
  }, [showStatus]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Listen for backend notes updates
  useEffect(() => {
    if (window.electronAPI?.notes?.onNotesUpdated) {
      const unsub = window.electronAPI.notes.onNotesUpdated(() => {
        loadNotes();
      });
      return unsub;
    }
  }, [loadNotes]);

  // Debounced autosave for active composer draft
  useEffect(() => {
    if (!draftContent.trim()) {
      setDraftSaveStatus("saved");
      return;
    }

    setDraftSaveStatus("dirty");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      if (window.electronAPI?.notes?.saveDraft) {
        setDraftSaveStatus("saving");
        window.electronAPI.notes.saveDraft({
          content: draftContent,
          title: draftTitle,
          noteId: activeEditingNoteId
        }).then(() => {
          setDraftSaveStatus("saved");
        }).catch(() => {
          setDraftSaveStatus("dirty");
        });
      }
    }, 400);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [draftContent, draftTitle, activeEditingNoteId]);

  // Handle Save Note (Commit)
  const handleSaveNote = useCallback(async () => {
    const trimmedContent = draftContent.trim();
    if (!trimmedContent) {
      showStatus("Cannot save empty note");
      return;
    }

    try {
      const payload = {
        content: trimmedContent,
        title: draftTitle.trim() || undefined
      };
      if (activeEditingNoteId) {
        payload.id = activeEditingNoteId;
      }

      let savedNote = null;
      if (window.electronAPI?.notes?.saveNote) {
        savedNote = await window.electronAPI.notes.saveNote(payload);
      }

      // If backend did not return or returned null, construct an optimistic note object
      if (!savedNote) {
        savedNote = {
          id: activeEditingNoteId || ("note_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6)),
          title: payload.title || (trimmedContent.split("\n")[0].slice(0, 50) || "Untitled Note"),
          content: trimmedContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          isPinned: false,
          isArchived: false
        };
      }

      // 1. Optimistic state update so note appears instantly in the notes list
      setNotes(prev => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const idx = list.findIndex(n => n.id === savedNote.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...savedNote };
          return list;
        }
        return [savedNote, ...list];
      });

      // 2. Persist to local cache
      try {
        const cached = localStorage.getItem("quick_pill_notes_cache");
        const list = cached ? JSON.parse(cached) : [];
        const idx = list.findIndex(n => n.id === savedNote.id);
        if (idx >= 0) list[idx] = savedNote;
        else list.unshift(savedNote);
        localStorage.setItem("quick_pill_notes_cache", JSON.stringify(list));
      } catch (_) {}

      // 3. Clear draft and active editing state
      setDraftContent("");
      setDraftTitle("");
      setActiveEditingNoteId(null);
      setDraftSaveStatus("saved");
      if (window.electronAPI?.notes?.clearDraft) {
        window.electronAPI.notes.clearDraft().catch(() => {});
      }

      // 4. Switch view to inbox and reset filters so the newly saved note is front and center
      setViewMode("inbox");
      setFilter("all");
      setSelectedTag(null);
      setSearchQuery("");

      showStatus(activeEditingNoteId ? "✓ Note updated" : "✓ Note added to inbox");

      // 5. Sync from backend
      loadNotes();
    } catch (err) {
      console.error("Save note error:", err);
      showStatus("Error saving note: " + (err.message || "Failed"), 4000);
    }
  }, [draftContent, draftTitle, activeEditingNoteId, showStatus, loadNotes]);

  // Edit existing note in composer
  const handleEditNote = useCallback((note) => {
    setActiveEditingNoteId(note.id);
    setDraftTitle(note.title || "");
    setDraftContent(note.content || "");
    setViewMode("composer");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, []);

  // Toggle pin
  const handleTogglePin = useCallback(async (e, noteId) => {
    e.stopPropagation();
    try {
      if (window.electronAPI?.notes?.togglePin) {
        await window.electronAPI.notes.togglePin(noteId);
        loadNotes();
      }
    } catch (_) {}
  }, [loadNotes]);

  // Toggle archive
  const handleToggleArchive = useCallback(async (e, noteId) => {
    e.stopPropagation();
    try {
      if (window.electronAPI?.notes?.toggleArchive) {
        const res = await window.electronAPI.notes.toggleArchive(noteId);
        showStatus(res?.isArchived ? "Note archived" : "Note restored");
        loadNotes();
      }
    } catch (_) {}
  }, [loadNotes, showStatus]);

  // Delete note with undo buffer
  const handleDeleteNote = useCallback(async (e, note) => {
    e.stopPropagation();
    try {
      if (window.electronAPI?.notes?.deleteNote) {
        await window.electronAPI.notes.deleteNote(note.id);
        setUndoDeleteNote(note);
        loadNotes();
        showStatus(`Deleted "${note.title || "Note"}" (Click Undo to restore)`, 5000);
      }
    } catch (err) {
      showStatus("Failed to delete note: " + err.message, 3000);
    }
  }, [loadNotes, showStatus]);

  // Undo delete
  const handleUndoDelete = useCallback(async () => {
    try {
      if (window.electronAPI?.notes?.undoDelete) {
        const res = await window.electronAPI.notes.undoDelete();
        if (res?.success) {
          setUndoDeleteNote(null);
          showStatus("✓ Note restored");
          loadNotes();
        }
      }
    } catch (_) {}
  }, [loadNotes, showStatus]);

  // Copy note content
  const handleCopyNote = useCallback((e, note) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(note.content || "");
      showStatus("✓ Note copied to clipboard");
    } catch (_) {
      showStatus("Could not access clipboard");
    }
  }, [showStatus]);

  // Contextual Capture from Clipboard / Selection
  const handleContextualCapture = useCallback(async () => {
    showStatus("Reading clipboard...");
    try {
      let text = "";

      // 1. Primary: Use window.electronAPI.getClipboardText (same rock-solid method as Clipboard tab)
      if (window.electronAPI?.getClipboardText) {
        try {
          text = await window.electronAPI.getClipboardText();
        } catch (_) {}
      }

      // 2. Secondary fallback: Web Clipboard API
      if (!text && navigator.clipboard?.readText) {
        try {
          text = await navigator.clipboard.readText();
        } catch (_) {}
      }

      // 3. Tertiary fallback: Notes context adapter
      if (!text && window.electronAPI?.notes?.getContextualCapture) {
        try {
          const res = await window.electronAPI.notes.getContextualCapture();
          if (res?.success && res.content) {
            text = res.content;
          }
        } catch (_) {}
      }

      if (!text || !text.trim()) {
        showStatus("Clipboard is empty or contains no text");
        return;
      }

      // If content is very large (>2500 chars), prompt guard modal
      if (text.length > 2500) {
        setContextGuardModal({
          text,
          charCount: text.length,
          byteCount: new Blob([text]).size,
          preview: text.slice(0, 160) + "...",
          source: "Clipboard"
        });
        return;
      }

      // Append or replace into draft
      setDraftContent(prev => (prev && prev.trim() ? `${prev}\n\n${text}` : text));
      setViewMode("composer");
      showStatus("✓ Pasted clipboard into note");
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } catch (err) {
      showStatus("Clipboard error: " + (err.message || "Failed to read"), 3500);
    }
  }, [showStatus]);

  // Confirm large contextual capture
  const handleConfirmContextGuard = useCallback(() => {
    if (!contextGuardModal) return;
    setDraftContent(prev => (prev && prev.trim() ? `${prev}\n\n${contextGuardModal.text}` : contextGuardModal.text));
    setContextGuardModal(null);
    setViewMode("composer");
    showStatus("✓ Large payload pasted into composer");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [contextGuardModal, showStatus]);

  // Note-to-Task Conversion
  const handleConvertToTask = useCallback(async (e, note) => {
    e.stopPropagation();
    try {
      if (window.electronAPI?.notes?.convertToTask) {
        const task = await window.electronAPI.notes.convertToTask(note);
        if (task) {
          if (typeof onTaskCreated === "function") {
            onTaskCreated(task);
          }
          showStatus(`✓ Task created: "${task.title}"`);
        }
      }
    } catch (err) {
      showStatus("Task conversion failed: " + err.message, 3500);
    }
  }, [onTaskCreated, showStatus]);

  // Filtered notes list based on search and tags
  const displayedNotes = useMemo(() => {
    let list = Array.isArray(notes) ? notes : [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n =>
        n && (
          (typeof n.title === "string" && n.title.toLowerCase().includes(q)) ||
          (typeof n.content === "string" && n.content.toLowerCase().includes(q)) ||
          (Array.isArray(n.tags) && n.tags.some(t => typeof t === "string" && t.toLowerCase().includes(q)))
        )
      );
    }
    return list.filter(Boolean);
  }, [notes, searchQuery]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        boxSizing: "border-box",
        gap: 14,
        userSelect: "none",
        position: "relative"
      }}
    >
      {/* LEFT COLUMN: Sidebar summary, View Toggles & Tags */}
      <div
        className="notes-scrollable"
        style={{
          width: 175,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: 6,
          flexShrink: 0,
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: 4,
          boxSizing: "border-box"
        }}
      >
        {/* Top Header Card */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={14} color="#10b981" />
              <span style={{ fontSize: 11, fontWeight: 800, color: "#ffffff", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                Quick Notes
              </span>
            </div>
            {/* View Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === "composer") {
                  setViewMode("inbox");
                } else {
                  setViewMode("composer");
                  setActiveEditingNoteId(null);
                }
              }}
              title={viewMode === "composer" ? "View Notes Inbox" : "Compose New Note"}
              style={{
                background: viewMode === "composer" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: 6,
                padding: "3px 6px",
                color: viewMode === "composer" ? "#10b981" : "#ffffff",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              {viewMode === "composer" ? (
                <>
                  <Archive size={11} />
                  Inbox
                </>
              ) : (
                <>
                  <Plus size={11} />
                  New
                </>
              )}
            </button>
          </div>

          {/* Quick Contextual Capture Action */}
          <button
            type="button"
            onClick={handleContextualCapture}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 6,
              padding: "4px 8px",
              color: "#10b981",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <Copy size={11} />
            Capture Clipboard
          </button>

          {/* Stats Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "rgba(255, 255, 255, 0.45)" }}>
            <span>{Array.isArray(notes) ? notes.length : 0} notes</span>
            <span>{Array.isArray(tags) ? tags.length : 0} tags</span>
          </div>
        </div>

        {/* Filter Navigation (All / Recent / Pinned / Archived) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2, flexShrink: 0 }}>
          {[
            { id: "all", label: "All Notes" },
            { id: "recent", label: "Recent" },
            { id: "pinned", label: "Pinned" },
            { id: "archived", label: "Archived" }
          ].map(btn => {
            const isActive = filter === btn.id && viewMode === "inbox" && !selectedTag;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter(btn.id);
                  setSelectedTag(null);
                  setViewMode("inbox");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 8px",
                  borderRadius: 8,
                  background: isActive ? "rgba(16, 185, 129, 0.16)" : "transparent",
                  border: isActive ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid transparent",
                  color: isActive ? "#10b981" : "rgba(255, 255, 255, 0.65)",
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  fontFamily: "OpenRunde, system-ui, sans-serif"
                }}
              >
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tag Filters Section */}
        {Array.isArray(tags) && tags.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4, paddingBottom: 6, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px" }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Tags
              </span>
              {selectedTag && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTag(null);
                  }}
                  style={{ background: "transparent", border: "none", color: "#10b981", fontSize: 9, cursor: "pointer", padding: 0 }}
                >
                  Clear
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {tags.map(tagItem => {
                const tagName = typeof tagItem === "string" ? tagItem : (tagItem.tag || tagItem.name);
                const tagCount = typeof tagItem === "object" ? tagItem.count : null;
                const isSelected = selectedTag === tagName;
                return (
                  <button
                    key={tagName}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTag(isSelected ? null : tagName);
                      setViewMode("inbox");
                    }}
                    style={{
                      background: isSelected ? "rgba(16, 185, 129, 0.25)" : "rgba(255, 255, 255, 0.05)",
                      border: isSelected ? "1px solid rgba(16, 185, 129, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 12,
                      padding: "2px 6px",
                      color: isSelected ? "#10b981" : "rgba(255, 255, 255, 0.6)",
                      fontSize: 9.5,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      transition: "all 0.15s ease"
                    }}
                  >
                    <Tag size={9} />
                    <span>#{tagName}</span>
                    {tagCount !== null && (
                      <span style={{ opacity: 0.6, fontSize: 8.5 }}>({tagCount})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Composer OR Notes Inbox List */}
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflow: "hidden"
        }}
      >
        {viewMode === "composer" ? (
          /* ================= COMPOSER SURFACE ================= */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              height: "100%"
            }}
          >
            {/* Title / Status Bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Note Title (Optional)..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "OpenRunde, system-ui, sans-serif",
                  flex: 1
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 9.5,
                    color: draftSaveStatus === "saved" ? "#10b981" : draftSaveStatus === "saving" ? "#38bdf8" : "#eab308",
                    fontWeight: 600
                  }}
                >
                  {draftSaveStatus === "saved" ? "Autosaved" : draftSaveStatus === "saving" ? "Saving..." : "Unsaved"}
                </span>
                {activeEditingNoteId && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEditingNoteId(null);
                      setDraftTitle("");
                      setDraftContent("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.4)",
                      fontSize: 10,
                      cursor: "pointer"
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* Note Textarea Body */}
            <textarea
              ref={textareaRef}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSaveNote();
                }
              }}
              placeholder="Jot down a quick thought, paste a link, or use Ctrl+Enter to save..."
              style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 10,
                padding: "8px 10px",
                color: "#ffffff",
                fontSize: 12,
                lineHeight: "1.45",
                fontFamily: "OpenRunde, system-ui, sans-serif",
                resize: "none",
                outline: "none"
              }}
            />

            {/* Bottom Actions Bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.4)" }}>
                Press <b>Ctrl+Enter</b> to save
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setDraftContent("");
                    setDraftTitle("");
                    if (window.electronAPI?.notes?.clearDraft) {
                      window.electronAPI.notes.clearDraft();
                    }
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  style={{
                    background: "#059669",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 12px",
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  <Check size={12} />
                  Save Note
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= INBOX / SEARCH SURFACE ================= */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              height: "100%",
              overflow: "hidden"
            }}
          >
            {/* Search Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 10,
                padding: "5px 10px",
                boxSizing: "border-box"
              }}
            >
              <Search size={14} color="rgba(255, 255, 255, 0.5)" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, tags (#work), or text..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
                  fontSize: 12,
                  fontFamily: "OpenRunde, system-ui, sans-serif"
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer", padding: 0 }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Notes List */}
            <div
              className="notes-scrollable"
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 5,
                paddingRight: 4
              }}
            >
              {displayedNotes.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    color: "rgba(255, 255, 255, 0.4)",
                    fontSize: 11
                  }}
                >
                  <Sparkles size={18} opacity={0.4} />
                  <span>No notes found</span>
                </div>
              ) : (
                displayedNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => handleEditNote(note)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "6px 9px",
                      borderRadius: 8,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      cursor: "pointer",
                      gap: 4,
                      transition: "all 0.12s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "#ffffff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 220
                        }}
                      >
                        {note.title || "Untitled Note"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {/* Pin Button */}
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(e, note.id)}
                          title={note.pinned ? "Unpin note" : "Pin note"}
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px", color: note.pinned ? "#eab308" : "rgba(255, 255, 255, 0.3)" }}
                        >
                          <Star size={12} fill={note.pinned ? "#eab308" : "none"} />
                        </button>
                        {/* Convert to Task */}
                        <button
                          type="button"
                          onClick={(e) => handleConvertToTask(e, note)}
                          title="Convert to Task"
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px", color: "rgba(255, 255, 255, 0.4)" }}
                        >
                          <CheckSquare size={12} />
                        </button>
                        {/* Copy */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyNote(e, note)}
                          title="Copy content"
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px", color: "rgba(255, 255, 255, 0.4)" }}
                        >
                          <Copy size={12} />
                        </button>
                        {/* Archive */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleArchive(e, note.id)}
                          title={note.archived ? "Restore note" : "Archive note"}
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px", color: "rgba(255, 255, 255, 0.4)" }}
                        >
                          <Archive size={12} />
                        </button>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNote(e, note)}
                          title="Delete note"
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px", color: "rgba(239, 68, 68, 0.7)" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Snippet */}
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "rgba(255, 255, 255, 0.65)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {note.content}
                    </div>

                    {/* Metadata Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "rgba(255, 255, 255, 0.4)", marginTop: 2 }}>
                      <Clock size={10} />
                      <span>{(() => {
                        try {
                          const ts = note.updatedAt || note.createdAt;
                          const d = ts ? new Date(ts) : new Date();
                          return isNaN(d.getTime()) ? "Recent" : d.toLocaleDateString([], { month: "short", day: "numeric" });
                        } catch {
                          return "Recent";
                        }
                      })()}</span>
                      {Array.isArray(note.tags) && note.tags.length > 0 && (
                        <span style={{ color: "#10b981", fontWeight: 600 }}>
                          {note.tags.filter(t => typeof t === "string").map(t => `#${t}`).join(" ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Undo Delete Floating Banner */}
      {undoDeleteNote && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            zIndex: 100
          }}
        >
          <span>Note deleted</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            style={{
              background: "#10b981",
              border: "none",
              borderRadius: 4,
              padding: "2px 6px",
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 3
            }}
          >
            <Undo size={10} />
            Undo
          </button>
        </div>
      )}

      {/* Floating Status Message */}
      {statusMessage && !undoDeleteNote && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            color: "#ffffff",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            zIndex: 100,
            pointerEvents: "none"
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Large Content Confirmation Modal */}
      {contextGuardModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 16,
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              width: 320,
              background: "#111827",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                Large Clipboard Content
              </span>
              <button
                type="button"
                onClick={() => setContextGuardModal(null)}
                style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.5)", cursor: "pointer" }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.7)" }}>
              The clipboard contains <b>{contextGuardModal.charCount} characters</b> ({Math.round(contextGuardModal.byteCount / 1024)} KB). Confirm pasting into note?
            </div>

            <div
              style={{
                maxHeight: 60,
                overflowY: "auto",
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: 10,
                color: "rgba(255, 255, 255, 0.8)",
                whiteSpace: "pre-wrap"
              }}
            >
              {contextGuardModal.preview}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setContextGuardModal(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 10px",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmContextGuard}
                style={{
                  background: "#059669",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 12px",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Paste to Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
