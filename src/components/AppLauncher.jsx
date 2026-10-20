import React, { useState, useEffect, useCallback } from "react";
import { Globe, Folder, Play, ExternalLink, Settings as SettingsIcon } from "lucide-react";

export const DEFAULT_LAUNCHER_SHORTCUTS = [
  {
    id: "chrome",
    type: "app",
    name: "Chrome",
    target: "chrome.exe",
    icon: "https://www.google.com/chrome/static/images/chrome-logo.svg"
  },
  {
    id: "explorer",
    type: "app",
    name: "Explorer",
    target: "explorer.exe",
    icon: null
  },
  {
    id: "github",
    type: "url",
    name: "GitHub",
    target: "https://github.com",
    icon: "https://github.githubassets.com/favicons/favicon.png"
  },
  {
    id: "youtube",
    type: "url",
    name: "YouTube",
    target: "https://youtube.com",
    icon: "https://www.youtube.com/s/desktop/f681da00/img/favicon.ico"
  }
];

export default function AppLauncher({
  onClose,
  accentColor = "#38bdf8",
  textColor = "#ffffff"
}) {
  const [shortcuts, setShortcuts] = useState(() => {
    try {
      const stored = localStorage.getItem("qp_curated_shortcuts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_LAUNCHER_SHORTCUTS;
  });

  const loadShortcuts = useCallback(() => {
    try {
      const stored = localStorage.getItem("qp_curated_shortcuts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setShortcuts(parsed);
          return;
        }
      }
    } catch (_) {}
    setShortcuts(DEFAULT_LAUNCHER_SHORTCUTS);
  }, []);

  useEffect(() => {
    window.addEventListener("storage", loadShortcuts);
    window.addEventListener("qp_shortcuts_updated", loadShortcuts);
    return () => {
      window.removeEventListener("storage", loadShortcuts);
      window.removeEventListener("qp_shortcuts_updated", loadShortcuts);
    };
  }, [loadShortcuts]);

  const handleLaunch = async (item) => {
    try {
      if (item.type === "url") {
        if (window.electronAPI?.launcher?.openUrl) {
          await window.electronAPI.launcher.openUrl(item.target);
        } else if (window.electronAPI?.openExternal) {
          await window.electronAPI.openExternal(item.target);
        } else {
          window.open(item.target, "_blank");
        }
      } else {
        if (window.electronAPI?.launcher?.openApp) {
          await window.electronAPI.launcher.openApp(item.target);
        } else if (window.electronAPI?.launchApp) {
          await window.electronAPI.launchApp(item.target);
        }
      }
    } catch (err) {
      console.error("Failed to launch shortcut:", err);
    }
    if (onClose) onClose();
  };

  const openSettings = () => {
    if (window.electronAPI?.openSettingsWindow) {
      window.electronAPI.openSettingsWindow();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 24px 22px 24px",
        boxSizing: "border-box",
        userSelect: "none"
      }}
    >
      {shortcuts.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "rgba(255, 255, 255, 0.45)"
          }}
        >
          <span style={{ fontSize: 12 }}>No shortcuts configured yet</span>
          <button
            onClick={openSettings}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: 999,
              cursor: "pointer"
            }}
          >
            <SettingsIcon size={12} />
            Configure in Settings
          </button>
        </div>
      ) : (
        <div
          className="launcher-scrollable"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: shortcuts.length <= 5 ? "center" : "flex-start",
            gap: 12,
            width: "100%",
            overflowX: "auto",
            scrollbarWidth: "none",
            padding: "4px 8px"
          }}
        >
          {shortcuts.map((item, idx) => (
            <div
              key={item.id || item.name + idx}
              onClick={() => handleLaunch(item)}
              title={`${item.name} (${item.target})`}
              style={{
                width: 68,
                height: 78,
                background: "#121212",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 14,
                padding: "8px 6px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                flexShrink: 0,
                boxSizing: "border-box",
                transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px) scale(1.04)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                e.currentTarget.style.background = "#181818";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px) scale(1)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.background = "#121212";
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.05)",
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
                    alt={item.name}
                    style={{
                      width: 28,
                      height: 28,
                      objectFit: "contain",
                      borderRadius: 6
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.nextSibling) {
                        e.currentTarget.nextSibling.style.display = "flex";
                      }
                    }}
                  />
                ) : null}
                <div
                  style={{
                    display: item.icon ? "none" : "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%"
                  }}
                >
                  {item.type === "url" ? (
                    <Globe size={20} color={accentColor} />
                  ) : item.name.toLowerCase().includes("explorer") ? (
                    <Folder size={20} color="#f59e0b" />
                  ) : (
                    <Play size={18} color="#ffffff" />
                  )}
                </div>
              </div>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#ffffff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                  textAlign: "center",
                  letterSpacing: "0.01em"
                }}
              >
                {item.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
