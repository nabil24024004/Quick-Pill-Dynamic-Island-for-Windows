import { createRoot } from 'react-dom/client';
import Island from './Island';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Emergency global error handler ensuring mouse events do not lock the user's screen
window.addEventListener('error', (event) => {
  console.error('[Quick Pill Window Error]:', event.error || event.message);
  try {
    if (window.electronAPI?.logRendererError) {
      window.electronAPI.logRendererError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack || String(event.error)
      });
    }
  } catch (_) {}
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Quick Pill Unhandled Rejection]:', event.reason);
  try {
    if (window.electronAPI?.logRendererError) {
      window.electronAPI.logRendererError({
        message: `Unhandled Promise Rejection: ${event.reason?.message || String(event.reason)}`,
        stack: event.reason?.stack
      });
    }
  } catch (_) {}
});

const App = () => {
  return (
    <ErrorBoundary
      fallback={
        <div
          style={{
            position: 'fixed',
            top: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: 20,
            padding: '8px 16px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            zIndex: 999999
          }}
          onMouseEnter={() => window.electronAPI?.setIgnoreMouseEvents?.(false, true)}
          onMouseLeave={() => window.electronAPI?.setIgnoreMouseEvents?.(true, true)}
        >
          <span>Quick Pill encountered an error</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#0070f3',
              border: 'none',
              borderRadius: 6,
              padding: '3px 8px',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      }
    >
      <Island />
    </ErrorBoundary>
  );
};

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
