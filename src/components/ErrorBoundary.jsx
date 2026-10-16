import React from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Quick Pill ErrorBoundary caught error]:", error, errorInfo);
    try {
      if (window.electronAPI?.logRendererError) {
        window.electronAPI.logRendererError({
          message: error?.message || String(error),
          stack: error?.stack,
          componentStack: errorInfo?.componentStack
        });
      }
    } catch (_) {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 18px",
            boxSizing: "border-box",
            gap: 8,
            color: "#ffffff",
            textAlign: "center",
            userSelect: "none"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f87171" }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {this.props.tabName ? `${this.props.tabName} encountered an issue` : "Tab unavailable"}
            </span>
          </div>

          <div
            style={{
              fontSize: 10,
              color: "rgba(255, 255, 255, 0.55)",
              maxWidth: 380,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {this.state.error?.message || "An unexpected rendering error occurred"}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: 6,
                padding: "4px 10px",
                color: "#ffffff",
                fontSize: 10.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              <RotateCcw size={11} />
              Retry
            </button>
            {this.props.onGoHome && (
              <button
                type="button"
                onClick={this.props.onGoHome}
                style={{
                  background: "#0070f3",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 12px",
                  color: "#ffffff",
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <Home size={11} />
                Return to Clock
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
