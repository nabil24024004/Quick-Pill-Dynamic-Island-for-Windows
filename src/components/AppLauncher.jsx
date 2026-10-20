import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  Star,
  Compass,
  Layers,
  Monitor,
  Play,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Plus,
  Sparkles,
  Trash2,
  ChevronRight,
  Pencil,
  Globe,
  FolderPlus
} from "lucide-react";

const WORKSPACE_COLORS = [
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#F43F5E",
  "#06B6D4",
  "#EC4899",
  "#64748B"
];

// Module-level caches to make tab switches and re-renders 0ms instant
let _memoryCatalogCache = null;
let _memoryFavoritesCache = null;
let _memoryRunningWindowsCache = null;
let _memoryWorkspacesCache = null;

export default function AppLauncher({
  onClose,
  accentColor = "#0070f3",
  textColor = "#ffffff"
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'favorites' | 'windows' | 'workspaces'
  const [catalog, setCatalog] = useState(() => {
    if (Array.isArray(_memoryCatalogCache) && _memoryCatalogCache.length > 0) {
      return _memoryCatalogCache;
    }
    try {
      const stored = localStorage.getItem("qp_launcher_catalog_cache");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          _memoryCatalogCache = parsed;
          return parsed;
        }
      }
    } catch (_) {}
    return [];
  });
  const [searchResults, setSearchResults] = useState([]);
  const [favorites, setFavorites] = useState(() => _memoryFavoritesCache || []);
  const [runningWindows, setRunningWindows] = useState(() => _memoryRunningWindowsCache || []);
  const [workspaces, setWorkspaces] = useState(() => _memoryWorkspacesCache || []);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => localStorage.getItem("active-workspace-id") || "dev");
  const [isLoading, setIsLoading] = useState(() => {
    return !(_memoryCatalogCache && _memoryCatalogCache.length > 0);
  });
  const [isReindexing, setIsReindexing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [launchPreviewModal, setLaunchPreviewModal] = useState(null); // workspace object to preview
  const [workspaceModal, setWorkspaceModal] = useState(null); // { mode: 'create'|'edit', ws: {...}, appPickerOpen, ... }
  const [quickAddMenu, setQuickAddMenu] = useState(null); // { item }

  const searchInputRef = useRef(null);
  const listContainerRef = useRef(null);

  // Show auto-dismissing status banner
  const showStatus = useCallback((msg, duration = 3000) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(prev => prev === msg ? null : prev);
    }, duration);
  }, []);

  // Fetch initial data (catalog, favorites, running windows, workspaces)
  const loadData = useCallback(async () => {
    const hasCached = Array.isArray(_memoryCatalogCache) && _memoryCatalogCache.length > 0;
    if (!hasCached) {
      setIsLoading(true);
    }
    try {
      if (window.electronAPI?.launcher) {
        // Fast paths: getCatalog, getFavorites, getWorkspaces
        const [cats, favs, ws] = await Promise.all([
          window.electronAPI.launcher.getCatalog().catch(() => []),
          window.electronAPI.launcher.getFavorites().catch(() => []),
          window.electronAPI.launcher.getWorkspaces().catch(() => [])
        ]);

        if (Array.isArray(cats) && cats.length > 0) {
          setCatalog(cats);
          _memoryCatalogCache = cats;
          try {
            localStorage.setItem("qp_launcher_catalog_cache", JSON.stringify(cats));
          } catch (_) {}
        }
        if (Array.isArray(favs)) {
          setFavorites(favs);
          _memoryFavoritesCache = favs;
        }
        if (Array.isArray(ws)) {
          setWorkspaces(ws);
          _memoryWorkspacesCache = ws;
        }

        // Running windows in background so slow PowerShell execution doesn't freeze launcher
        window.electronAPI.launcher.getRunningWindows().then(wins => {
          if (Array.isArray(wins)) {
            setRunningWindows(wins);
            _memoryRunningWindowsCache = wins;
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to load launcher data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto focus search field immediately when opened
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, [loadData]);

  // Periodic refresh for running windows
  useEffect(() => {
    if (filter === "windows" && window.electronAPI?.launcher?.getRunningWindows) {
      const interval = setInterval(() => {
        window.electronAPI.launcher.getRunningWindows().then(wins => {
          if (Array.isArray(wins)) setRunningWindows(wins);
        }).catch(() => {});
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [filter]);

  // Trigger search whenever query or filter changes
  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }

    if (window.electronAPI?.launcher?.searchApps) {
      window.electronAPI.launcher.searchApps(query.trim(), {
        includeWindows: filter === "all" || filter === "windows",
        maxResults: 30
      }).then(res => {
        if (active && Array.isArray(res)) {
          setSearchResults(res);
          setSelectedIndex(0);
        }
      }).catch(() => {});
    }

    return () => { active = false; };
  }, [query, filter]);

  // Visible items based on active filter and query
  const displayedItems = useMemo(() => {
    const safeSearchResults = Array.isArray(searchResults) ? searchResults : [];
    const safeCatalog = Array.isArray(catalog) ? catalog : [];
    const safeFavorites = Array.isArray(favorites) ? favorites : [];
    const safeRunningWindows = Array.isArray(runningWindows) ? runningWindows : [];
    const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];

    let rawList = [];

    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      if (filter === "favorites") {
        rawList = safeSearchResults.filter(item => item && safeFavorites.includes(item.id || item.target));
      } else if (filter === "windows") {
        rawList = safeSearchResults.filter(item => item && (item.itemType === "window" || item.type === "window" || item.hWnd));
      } else if (filter === "workspaces") {
        rawList = safeWorkspaces.filter(w => w && typeof w.name === "string" && w.name.toLowerCase().includes(q));
      } else {
        rawList = safeSearchResults.filter(Boolean);
      }
    } else {
      if (filter === "favorites") {
        rawList = safeCatalog.filter(app => app && safeFavorites.includes(app.id || app.target));
      } else if (filter === "windows") {
        rawList = safeRunningWindows.filter(Boolean);
      } else if (filter === "workspaces") {
        rawList = safeWorkspaces.filter(Boolean);
      } else {
        // Default 'all': favorites first, then all discovered apps
        const favApps = safeCatalog.filter(app => app && safeFavorites.includes(app.id || app.target));
        const otherApps = safeCatalog.filter(app => app && !safeFavorites.includes(app.id || app.target));
        rawList = [...favApps, ...otherApps];
      }
    }

    // Deduplicate items to prevent duplicate rendering and identical React keys
    const seen = new Set();
    const deduplicated = [];
    for (const item of rawList) {
      if (!item) continue;
      const key = item.id || item.target || (item.hWnd ? `win-${item.hWnd}` : null);
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      deduplicated.push(item);
    }
    return deduplicated;
  }, [query, filter, searchResults, catalog, favorites, runningWindows, workspaces]);

  // Launch application
  const handleLaunchApp = useCallback(async (app) => {
    if (!app) return;
    try {
      showStatus(`Launching ${app.name}...`);
      if (window.electronAPI?.launcher?.launchApp) {
        const res = await window.electronAPI.launcher.launchApp(app.target || app.launch || app.name);
        if (res?.success) {
          showStatus(`✓ ${app.name} launched`);
        } else {
          showStatus(`⚠ Could not launch: ${res?.error || "Check path"}`, 4000);
        }
      }
    } catch (err) {
      showStatus(`Error launching: ${err.message}`, 4000);
    }
  }, [showStatus]);

  // Activate running window
  const handleActivateWindow = useCallback(async (win) => {
    if (!win?.hWnd) return;
    try {
      showStatus(`Switching to ${win.title || win.processName}...`);
      if (window.electronAPI?.launcher?.activateWindow) {
        const res = await window.electronAPI.launcher.activateWindow(win.hWnd);
        if (res?.success) {
          showStatus(`✓ Activated ${win.processName || win.title}`);
        } else {
          showStatus(`⚠ Activation restricted by Windows: ${res?.error || "Requires focus permission"}`, 4500);
        }
      }
    } catch (err) {
      showStatus(`Window activation error: ${err.message}`, 4500);
    }
  }, [showStatus]);

  // Toggle favorite
  const handleToggleFavorite = useCallback(async (e, app) => {
    e.stopPropagation();
    const id = app.id || app.target;
    if (!id) return;

    const newFavs = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];

    setFavorites(newFavs);
    if (window.electronAPI?.launcher?.setFavorites) {
      try {
        await window.electronAPI.launcher.setFavorites(newFavs);
      } catch (_) {}
    }
  }, [favorites]);

  // Set active workspace
  const handleSelectWorkspace = useCallback((ws) => {
    setActiveWorkspaceId(ws.id);
    localStorage.setItem("active-workspace-id", ws.id);
    showStatus(`Active Workspace: ${ws.name}`);
  }, [showStatus]);

  // Open workspace creator modal
  const handleOpenCreateWorkspace = useCallback(() => {
    setWorkspaceModal({
      mode: "create",
      ws: {
        id: `ws-${Date.now()}`,
        name: "",
        color: "#3B82F6",
        icon: "Layers",
        pinnedApps: [],
        launchProfile: []
      },
      appPickerOpen: false,
      urlInputName: "",
      urlInputTarget: "",
      pickerQuery: ""
    });
  }, []);

  // Open workspace editor modal
  const handleOpenEditWorkspace = useCallback((ws, e) => {
    if (e) e.stopPropagation();
    setWorkspaceModal({
      mode: "edit",
      ws: JSON.parse(JSON.stringify(ws)),
      appPickerOpen: false,
      urlInputName: "",
      urlInputTarget: "",
      pickerQuery: ""
    });
  }, []);

  // Save workspace from modal
  const handleSaveWorkspaceModal = useCallback(async () => {
    if (!workspaceModal?.ws) return;
    const name = (workspaceModal.ws.name || "").trim();
    if (!name) {
      showStatus("⚠ Please enter a workspace name", 3000);
      return;
    }

    const payload = {
      ...workspaceModal.ws,
      name,
      launchProfile: (workspaceModal.ws.launchProfile || []).filter(t => t && t.target)
    };

    try {
      if (window.electronAPI?.workspaces?.saveWorkspace) {
        const res = await window.electronAPI.workspaces.saveWorkspace(payload);
        const savedWs = res?.workspace || payload;
        setWorkspaces(prev => {
          const idx = prev.findIndex(w => w.id === savedWs.id);
          let next;
          if (idx >= 0) {
            next = [...prev];
            next[idx] = savedWs;
          } else {
            next = [...prev, savedWs];
          }
          _memoryWorkspacesCache = next;
          return next;
        });
        showStatus(`✓ Workspace "${name}" saved`);
      }
    } catch (err) {
      showStatus("Error saving workspace: " + err.message, 4000);
    }
    setWorkspaceModal(null);
  }, [workspaceModal, showStatus]);

  // Delete workspace
  const handleDeleteWorkspaceModal = useCallback(async (wsId) => {
    if (!wsId) return;
    if (workspaces.length <= 1) {
      showStatus("Cannot delete the only workspace", 3000);
      return;
    }

    try {
      if (window.electronAPI?.workspaces?.deleteWorkspace) {
        await window.electronAPI.workspaces.deleteWorkspace(wsId);
        setWorkspaces(prev => {
          const next = prev.filter(w => w.id !== wsId);
          _memoryWorkspacesCache = next;
          if (activeWorkspaceId === wsId && next.length > 0) {
            setActiveWorkspaceId(next[0].id);
            localStorage.setItem("active-workspace-id", next[0].id);
          }
          return next;
        });
        showStatus("✓ Workspace deleted");
      }
    } catch (err) {
      showStatus("Error deleting workspace: " + err.message, 4000);
    }
    setWorkspaceModal(null);
  }, [workspaces.length, activeWorkspaceId, showStatus]);

  // Quick add app to a workspace
  const handleQuickAddToWorkspace = useCallback(async (app, wsId) => {
    const targetWs = workspaces.find(w => w.id === wsId);
    if (!targetWs) return;

    const newTarget = {
      id: `target-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: app.name,
      type: "app",
      target: app.target || app.launch || app.name,
      args: [],
      enabled: true
    };

    const updatedWs = {
      ...targetWs,
      launchProfile: [...(targetWs.launchProfile || []), newTarget]
    };

    try {
      if (window.electronAPI?.workspaces?.saveWorkspace) {
        await window.electronAPI.workspaces.saveWorkspace(updatedWs);
        setWorkspaces(prev => {
          const next = prev.map(w => w.id === wsId ? updatedWs : w);
          _memoryWorkspacesCache = next;
          return next;
        });
        showStatus(`✓ Added ${app.name} to ${targetWs.name}`);
      }
    } catch (err) {
      showStatus("Failed to add: " + err.message, 4000);
    }
    setQuickAddMenu(null);
  }, [workspaces, showStatus]);

  // Open launch profile confirmation modal
  const handlePromptLaunchWorkspace = useCallback((e, ws) => {
    e.stopPropagation();
    setLaunchPreviewModal(ws);
  }, []);

  // Confirm launching all applications in workspace profile
  const handleExecuteWorkspaceLaunch = useCallback(async () => {
    if (!launchPreviewModal) return;
    const ws = launchPreviewModal;
    setLaunchPreviewModal(null);
    showStatus(`Launching profile for ${ws.name}...`);

    try {
      if (window.electronAPI?.workspaces?.launchWorkspace) {
        const res = await window.electronAPI.workspaces.launchWorkspace(ws.id);
        if (res?.success) {
          showStatus(`✓ Launched ${res.launchedCount || ws.launchProfile?.length || 0} apps in ${ws.name}`);
        } else {
          showStatus(`Partial launch: ${res?.message || "Some apps skipped"}`);
        }
      }
    } catch (err) {
      showStatus(`Launch profile error: ${err.message}`, 4000);
    }
  }, [launchPreviewModal, showStatus]);

  // Reindex catalog
  const handleReindex = useCallback(async () => {
    setIsReindexing(true);
    showStatus("Re-indexing installed applications...");
    try {
      if (window.electronAPI?.launcher?.reindexCatalog) {
        const res = await window.electronAPI.launcher.reindexCatalog();
        if (res && Array.isArray(res.catalog)) {
          setCatalog(res.catalog);
          showStatus(`✓ Catalog refreshed (${res.catalog.length} apps discovered)`);
        }
      }
    } catch (err) {
      showStatus("Re-indexing failed: " + err.message, 4000);
    } finally {
      setIsReindexing(false);
    }
  }, [showStatus]);

  // Keyboard navigation inside launcher
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(prev => {
        const next = Math.min(prev + 2, displayedItems.length - 1);
        scrollSelectedIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(prev => {
        const next = Math.max(prev - 2, 0);
        scrollSelectedIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(prev => {
        const next = Math.min(prev + 1, displayedItems.length - 1);
        scrollSelectedIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(prev => {
        const next = Math.max(prev - 1, 0);
        scrollSelectedIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const item = displayedItems[selectedIndex];
      if (item) {
        if (filter === "windows" || item.itemType === "window" || item.hWnd) {
          handleActivateWindow(item);
        } else if (filter === "workspaces" || item.isWorkspace) {
          handlePromptLaunchWorkspace(e, item);
        } else {
          handleLaunchApp(item);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (query) {
        setQuery("");
      } else if (onClose) {
        onClose();
      }
    }
  };

  const scrollSelectedIntoView = (index) => {
    if (!listContainerRef.current) return;
    const el = listContainerRef.current.children[index];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];
  const activeWorkspace = safeWorkspaces.find(w => w?.id === activeWorkspaceId) || safeWorkspaces[0] || null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        padding: "8px 12px",
        boxSizing: "border-box",
        gap: 6,
        userSelect: "none",
        position: "relative"
      }}
      onKeyDown={handleKeyDown}
      onClick={() => setQuickAddMenu(null)}
    >

      {/* Top: Modern Full-Width Search Bar (height: 30px) */}
      <div
        style={{
          width: "100%",
          height: 30,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255, 255, 255, 0.07)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 8,
          padding: "0 10px",
          boxSizing: "border-box",
          flexShrink: 0
        }}
      >
        <Search size={14} color="rgba(255, 255, 255, 0.5)" style={{ flexShrink: 0 }} />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="Search apps..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#ffffff",
            fontSize: 11.5,
            fontFamily: "OpenRunde, system-ui, sans-serif"
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedIndex(0);
              searchInputRef.current?.focus();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.4)",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center"
            }}
          >
            <X size={12} />
          </button>
        )}
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.5)",
            background: "rgba(255, 255, 255, 0.08)",
            padding: "2px 6px",
            borderRadius: 4,
            flexShrink: 0
          }}
        >
          {displayedItems.length} {displayedItems.length === 1 ? "app" : "apps"}
        </div>
      </div>

      {/* Bottom Area: Compact 2-column Grid of Applications (height: 76px) */}
      <div
        ref={listContainerRef}
        className="launcher-scrollable"
        style={{
          width: "100%",
          height: 76,
          maxHeight: 76,
          overflowY: "auto",
          overflowX: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 5,
          paddingRight: 2,
          boxSizing: "border-box"
        }}
      >
        {displayedItems.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              height: 76,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: "rgba(255, 255, 255, 0.4)",
              fontSize: 11
            }}
          >
            <Sparkles size={16} opacity={0.4} />
            <span>{query ? `No apps matching "${query}"` : "No applications found"}</span>
          </div>
        ) : (
          displayedItems.map((item, idx) => {
            if (!item) return null;
            const isSelected = idx === selectedIndex;
            const appName = item.name || item.title || item.processName || "Application";
            const appSub = item.publisher || (item.target ? item.target.split("\\").pop() : "") || "App";

            return (
              <div
                key={`${item.id || item.target || item.hWnd || 'app'}-${idx}`}
                onClick={() => {
                  setSelectedIndex(idx);
                  if (item.hWnd || item.itemType === "window") {
                    handleActivateWindow(item);
                  } else {
                    handleLaunchApp(item);
                  }
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                  gap: 8,
                  borderRadius: 7,
                  boxSizing: "border-box",
                  background: isSelected ? "rgba(56, 189, 248, 0.18)" : "rgba(255, 255, 255, 0.04)",
                  border: isSelected ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
                  cursor: "pointer",
                  transition: "background 0.12s ease, border-color 0.12s ease",
                  overflow: "hidden"
                }}
              >
                {/* Native App Icon */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: "rgba(0, 0, 0, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0
                  }}
                >
                  {item.icon ? (
                    <img
                      src={item.icon}
                      alt=""
                      style={{ width: 16, height: 16, objectFit: "contain" }}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <Compass size={12} color="#38bdf8" />
                  )}
                </div>

                {/* App Name and Subtitle */}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, lineHeight: 1.15 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.9)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                    title={appName}
                  >
                    {appName}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: isSelected ? "rgba(56, 189, 248, 0.85)" : "rgba(255, 255, 255, 0.4)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {appSub}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Status Toast */}
      {statusMessage && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
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

      {/* Launch Profile Preview Modal */}
      {launchPreviewModal && (
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
              width: 360,
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
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: launchPreviewModal.color || "#38bdf8" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                  Launch {launchPreviewModal.name}?
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLaunchPreviewModal(null)}
                style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.5)", cursor: "pointer" }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.7)" }}>
              The following applications will be launched:
            </div>

            <div
              style={{
                maxHeight: 110,
                overflowY: "auto",
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: 6,
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}
            >
              {(launchPreviewModal.launchProfile || launchPreviewModal.apps || []).map((targetItem, i) => (
                <div key={i} style={{ fontSize: 10.5, color: "rgba(255, 255, 255, 0.9)", display: "flex", alignItems: "center", gap: 5 }}>
                  <ChevronRight size={10} color="#38bdf8" />
                  <span>{typeof targetItem === "object" ? (targetItem.name || targetItem.target) : targetItem}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setLaunchPreviewModal(null)}
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
                onClick={handleExecuteWorkspaceLaunch}
                style={{
                  background: "#0284c7",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 12px",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <Play size={11} fill="currentColor" />
                Launch All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Editor & Creator Modal */}
      {workspaceModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.78)",
            backdropFilter: "blur(8px)",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 250,
            padding: 10,
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              width: 400,
              maxHeight: "94%",
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: workspaceModal.ws.color || "#38bdf8" }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#ffffff" }}>
                  {workspaceModal.mode === "create" ? "Create Workspace" : "Edit Workspace"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWorkspaceModal(null)}
                style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.5)", cursor: "pointer", padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="launcher-scrollable" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 2 }}>
              {/* Workspace Name Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 9.5, color: "rgba(255, 255, 255, 0.5)", fontWeight: 600, textTransform: "uppercase" }}>
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceModal.ws.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWorkspaceModal(prev => ({
                      ...prev,
                      ws: { ...prev.ws, name: val }
                    }));
                  }}
                  placeholder="e.g. Creative Studio, Gaming, Finance"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 6,
                    padding: "5px 8px",
                    color: "#ffffff",
                    fontSize: 11.5,
                    outline: "none"
                  }}
                />
              </div>

              {/* Accent Color Selection */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9.5, color: "rgba(255, 255, 255, 0.5)", fontWeight: 600, textTransform: "uppercase" }}>
                  Accent Color
                </label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {WORKSPACE_COLORS.map(col => {
                    const isSelected = workspaceModal.ws.color === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setWorkspaceModal(prev => ({ ...prev, ws: { ...prev.ws, color: col } }))}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: col,
                          border: isSelected ? "2px solid #ffffff" : "2px solid transparent",
                          cursor: "pointer",
                          transform: isSelected ? "scale(1.15)" : "scale(1)",
                          transition: "transform 0.1s ease",
                          boxShadow: isSelected ? `0 0 8px ${col}` : "none"
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Launch Profile Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ fontSize: 9.5, color: "rgba(255, 255, 255, 0.5)", fontWeight: 600, textTransform: "uppercase" }}>
                    Launch Profile ({workspaceModal.ws.launchProfile?.length || 0} items)
                  </label>
                  <span style={{ fontSize: 8.5, color: "rgba(255, 255, 255, 0.4)" }}>Auto-launched together</span>
                </div>

                <div
                  style={{
                    maxHeight: 110,
                    overflowY: "auto",
                    background: "rgba(0, 0, 0, 0.35)",
                    borderRadius: 6,
                    padding: "4px 6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3
                  }}
                >
                  {(workspaceModal.ws.launchProfile || []).length === 0 ? (
                    <span style={{ fontSize: 9.5, color: "rgba(255, 255, 255, 0.35)", textAlign: "center", padding: "6px 0" }}>
                      No apps or links added yet. Add below!
                    </span>
                  ) : (
                    workspaceModal.ws.launchProfile.map((target, idx) => (
                      <div
                        key={target.id || idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "3px 6px",
                          borderRadius: 4,
                          background: "rgba(255, 255, 255, 0.04)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden", flex: 1 }}>
                          {target.type === "url" ? (
                            <Globe size={11} color="#38bdf8" style={{ flexShrink: 0 }} />
                          ) : (
                            <Monitor size={11} color="#a78bfa" style={{ flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: 10, color: "#ffffff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {target.name}
                          </span>
                          <span style={{ fontSize: 8.5, color: "rgba(255, 255, 255, 0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {target.target}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setWorkspaceModal(prev => ({
                              ...prev,
                              ws: {
                                ...prev.ws,
                                launchProfile: (prev.ws.launchProfile || []).filter((_, i) => i !== idx)
                              }
                            }));
                          }}
                          style={{ background: "transparent", border: "none", color: "rgba(239, 68, 68, 0.6)", cursor: "pointer", padding: "2px" }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Target Controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                  <button
                    type="button"
                    onClick={() => setWorkspaceModal(prev => ({ ...prev, appPickerOpen: !prev.appPickerOpen }))}
                    style={{
                      background: workspaceModal.appPickerOpen ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: 5,
                      padding: "4px 8px",
                      color: "#38bdf8",
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4
                    }}
                  >
                    <Plus size={10} />
                    {workspaceModal.appPickerOpen ? "Close App Selector" : "Add App from Catalog"}
                  </button>

                  {/* App Picker Drawer */}
                  {workspaceModal.appPickerOpen && (
                    <div
                      style={{
                        background: "rgba(0, 0, 0, 0.45)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: 6,
                        padding: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4
                      }}
                    >
                      <input
                        type="text"
                        value={workspaceModal.pickerQuery || ""}
                        onChange={(e) => {
                          const q = e.target.value;
                          setWorkspaceModal(prev => ({ ...prev, pickerQuery: q }));
                        }}
                        placeholder="Search apps to add..."
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "none",
                          borderRadius: 4,
                          padding: "3px 6px",
                          color: "#ffffff",
                          fontSize: 10,
                          outline: "none"
                        }}
                      />
                      <div className="launcher-scrollable" style={{ maxHeight: 60, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                        {catalog
                          .filter(app => {
                            if (!workspaceModal.pickerQuery) return true;
                            return (app.name || "").toLowerCase().includes(workspaceModal.pickerQuery.toLowerCase());
                          })
                          .slice(0, 20)
                          .map((app, appIdx) => (
                            <button
                              key={`${app.id || app.target || 'app'}-${appIdx}`}
                              type="button"
                              onClick={() => {
                                const newTarget = {
                                  id: `target-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                  name: app.name,
                                  type: "app",
                                  target: app.target || app.launch || app.name,
                                  args: [],
                                  enabled: true
                                };
                                setWorkspaceModal(prev => ({
                                  ...prev,
                                  ws: {
                                    ...prev.ws,
                                    launchProfile: [...(prev.ws.launchProfile || []), newTarget]
                                  },
                                  appPickerOpen: false,
                                  pickerQuery: ""
                                }));
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                borderRadius: 3,
                                padding: "3px 6px",
                                color: "#ffffff",
                                fontSize: 9.5,
                                textAlign: "left",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              <ChevronRight size={9} color="#38bdf8" />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.name}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Add Web URL inputs */}
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Title (e.g. GitHub)"
                      value={workspaceModal.urlInputName || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWorkspaceModal(prev => ({ ...prev, urlInputName: val }));
                      }}
                      style={{
                        width: "35%",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: 5,
                        padding: "3px 6px",
                        color: "#ffffff",
                        fontSize: 10,
                        outline: "none"
                      }}
                    />
                    <input
                      type="text"
                      placeholder="URL (e.g. github.com)"
                      value={workspaceModal.urlInputTarget || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWorkspaceModal(prev => ({ ...prev, urlInputTarget: val }));
                      }}
                      style={{
                        flex: 1,
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: 5,
                        padding: "3px 6px",
                        color: "#ffffff",
                        fontSize: 10,
                        outline: "none"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        let rawUrl = (workspaceModal.urlInputTarget || "").trim();
                        if (!rawUrl) return;
                        if (!/^https?:\/\//i.test(rawUrl)) {
                          rawUrl = "https://" + rawUrl;
                        }
                        let linkTitle = (workspaceModal.urlInputName || "").trim();
                        if (!linkTitle) {
                          try { linkTitle = new URL(rawUrl).hostname.replace(/^www\./, ""); } catch (_) { linkTitle = rawUrl; }
                        }
                        const newTarget = {
                          id: `target-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                          name: linkTitle,
                          type: "url",
                          target: rawUrl,
                          args: [],
                          enabled: true
                        };
                        setWorkspaceModal(prev => ({
                          ...prev,
                          ws: {
                            ...prev.ws,
                            launchProfile: [...(prev.ws.launchProfile || []), newTarget]
                          },
                          urlInputName: "",
                          urlInputTarget: ""
                        }));
                      }}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "none",
                        borderRadius: 5,
                        padding: "3px 8px",
                        color: "#38bdf8",
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      + Link
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              {workspaceModal.mode === "edit" && workspaces.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteWorkspaceModal(workspaceModal.ws.id);
                  }}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: "#ef4444",
                    fontSize: 10.5,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              ) : <div />}

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setWorkspaceModal(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    color: "#ffffff",
                    fontSize: 10.5,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveWorkspaceModal}
                  style={{
                    background: "#0284c7",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 12px",
                    color: "#ffffff",
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Save Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
