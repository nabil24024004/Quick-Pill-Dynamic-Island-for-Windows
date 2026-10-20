import React, { useState, useRef, useEffect, useCallback } from "react";

/**
 * AskAI: Ultra-Minimalist Ripple-Style AI Companion Module
 * 
 * Layout matching user's exact specification:
 * - Pure black canvas.
 * - Top-left clean input with large 18px text and blinking cursor.
 * - Full-width solid white pill action button at the bottom.
 * - Zero clutter: no headers, no subheaders, no decorative icons.
 */
export default function AskAI({
  textColor = "#ffffff",
  accentColor = "#a855f7",
  onClose
}) {
  const [prompt, setPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'response' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  const inputRef = useRef(null);

  // Auto-focus input on mount and when returning to idle
  useEffect(() => {
    if (status === "idle") {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Handle Query Submission to Local JARVIS
  const handleAsk = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || status === "loading") return;

    setLastPrompt(trimmed);
    setStatus("loading");
    setErrorMessage("");

    try {
      if (!window.electronAPI?.askJarvis) {
        throw new Error("JARVIS bridge IPC is unavailable in this environment.");
      }

      const res = await window.electronAPI.askJarvis(trimmed);

      if (res && res.success) {
        setResponse(res.response || "No response received from JARVIS.");
        setStatus("response");
        setPrompt("");
      } else {
        setErrorMessage(res?.error || "JARVIS local server offline. Make sure D:/JARVIS is running.");
        setStatus("error");
      }
    } catch (err) {
      setErrorMessage(err.message || "JARVIS local server offline. Make sure D:/JARVIS is running.");
      setStatus("error");
    }
  }, [prompt, status]);

  // Reset to Ask Another Query
  const handleReset = useCallback(() => {
    setStatus("idle");
    setPrompt("");
    setErrorMessage("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  // Launch Local D:/JARVIS instance if offline
  const handleLaunchJarvis = useCallback(async () => {
    setIsLaunching(true);
    setErrorMessage("Starting D:/JARVIS instance...");
    try {
      if (window.electronAPI?.launchJarvisServer) {
        const res = await window.electronAPI.launchJarvisServer();
        if (res?.success) {
          setTimeout(() => {
            setIsLaunching(false);
            handleAsk();
          }, 3000);
          return;
        }
      }
    } catch (_) {}
    setIsLaunching(false);
    setErrorMessage("Could not auto-start D:/JARVIS. Please open D:/JARVIS/run_gui.bat manually.");
  }, [handleAsk]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        padding: "10px 4px 12px 4px",
        userSelect: "none",
        position: "relative"
      }}
    >
      {/* =========================================================================
          STATE 1: IDLE / READY TO ASK OR LOADING
          ========================================================================= */}
      {(status === "idle" || status === "loading") && (
        <>
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            placeholder="Ask Jarvis anything..."
            disabled={status === "loading"}
            rows={2}
            style={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              color: "#ffffff",
              fontSize: 18,
              fontWeight: 500,
              fontFamily: "inherit",
              padding: 0,
              margin: 0,
              lineHeight: 1.35,
              caretColor: "#ffffff",
              opacity: status === "loading" ? 0.6 : 1
            }}
            autoFocus
          />

          <button
            type="button"
            onClick={handleAsk}
            disabled={!prompt.trim() || status === "loading"}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 999,
              background: "#ffffff",
              color: "#000000",
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              cursor: (!prompt.trim() || status === "loading") ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "opacity 120ms ease, transform 100ms ease",
              opacity: (!prompt.trim() || status === "loading") ? 0.6 : 1,
              marginTop: 10
            }}
            onMouseEnter={(e) => {
              if (prompt.trim() && status !== "loading") e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              if (prompt.trim() && status !== "loading") e.currentTarget.style.opacity = "1";
            }}
            onMouseDown={(e) => {
              if (prompt.trim() && status !== "loading") e.currentTarget.style.transform = "scale(0.99)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {status === "loading" ? "Thinking..." : "Ask"}
          </button>
        </>
      )}

      {/* =========================================================================
          STATE 2: RESPONSE STATE
          ========================================================================= */}
      {status === "response" && (
        <>
          <div
            className="ai-scrollable"
            style={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              color: "#ffffff",
              fontSize: 13.5,
              lineHeight: 1.45,
              userSelect: "text",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              paddingRight: 4
            }}
          >
            {response}
          </div>

          <button
            type="button"
            onClick={handleReset}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 999,
              background: "#ffffff",
              color: "#000000",
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "opacity 120ms ease",
              marginTop: 10
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Ask another
          </button>
        </>
      )}

      {/* =========================================================================
          STATE 3: ERROR / OFFLINE STATE
          ========================================================================= */}
      {status === "error" && (
        <>
          <div
            style={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 4
            }}
          >
            <div style={{ color: "#f87171", fontSize: 13, fontWeight: 700 }}>
              JARVIS Offline
            </div>
            <div
              style={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: 11.5,
                lineHeight: 1.35
              }}
            >
              {errorMessage || "JARVIS local server offline. Make sure D:/JARVIS is running."}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 10 }}>
            <button
              type="button"
              onClick={handleLaunchJarvis}
              disabled={isLaunching}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 999,
                background: "#ffffff",
                color: "#000000",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: isLaunching ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {isLaunching ? "Starting JARVIS..." : "Start JARVIS"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: "0 18px",
                height: 38,
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
