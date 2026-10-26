/* ============================================================
   UTILS — small reusable helpers
   ============================================================ */

/**
 * Create a DOM element safely.
 * Uses textContent (NOT innerHTML) so user text can never be
 * interpreted as HTML or scripts.
 *
 * @param {string} tag        e.g. "div"
 * @param {string} className  CSS class(es)
 * @param {string} text       optional text content
 * @returns {HTMLElement}
 */
function createElement(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

/**
 * Format a JS Date into HH:MM.
 */
function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Mock ID for in-memory conversations only.
 *  Real conversation IDs must come from the backend.
 */
function generateMockId() {
  return "mock-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}