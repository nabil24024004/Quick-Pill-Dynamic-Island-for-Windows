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

  // Debounced auto-save directly committing the active note
  useEffect(() => {
    const trimmed = draftContent.trim();
    if (!trimmed) {
      setDraftSaveStatus("saved");
      return;
    }

    setDraftSaveStatus("dirty");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      setDraftSaveStatus("saving");
      try {
        const autoTitle = draftTitle.trim() || trimmed.split("\n")[0].slice(0, 36) || "Untitled Note";
        const payload = {
          content: trimmed,
          title: autoTitle
        };
        if (activeEditingNoteId) {
          payload.id = activeEditingNoteId;
        }

        let savedNote = null;
        if (window.electronAPI?.notes?.saveNote) {
          savedNote = await window.electronAPI.notes.saveNote(payload);
        }

        if (!savedNote) {
          savedNote = {
            id: activeEditingNoteId || ("note_" + Date.now()),
            title: autoTitle,
            content: trimmed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }

        if (!activeEditingNoteId && savedNote?.id) {
          setActiveEditingNoteId(savedNote.id);
        }

        setNotes(prev => {
          const list = Array.isArray(prev) ? [...prev] : [];
          const idx = list.findIndex(n => n.id === savedNote.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...savedNote };
            return list;
          }
          return [savedNote, ...list];
        });

        try {
          const cached = localStorage.getItem("quick_pill_notes_cache");
          const list = cached ? JSON.parse(cached) : [];
          const idx = list.findIndex(n => n.id === savedNote.id);
          if (idx >= 0) list[idx] = savedNote;
          else list.unshift(savedNote);
          localStorage.setItem("quick_pill_notes_cache", JSON.stringify(list));
        } catch (_) {}

        setDraftSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save note error:", err);
        setDraftSaveStatus("saved");
      }
    }, 500);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [draftContent, draftTitle, activeEditingNoteId]);

  const handleNewNote = useCallback(() => {
    setActiveEditingNoteId(null);
    setDraftTitle("");
    setDraftContent("");
    setDraftSaveStatus("saved");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, []);

  const handlePasteClipboard = useCallback(async () => {
    let text = "";
    if (window.electronAPI?.getClipboardText) {
      try { text = await window.electronAPI.getClipboardText(); } catch (_) {}
    }
    if (!text && navigator.clipboard?.readText) {
      try { text = await navigator.clipboard.readText(); } catch (_) {}
    }
    if (text && text.trim()) {
      setDraftContent(prev => prev ? `${prev}\n${text.trim()}` : text.trim());
      showStatus("✓ Pasted from clipboard");
    } else {
      showStatus("Clipboard is empty");
    }
  }, [showStatus]);

  const handleSelectNote = useCallback((note) => {
    setActiveEditingNoteId(note.id);
    setDraftTitle(note.title || "");
    setDraftContent(note.content || "");
    setDraftSaveStatus("saved");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, []);

  const handleDeleteNoteQuick = useCallback(async (e, noteId) => {
    e.stopPropagation();
    if (activeEditingNoteId === noteId) {
      setActiveEditingNoteId(null);
      setDraftTitle("");
      setDraftContent("");
      setDraftSaveStatus("saved");
    }
    setNotes(prev => prev.filter(n => n.id !== noteId));
    try {
      const cached = localStorage.getItem("quick_pill_notes_cache");
      if (cached) {
        const list = JSON.parse(cached).filter(n => n.id !== noteId);
        localStorage.setItem("quick_pill_notes_cache", JSON.stringify(list));
      }
    } catch (_) {}
    if (window.electronAPI?.notes?.deleteNote) {
      window.electronAPI.notes.deleteNote(noteId).catch(() => {});
    }
  }, [activeEditingNoteId]);

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
        padding: "8px 12px",
        boxSizing: "border-box",
        gap: 10,
        userSelect: "none",
        position: "relative"
      }}
    >
      {/* LEFT COLUMN: 130px width — Header with + New & Paste, plus Scrollable Notes List */}
      <div
        style={{
          width: 130,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flexShrink: 0,
          boxSizing: "border-box"
        }}
      >
        {/* Left Header: Title + +New + Paste */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2px",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <FileText size={12} color="#10b981" />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#ffffff", letterSpacing: "0.2px" }}>
              Notes
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {/* + New Button */}
            <button
              type="button"
              onClick={handleNewNote}
              title="Create new note"
              style={{
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                borderRadius: 4,
                padding: "2px 5px",
                color: "#10b981",
                fontSize: 9,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 2
              }}
            >
              <Plus size={9} />
              New
            </button>

            {/* Paste Button */}
            <button
              type="button"
              onClick={handlePasteClipboard}
              title="Paste from clipboard"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 4,
                padding: "2px 4px",
                color: "rgba(255, 255, 255, 0.75)",
                fontSize: 9,
                cursor: "pointer",
                display: "flex",
                alignItems: "center"
              }}
            >
              <Copy size={9} />
            </button>
          </div>
        </div>

        {/* Saved Notes Scrollable List */}
        <div
          className="notes-scrollable"
          style={{
            flex: 1,
            maxHeight: 105,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            paddingRight: 2
          }}
        >
          {notes.length === 0 ? (
            <div
              style={{
                fontSize: 9.5,
                color: "rgba(255, 255, 255, 0.4)",
                textAlign: "center",
                marginTop: 20
              }}
            >
              No notes yet
            </div>
          ) : (
            notes.map((note) => {
              const isSelected = activeEditingNoteId === note.id;
              const title = note.title || (note.content ? note.content.split("\n")[0].slice(0, 24) : "Untitled Note");
              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className="note-item-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "3px 6px",
                    borderRadius: 5,
                    background: isSelected ? "rgba(16, 185, 129, 0.18)" : "rgba(255, 255, 255, 0.04)",
                    border: isSelected ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.05)",
                    cursor: "pointer",
                    gap: 4,
                    transition: "all 0.12s ease"
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.8)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                      minWidth: 0
                    }}
                    title={title}
                  >
                    {title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteNoteQuick(e, note.id)}
                    title="Delete note"
                    className="note-delete-btn"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.35)",
                      cursor: "pointer",
                      padding: 1,
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: flex: 1 — Clean Editor with 85px Textarea & Auto-save */}
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          boxSizing: "border-box"
        }}
      >
        {/* Right Top Status Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2px",
            height: 18,
            flexShrink: 0
          }}
        >
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.6)"
            }}
          >
            {activeEditingNoteId ? "Editing Note" : "Draft"}
          </span>

          {/* Auto-save Status Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: draftSaveStatus === "saved" ? "#10b981" : draftSaveStatus === "saving" ? "#38bdf8" : "#eab308",
                display: "flex",
                alignItems: "center",
                gap: 3
              }}
            >
              {draftSaveStatus === "saved" ? "✓ Saved" : draftSaveStatus === "saving" ? "Saving..." : "Unsaved"}
            </span>
          </div>
        </div>

        {/* Clean 85px Textarea */}
        <textarea
          ref={textareaRef}
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          placeholder="Write note here... (Auto-saves automatically)"
          style={{
            width: "100%",
            height: 85,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 8,
            padding: "6px 8px",
            color: "#ffffff",
            fontSize: 11,
            lineHeight: "1.4",
            fontFamily: "OpenRunde, system-ui, sans-serif",
            resize: "none",
            outline: "none",
            boxSizing: "border-box"
          }}
        />
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
