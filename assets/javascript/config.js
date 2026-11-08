/* ============================================================
   TruthPulse API CONFIGURATION
   ============================================================
   Keep private API keys, passwords, and database credentials out of frontend code.
   ============================================================ */
const CONFIG = {
  API_BASE_URL: "https://truthpulse-backend-wr0r.onrender.com",

  ENDPOINTS: {
    login:              "/api/auth/login",
    register:           "/api/auth/register",
    logout:             "/api/auth/logout",
    currentUser:        "/api/auth/me",
    listConversations:  "/conversations",
    createConversation: "/conversations",
    getConversation:    "/conversations/{id}",
    sendMessage:        "/conversations/{id}/messages",
    uploadFile:         "/conversations/{id}/upload",
  },

  USE_MOCK_API: true,
  USE_LIVE_AUTH: true
};

Object.freeze(CONFIG.ENDPOINTS);
Object.freeze(CONFIG);
