// src/landing/hmr-client.ts
var statusEl = document.getElementById("status");
function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}
function connect() {
  const url = new URL("/hmr", window.location.href);
  const es = new EventSource(url.toString());
  es.onopen = () => {
    setStatus("\u2705 connected");
  };
  es.onerror = () => {
    setStatus("\u26A0\uFE0F reconnecting\u2026");
    es.close();
    setTimeout(connect, 1e3);
  };
  es.onmessage = (ev) => {
    if (ev.data === "reload") {
      setStatus("\u{1F501} reloading\u2026");
      window.location.reload();
    }
  };
}
if (typeof window !== "undefined") {
  connect();
}
