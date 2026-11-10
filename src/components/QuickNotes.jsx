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
          window.electronAPI.notes.getNotes("everything", {}).catch(() => window.electronAPI.notes.getNotes(filter, { tag: selectedTag })),
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
    if (!noteId) return;

    let nextPinned = false;
    setNotes(prev => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex(n => n.id === noteId);
      if (idx >= 0) {
        const curPinned = Boolean(list[idx].isPinned ?? list[idx].pinned);
        nextPinned = !curPinned;
        list[idx] = { ...list[idx], isPinned: nextPinned, pinned: nextPinned };
        try {
          localStorage.setItem("quick_pill_notes_cache", JSON.stringify(list));
        } catch (_) {}
      }
      return list;
    });

    showStatus(nextPinned ? "✓ Note pinned to top" : "✓ Note unpinned");

    try {
      if (window.electronAPI?.notes?.togglePin) {
        await window.electronAPI.notes.togglePin(noteId);
      }
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  }, [showStatus]);

  // Toggle archive
  const handleToggleArchive = useCallback(async (e, noteId) => {
    e.stopPropagation();
    if (!noteId) return;

    let nextArchived = false;
    setNotes(prev => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex(n => n.id === noteId);
      if (idx >= 0) {
        const curArchived = Boolean(list[idx].isArchived ?? list[idx].archived);
        nextArchived = !curArchived;
        list[idx] = { ...list[idx], isArchived: nextArchived, archived: nextArchived };
        try {
          localStorage.setItem("quick_pill_notes_cache", JSON.stringify(list));
        } catch (_) {}
      }
      return list;
    });

    showStatus(nextArchived ? "✓ Note moved to Archive" : "✓ Note restored from Archive");

    try {
      if (window.electronAPI?.notes?.toggleArchive) {
        await window.electronAPI.notes.toggleArchive(noteId);
      }
    } catch (err) {
      console.error("Failed to toggle archive:", err);
    }
  }, [showStatus]);

  // Delete note with undo buffer
  const handleDeleteNote = useCallback(async (e, note) => {
    e.stopPropagation();
    if (!note) return;

    setUndoDeleteNote(note);
    setNotes(prev => {
      const list = Array.isArray(prev) ? prev.filter(n => n.id !== note.id) : [];
      try {
        localStorage.setItem("quick_pill_notes_cache", JSON.stringify(list));
      } catch (_) {}
      return list;
    });

    showStatus(`Deleted "${note.title || "Note"}" (Click Undo to restore)`, 5000);

    try {
      if (window.electronAPI?.notes?.deleteNote) {
        await window.electronAPI.notes.deleteNote(note.id);
      }
    } catch (err) {
      showStatus("Failed to delete note: " + err.message, 3000);
    }
  }, [showStatus]);

  // Undo delete
  const handleUndoDelete = useCallback(async () => {
    if (!undoDeleteNote) return;
    const noteToRestore = undoDeleteNote;
    setUndoDeleteNote(null);

    setNotes(prev => {
      const list = Array.isArray(prev) ? [noteToRestore, ...prev] : [noteToRestore];
      try {
        localStorage.setItem("quick_pill_notes_cache", JSON.stringify(list));
      } catch (_) {}
      return list;
    });

    showStatus("✓ Note restored");

    try {
      if (window.electronAPI?.notes?.undoDelete) {
        await window.electronAPI.notes.undoDelete();
      } else if (window.electronAPI?.notes?.saveNote) {
        await window.electronAPI.notes.saveNote(noteToRestore);
      }
      loadNotes();
    } catch (_) {}
  }, [undoDeleteNote, loadNotes, showStatus]);

  // Copy note content
  const handleCopyNote = useCallback(async (e, note) => {
    e.stopPropagation();
    if (!note) return;
    const textToCopy = note.content || note.title || "";
    try {
      if (window.electronAPI?.writeClipboardText) {
        await window.electronAPI.writeClipboardText(textToCopy);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showStatus("✓ Note content copied to clipboard");
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
    if (!note) return;
    try {
      let task = null;
      if (window.electronAPI?.notes?.convertToTask) {
        task = await window.electronAPI.notes.convertToTask(note);
      }
      if (!task || task.error || !task.title) {
        const cleanContent = typeof note.content === "string" ? note.content.trim() : "";
        const lines = cleanContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const title = (lines[0] || note.title || "Untitled Task").slice(0, 60);
        task = {
          id: "task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
          title,
          body: cleanContent,
          noteId: note.id ? String(note.id) : null,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: "quick_notes",
        };
      }
      if (typeof onTaskCreated === "function") {
        onTaskCreated(task);
      }
      showStatus(`✓ Converted to Task: "${task.title}"`);
    } catch (err) {
      showStatus("Task conversion failed: " + (err.message || "Failed"), 3500);
    }
  }, [onTaskCreated, showStatus]);

  // Compute counts for navigation badges
  const counts = useMemo(() => {
    const safeNotes = Array.isArray(notes) ? notes : [];
    let all = 0, pinned = 0, archived = 0;
    for (const n of safeNotes) {
      if (!n) continue;
      if (n.isArchived || n.archived) {
        archived++;
      } else {
        all++;
        if (n.isPinned || n.pinned) pinned++;
      }
    }
    return { all, recent: all, pinned, archived };
  }, [notes]);

  // Filtered notes list based on filter, selectedTag, and search
  const displayedNotes = useMemo(() => {
    let list = Array.isArray(notes) ? [...notes] : [];

    // Filter by view / tab
    if (filter === "archived") {
      list = list.filter(n => Boolean(n.isArchived ?? n.archived));
    } else if (filter === "pinned") {
      list = list.filter(n => Boolean(n.isPinned ?? n.pinned) && !Boolean(n.isArchived ?? n.archived));
    } else {
      // 'all' or 'recent'
      list = list.filter(n => !Boolean(n.isArchived ?? n.archived));
    }

    // Filter by selected tag
    if (selectedTag) {
      const target = selectedTag.toLowerCase();
      list = list.filter(n => Array.isArray(n.tags) && n.tags.some(t => typeof t === "string" && t.toLowerCase() === target));
    }

    // Filter by search query
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

    // Sorting: pinned notes stay on top in all / recent
    list.sort((a, b) => {
      if (filter === "all" || filter === "recent") {
        const aPin = Boolean(a.isPinned ?? a.pinned);
        const bPin = Boolean(b.isPinned ?? b.pinned);
        if (aPin !== bPin) return bPin ? 1 : -1;
      }
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return list.filter(Boolean);
  }, [notes, filter, selectedTag, searchQuery]);

  const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';

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
        gap: 12,
        userSelect: "none",
        position: "relative",
        fontFamily: iosFontStack
      }}
    >
      {/* LEFT COLUMN: 3D Beveled Notes Console Pod, View Toggles & Tags */}
      <div
        className="notes-scrollable"
        style={{
          width: 178,
          height: "100%",
          borderRadius: 16,
          padding: 4,
          background: "linear-gradient(145deg, #1a2a24 0%, #0f1815 55%, #070b0a 100%)",
          boxShadow: `
            0 10px 22px rgba(0, 0, 0, 0.85),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.16),
            inset 0 -2px 4px rgba(0, 0, 0, 0.9)
          `,
          flexShrink: 0,
          boxSizing: "border-box",
          display: "flex"
        }}
      >
        <div
          className="notes-scrollable"
          data-scrollable="true"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 13,
            background: "linear-gradient(180deg, #0c1311 0%, #070b0a 100%)",
            boxShadow: "inset 0 4px 10px rgba(0, 0, 0, 0.92)",
            padding: "6px 7px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: 5,
            overflowY: "auto",
            overflowX: "hidden",
            boxSizing: "border-box"
          }}
        >
          {/* Top Header Card */}
          <div
            style={{
              background: "linear-gradient(180deg, #131f1b 0%, #0b1310 100%)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              boxShadow: "0 3px 8px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: "6px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 5,
              flexShrink: 0
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <FileText size={13} color="#10b981" style={{ filter: "drop-shadow(0 0 6px rgba(16,185,129,0.45))" }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  Notes
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
                  background: viewMode === "composer"
                    ? "linear-gradient(180deg, #0d3326 0%, #071e16 100%)"
                    : "linear-gradient(180deg, #1f242c 0%, #13171d 100%)",
                  border: viewMode === "composer"
                    ? "1px solid rgba(16, 185, 129, 0.42)"
                    : "1px solid rgba(255, 255, 255, 0.14)",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.14)",
                  borderRadius: 6,
                  padding: "2.5px 6px",
                  color: viewMode === "composer" ? "#10b981" : "#ffffff",
                  fontSize: 9.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3.5
                }}
              >
                {viewMode === "composer" ? (
                  <>
                    <Archive size={10} />
                    Inbox
                  </>
                ) : (
                  <>
                    <Plus size={10} />
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
                background: "linear-gradient(180deg, #0e3226 0%, #081e17 100%)",
                border: "1px solid rgba(16, 185, 129, 0.38)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.75), inset 0 1px 1px rgba(255,255,255,0.15)",
                borderRadius: 7,
                padding: "4px 8px",
                color: "#34d399",
                fontSize: 9.5,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <Copy size={10} />
              Capture Clipboard
            </button>

            {/* Stats Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255, 255, 255, 0.48)" }}>
              <span>{Array.isArray(notes) ? notes.length : 0} notes</span>
              <span>{Array.isArray(tags) ? tags.length : 0} tags</span>
            </div>
          </div>

          {/* Filter Navigation (All / Recent / Pinned / Archived) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2.5, flexShrink: 0 }}>
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
                    padding: "4px 8px",
                    borderRadius: 8,
                    background: isActive
                      ? "linear-gradient(180deg, #0e3326 0%, #081e17 100%)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(16, 185, 129, 0.42)"
                      : "1px solid transparent",
                    boxShadow: isActive
                      ? "0 3px 8px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.15)"
                      : "none",
                    color: isActive ? "#34d399" : "rgba(255, 255, 255, 0.62)",
                    fontSize: 10.5,
                    fontWeight: isActive ? 700 : 600,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    fontFamily: iosFontStack
                  }}
                >
                  <span>{btn.label}</span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 5px",
                      borderRadius: 10,
                      background: isActive ? "rgba(52, 211, 153, 0.2)" : "rgba(255, 255, 255, 0.08)",
                      color: isActive ? "#34d399" : "rgba(255, 255, 255, 0.45)",
                      fontWeight: 700
                    }}
                  >
                    {counts[btn.id] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tag Filters Section */}
          {Array.isArray(tags) && tags.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1px 4px" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255, 255, 255, 0.42)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
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
                        background: isSelected
                          ? "linear-gradient(180deg, #0e3326 0%, #081e17 100%)"
                          : "#070a09",
                        border: isSelected
                          ? "1px solid rgba(16, 185, 129, 0.5)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        boxShadow: isSelected
                          ? "0 2px 6px rgba(0,0,0,0.7)"
                          : "inset 0 1px 3px rgba(0,0,0,0.8)",
                        borderRadius: 999,
                        padding: "2px 6px",
                        color: isSelected ? "#34d399" : "rgba(255, 255, 255, 0.6)",
                        fontSize: 9,
                        fontWeight: isSelected ? 700 : 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        transition: "all 0.15s ease"
                      }}
                    >
                      <Tag size={8.5} />
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
      </div>

      {/* RIGHT COLUMN: Sunken 3D Composer OR Notes Inbox Well */}
      <div
        style={{
          flex: 1,
          height: "100%",
          borderRadius: 16,
          padding: "7px 10px",
          boxSizing: "border-box",
          background: "linear-gradient(180deg, #090c0b 0%, #0e1412 100%)",
          border: "1px solid rgba(16, 185, 129, 0.18)",
          boxShadow: "inset 0 4px 12px rgba(0, 0, 0, 0.94), 0 4px 12px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
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
              gap: 6,
              height: "100%"
            }}
          >
            {/* Sunken Title / Status Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#060807",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.9)",
                borderRadius: 9,
                padding: "4px 9px"
              }}
            >
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
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: iosFontStack,
                  flex: 1
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 9.5,
                    color: draftSaveStatus === "saved" ? "#34d399" : draftSaveStatus === "saving" ? "#38bdf8" : "#eab308",
                    fontWeight: 700
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
                      color: "rgba(255, 255, 255, 0.45)",
                      fontSize: 9.5,
                      cursor: "pointer"
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* Sunken 3D Note Textarea Well */}
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
                background: "#060807",
                border: "1px solid rgba(16, 185, 129, 0.22)",
                boxShadow: "inset 0 4px 10px rgba(0, 0, 0, 0.94), 0 1px 1px rgba(255, 255, 255, 0.04)",
                borderRadius: 10,
                padding: "7px 10px",
                color: "#ffffff",
                fontSize: 11.5,
                lineHeight: "1.45",
                fontFamily: iosFontStack,
                resize: "none",
                outline: "none"
              }}
            />

            {/* Bottom Actions Bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 9.5, color: "rgba(255, 255, 255, 0.42)" }}>
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
                    background: "linear-gradient(180deg, #1b211f 0%, #111514 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.12)",
                    borderRadius: 7,
                    padding: "4px 9px",
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: 10.5,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  style={{
                    background: "linear-gradient(180deg, #0d3a2b 0%, #072219 100%)",
                    border: "1px solid rgba(16, 185, 129, 0.48)",
                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.8), 0 0 10px rgba(16, 185, 129, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.18)",
                    borderRadius: 7,
                    padding: "4px 12px",
                    color: "#34d399",
                    fontSize: 10.5,
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
              gap: 6,
              height: "100%",
              overflow: "hidden"
            }}
          >
            {/* Sunken Search Header Trough */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#060807",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                boxShadow: "inset 0 3px 8px rgba(0, 0, 0, 0.94), 0 1px 1px rgba(255, 255, 255, 0.04)",
                borderRadius: 10,
                padding: "4.5px 10px",
                boxSizing: "border-box"
              }}
            >
              <Search size={13} color="#10b981" />
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
                  fontSize: 11.5,
                  fontWeight: 500,
                  fontFamily: iosFontStack
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.45)", cursor: "pointer", padding: 0 }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Notes List */}
            <div
              className="notes-scrollable"
              data-scrollable="true"
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 4.5,
                paddingRight: 2
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
                    color: "rgba(255, 255, 255, 0.42)",
                    fontSize: 11
                  }}
                >
                  <Sparkles size={18} color="#10b981" opacity={0.45} />
                  <span>No notes found</span>
                </div>
              ) : (
                displayedNotes.map((note) => {
                  const isPinned = Boolean(note.isPinned ?? note.pinned);
                  const isArchived = Boolean(note.isArchived ?? note.archived);

                  return (
                    <div
                      key={note.id}
                      onClick={() => handleEditNote(note)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        padding: "6px 9px",
                        borderRadius: 10,
                        background: isPinned
                          ? "linear-gradient(180deg, #1f2214 0%, #12140b 100%)"
                          : isArchived
                          ? "linear-gradient(180deg, #101923 0%, #0a1017 100%)"
                          : "linear-gradient(180deg, #141c19 0%, #0d1311 100%)",
                        border: isPinned
                          ? "1px solid rgba(234, 179, 8, 0.45)"
                          : isArchived
                          ? "1px solid rgba(56, 189, 248, 0.32)"
                          : "1px solid rgba(255, 255, 255, 0.07)",
                        boxShadow: isPinned
                          ? "0 4px 10px rgba(0, 0, 0, 0.72), 0 0 10px rgba(234, 179, 8, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.12)"
                          : "0 4px 10px rgba(0, 0, 0, 0.72), inset 0 1px 1px rgba(255, 255, 255, 0.1), inset 0 -1px 2px rgba(0, 0, 0, 0.85)",
                        cursor: "pointer",
                        gap: 3.5,
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: isPinned ? "#fef08a" : "#ffffff",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 220
                          }}
                        >
                          {note.title || "Untitled Note"}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 3.5 }}>
                          {/* 1. Pin / Star Button */}
                          <button
                            type="button"
                            onClick={(e) => handleTogglePin(e, note.id)}
                            title={isPinned ? "Unpin note" : "Pin note to top"}
                            style={{
                              background: isPinned ? "rgba(234, 179, 8, 0.18)" : "transparent",
                              border: isPinned ? "1px solid rgba(234, 179, 8, 0.35)" : "1px solid transparent",
                              borderRadius: 5,
                              cursor: "pointer",
                              padding: "2.5px 3.5px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: isPinned ? "#eab308" : "rgba(255, 255, 255, 0.38)",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              if (!isPinned) e.currentTarget.style.color = "#eab308";
                            }}
                            onMouseLeave={(e) => {
                              if (!isPinned) e.currentTarget.style.color = "rgba(255, 255, 255, 0.38)";
                            }}
                          >
                            <Star size={12} fill={isPinned ? "#eab308" : "none"} />
                          </button>

                          {/* 2. Convert to Task Button */}
                          <button
                            type="button"
                            onClick={(e) => handleConvertToTask(e, note)}
                            title="Convert note to Task"
                            style={{
                              background: "transparent",
                              border: "1px solid transparent",
                              borderRadius: 5,
                              cursor: "pointer",
                              padding: "2.5px 3.5px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "rgba(255, 255, 255, 0.38)",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#10b981";
                              e.currentTarget.style.background = "rgba(16, 185, 129, 0.14)";
                              e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.32)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "rgba(255, 255, 255, 0.38)";
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.borderColor = "transparent";
                            }}
                          >
                            <CheckSquare size={12} />
                          </button>

                          {/* 3. Copy Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyNote(e, note)}
                            title="Copy note text to clipboard"
                            style={{
                              background: "transparent",
                              border: "1px solid transparent",
                              borderRadius: 5,
                              cursor: "pointer",
                              padding: "2.5px 3.5px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "rgba(255, 255, 255, 0.38)",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#38bdf8";
                              e.currentTarget.style.background = "rgba(56, 189, 248, 0.14)";
                              e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.32)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "rgba(255, 255, 255, 0.38)";
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.borderColor = "transparent";
                            }}
                          >
                            <Copy size={12} />
                          </button>

                          {/* 4. Archive Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleArchive(e, note.id)}
                            title={isArchived ? "Restore note from archive" : "Archive note"}
                            style={{
                              background: isArchived ? "rgba(56, 189, 248, 0.16)" : "transparent",
                              border: isArchived ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
                              borderRadius: 5,
                              cursor: "pointer",
                              padding: "2.5px 3.5px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: isArchived ? "#38bdf8" : "rgba(255, 255, 255, 0.38)",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              if (!isArchived) {
                                e.currentTarget.style.color = "#38bdf8";
                                e.currentTarget.style.background = "rgba(56, 189, 248, 0.14)";
                                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.32)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isArchived) {
                                e.currentTarget.style.color = "rgba(255, 255, 255, 0.38)";
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.borderColor = "transparent";
                              }
                            }}
                          >
                            <Archive size={12} />
                          </button>

                          {/* 5. Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNote(e, note)}
                            title="Delete note"
                            style={{
                              background: "transparent",
                              border: "1px solid transparent",
                              borderRadius: 5,
                              cursor: "pointer",
                              padding: "2.5px 3.5px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "rgba(239, 68, 68, 0.72)",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#ef4444";
                              e.currentTarget.style.background = "rgba(239, 68, 68, 0.16)";
                              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.38)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "rgba(239, 68, 68, 0.72)";
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.borderColor = "transparent";
                            }}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "rgba(255, 255, 255, 0.42)", marginTop: 1 }}>
                        {isPinned && (
                          <span style={{ color: "#eab308", fontWeight: 700, display: "flex", alignItems: "center", gap: 2.5 }}>
                            <Star size={9} fill="#eab308" /> Pinned
                          </span>
                        )}
                        {isArchived && (
                          <span style={{ color: "#38bdf8", fontWeight: 700, display: "flex", alignItems: "center", gap: 2.5 }}>
                            <Archive size={9} /> Archived
                          </span>
                        )}
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={10} />
                          {(() => {
                            try {
                              const ts = note.updatedAt || note.createdAt;
                              const d = ts ? new Date(ts) : new Date();
                              return isNaN(d.getTime()) ? "Recent" : d.toLocaleDateString([], { month: "short", day: "numeric" });
                            } catch {
                              return "Recent";
                            }
                          })()}
                        </span>
                        {Array.isArray(note.tags) && note.tags.length > 0 && (
                          <span style={{ color: "#34d399", fontWeight: 700 }}>
                            {note.tags.filter(t => typeof t === "string").map(t => `#${t}`).join(" ")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
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
