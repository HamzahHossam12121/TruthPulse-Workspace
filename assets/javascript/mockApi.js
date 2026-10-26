/* ============================================================
   MOCK API — TEMPORARY, STAGE 1 ONLY
   ============================================================
   These are NOT real AI responses. They exist to test the
   UI. When the backend is ready, set CONFIG.USE_MOCK_API=false
   and use the real API module instead.
   ============================================================ */

/**
 * Returns a fake AI reply. Simulates network delay so we can
 * see the typing indicator.
 *
 * @param {string} userMessage
 * @returns {Promise<{ text: string, isMock: true }>}
 */
function mockSendMessage(userMessage) {
  return new Promise((resolve) => {
    const delay = 700 + Math.random() * 700;
    setTimeout(() => {
      const reply =
        "This is a MOCK response for UI testing only. " +
        "You said: \"" +
        userMessage +
        "\". Once the Python backend is connected, this will be " +
        "replaced by the real AI model's analysis.";
      resolve({ text: reply, isMock: true });
    }, delay);
  });
}