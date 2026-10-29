/* ============================================================
   UTILS — small reusable helpers
   ============================================================ */

/**
 * Create a DOM element safely.
 * interpreted as HTML or scripts.
 */
function createElement(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

/** Format a JS Date into HH:MM. */
function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Mock ID for in-memory conversations only. */
function generateMockId() {
  return "mock-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

/**
 * Format bytes into a human-readable string: "1.2 MB", "840 KB".
 */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return bytes + " B";
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + " KB";
  const mb = kb / 1024;
  return mb.toFixed(1) + " MB";
}