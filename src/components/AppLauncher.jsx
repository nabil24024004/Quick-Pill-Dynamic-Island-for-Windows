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
  ChevronRight
} from "lucide-react";

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

    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      if (filter === "favorites") {
        return safeSearchResults.filter(item => item && safeFavorites.includes(item.id || item.target));
      }
      if (filter === "windows") {
        return safeSearchResults.filter(item => item && (item.itemType === "window" || item.type === "window" || item.hWnd));
      }
      if (filter === "workspaces") {
        return safeWorkspaces.filter(w => w && typeof w.name === "string" && w.name.toLowerCase().includes(q));
      }
      return safeSearchResults.filter(Boolean);
    }

    if (filter === "favorites") {
      return safeCatalog.filter(app => app && safeFavorites.includes(app.id || app.target));
    }
    if (filter === "windows") {
      return safeRunningWindows.filter(Boolean);
    }
    if (filter === "workspaces") {
      return safeWorkspaces.filter(Boolean);
    }

    // Default 'all': favorites first, then all discovered apps
    const favApps = safeCatalog.filter(app => app && safeFavorites.includes(app.id || app.target));
    const otherApps = safeCatalog.filter(app => app && !safeFavorites.includes(app.id || app.target));
    return [...favApps, ...otherApps];
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
      setSelectedIndex(prev => Math.min(prev + 1, displayedItems.length - 1));
      scrollSelectedIntoView(selectedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      scrollSelectedIntoView(selectedIndex - 1);
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        boxSizing: "border-box",
        gap: 14,
        userSelect: "none",
        position: "relative"
      }}
      onKeyDown={handleKeyDown}
    >
      {/* LEFT COLUMN: Sidebar summary, active workspace & filter tabs */}
      <div
        className="launcher-scrollable"
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
            padding: "6px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Compass size={14} color="#38bdf8" />
              <span style={{ fontSize: 11, fontWeight: 800, color: "#ffffff", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                Launcher
              </span>
            </div>
            <button
              type="button"
              onClick={handleReindex}
              disabled={isReindexing}
              title="Re-index installed applications"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                color: isReindexing ? "#38bdf8" : "rgba(255, 255, 255, 0.45)"
              }}
            >
              <RefreshCw size={12} className={isReindexing ? "spin-anim" : ""} />
            </button>
          </div>

          {/* Active Workspace Pill */}
          {activeWorkspace && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(0, 0, 0, 0.25)",
                padding: "3px 6px",
                borderRadius: 6,
                fontSize: 10,
                color: "rgba(255, 255, 255, 0.8)"
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: activeWorkspace.color || "#38bdf8"
                }}
              />
              <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeWorkspace.name}
              </span>
            </div>
          )}

          {/* Catalog & Window Counts */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "rgba(255, 255, 255, 0.45)", marginTop: 2 }}>
            <span>{Array.isArray(catalog) ? catalog.length : 0} apps</span>
            <span>{Array.isArray(runningWindows) ? runningWindows.length : 0} windows</span>
          </div>
        </div>

        {/* Filter Navigation Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
          {[
            { id: "all", label: "All Apps", count: Array.isArray(catalog) ? catalog.length : 0 },
            { id: "favorites", label: "Favorites", count: Array.isArray(favorites) ? favorites.length : 0 },
            { id: "windows", label: "Windows", count: Array.isArray(runningWindows) ? runningWindows.length : 0 },
            { id: "workspaces", label: "Workspaces", count: Array.isArray(workspaces) ? workspaces.length : 0 }
          ].map(btn => {
            const isActive = filter === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter(btn.id);
                  setSelectedIndex(0);
                  searchInputRef.current?.focus();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 8px",
                  borderRadius: 8,
                  background: isActive ? "rgba(56, 189, 248, 0.16)" : "transparent",
                  border: isActive ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid transparent",
                  color: isActive ? "#38bdf8" : "rgba(255, 255, 255, 0.65)",
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  fontFamily: "OpenRunde, system-ui, sans-serif"
                }}
              >
                <span>{btn.label}</span>
                <span style={{ fontSize: 9.5, opacity: 0.6 }}>{btn.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Search Header + Scrollable Results */}
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
        {/* Search Header Bar */}
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
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              filter === "windows"
                ? "Search running windows..."
                : filter === "workspaces"
                ? "Search workspaces..."
                : "Type to search applications..."
            }
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
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); searchInputRef.current?.focus(); }}
              style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer", padding: 0 }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listContainerRef}
          className="launcher-scrollable"
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            paddingRight: 4
          }}
        >
          {displayedItems.length === 0 ? (
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
              <span>
                {query ? `No results for "${query}"` : filter === "favorites" ? "No pinned favorites yet" : "No items found"}
              </span>
            </div>
          ) : (
            displayedItems.map((item, idx) => {
              if (!item) return null;
              const isSelected = idx === selectedIndex;
              const isFav = Array.isArray(favorites) && favorites.includes(item.id || item.target);
              const isWindowItem = filter === "windows" || item.itemType === "window" || Boolean(item.hWnd);
              const isWorkspaceItem = filter === "workspaces" || Boolean(item.isWorkspace);

              return (
                <div
                  key={item.id || item.hWnd || item.target || idx}
                  onClick={() => {
                    setSelectedIndex(idx);
                    if (isWindowItem) handleActivateWindow(item);
                    else if (isWorkspaceItem) handleSelectWorkspace(item);
                    else handleLaunchApp(item);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "5px 8px",
                    borderRadius: 8,
                    background: isSelected ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.03)",
                    border: isSelected ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid rgba(255, 255, 255, 0.05)",
                    cursor: "pointer",
                    transition: "all 0.12s ease"
                  }}
                >
                  {/* Left: Icon + Titles */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                    {/* App or Window Icon */}
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: "rgba(0, 0, 0, 0.35)",
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
                          style={{ width: 18, height: 18, objectFit: "contain" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : isWindowItem ? (
                        <Monitor size={14} color="#38bdf8" />
                      ) : isWorkspaceItem ? (
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color || "#38bdf8" }} />
                      ) : (
                        <Compass size={14} color="rgba(255, 255, 255, 0.6)" />
                      )}
                    </div>

                    {/* Texts */}
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: "#ffffff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {item.name || item.title || item.processName || "Untitled"}
                      </span>
                      <span
                        style={{
                          fontSize: 9.5,
                          color: "rgba(255, 255, 255, 0.4)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {isWindowItem
                          ? `${item.processName || "Window"} • Active`
                          : isWorkspaceItem
                          ? `${item.apps?.length || 0} apps in profile`
                          : (item.publisher || item.target || "Application")}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    {isWindowItem ? (
                      <span
                        style={{
                          fontSize: 9.5,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(56, 189, 248, 0.2)",
                          color: "#38bdf8",
                          fontWeight: 600
                        }}
                      >
                        Switch
                      </span>
                    ) : isWorkspaceItem ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          type="button"
                          onClick={(e) => handlePromptLaunchWorkspace(e, item)}
                          title="Launch all apps in this workspace"
                          style={{
                            background: "rgba(56, 189, 248, 0.2)",
                            border: "none",
                            borderRadius: 4,
                            padding: "2px 6px",
                            color: "#38bdf8",
                            fontSize: 9.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 3
                          }}
                        >
                          <Play size={10} fill="currentColor" />
                          Launch
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, item)}
                        title={isFav ? "Unpin favorite" : "Pin to favorites"}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: "3px",
                          display: "flex",
                          alignItems: "center",
                          color: isFav ? "#eab308" : "rgba(255, 255, 255, 0.25)"
                        }}
                      >
                        <Star size={13} fill={isFav ? "#eab308" : "none"} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
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
                maxHeight: 70,
                overflowY: "auto",
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: 6,
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}
            >
              {(launchPreviewModal.apps || launchPreviewModal.launchProfile || []).map((appId, i) => (
                <div key={i} style={{ fontSize: 10.5, color: "rgba(255, 255, 255, 0.9)", display: "flex", alignItems: "center", gap: 5 }}>
                  <ChevronRight size={10} color="#38bdf8" />
                  <span>{appId}</span>
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
    </div>
  );
}
