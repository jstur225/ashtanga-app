import Script from 'next/script'

const runtimeDiagnosticsSource = `
(() => {
  if (window.__ashtangaRuntimeDiagnosticsInstalled) return;
  window.__ashtangaRuntimeDiagnosticsInstalled = true;

  const LOG_KEY = 'ashtanga_runtime_diagnostics';
  const SESSION_KEY = 'ashtanga_runtime_session';
  const sessionId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

  const append = (type, details) => {
    try {
      const existing = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      existing.unshift({
        timestamp: new Date().toISOString(),
        sessionId,
        type,
        details
      });
      localStorage.setItem(LOG_KEY, JSON.stringify(existing.slice(0, 100)));
    } catch {}
  };
  window.__ashtangaRuntimeDiagnostic = append;

  try {
    const previous = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (previous && !previous.ready) {
      append('previous_session_incomplete', previous);
    }
  } catch {}

  const session = {
    sessionId,
    startedAt: new Date().toISOString(),
    path: location.pathname + location.search,
    referrer: document.referrer || null,
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    ready: false
  };

  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  append('startup', session);

  window.addEventListener('error', (event) => {
    const target = event.target;
    const resourceUrl = target && (target.src || target.href);
    if (resourceUrl) {
      append('resource_error', {
        tagName: target.tagName || null,
        url: String(resourceUrl).slice(0, 500)
      });
      return;
    }
    append('runtime_error', {
      message: event.message || 'Unknown error',
      filename: event.filename || null,
      line: event.lineno || null,
      column: event.colno || null,
      stack: event.error && event.error.stack ? String(event.error.stack).slice(0, 1200) : null
    });
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    append('unhandled_rejection', {
      message: reason && reason.message ? String(reason.message) : String(reason),
      stack: reason && reason.stack ? String(reason.stack).slice(0, 1200) : null
    });
  });

  document.addEventListener('DOMContentLoaded', () => append('dom_content_loaded', {
    elapsedMs: Math.round(performance.now())
  }), { once: true });

  window.addEventListener('load', () => append('window_loaded', {
    elapsedMs: Math.round(performance.now())
  }), { once: true });

  window.__ashtangaRuntimeReady = () => {
    const readySession = {
      ...session,
      ready: true,
      readyAt: new Date().toISOString(),
      readyElapsedMs: Math.round(performance.now())
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(readySession)); } catch {}
    append('react_ready', { elapsedMs: readySession.readyElapsedMs });
  };
})();
`

export function RuntimeDiagnosticsScript() {
  return (
    <Script
      id="runtime-diagnostics"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: runtimeDiagnosticsSource }}
    />
  )
}
