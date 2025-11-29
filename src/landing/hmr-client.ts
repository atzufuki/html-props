// Very small hot-reload client that listens to server-sent reload events.
// Server will expose /hmr endpoint that keeps the connection open and
// pushes "reload" messages when the bundle is rebuilt.

const statusEl = document.getElementById("status");

function setStatus(text: string) {
  if (statusEl) statusEl.textContent = text;
}

function connect() {
  const url = new URL("/hmr", window.location.href);

  const es = new EventSource(url.toString());

  es.onopen = () => {
    setStatus("✅ connected");
  };

  es.onerror = () => {
    setStatus("⚠️ reconnecting…");
    es.close();
    setTimeout(connect, 1000);
  };

  es.onmessage = (ev) => {
    if (ev.data === "reload") {
      setStatus("🔁 reloading…");
      window.location.reload();
    }
  };
}

if (typeof window !== "undefined") {
  connect();
}
