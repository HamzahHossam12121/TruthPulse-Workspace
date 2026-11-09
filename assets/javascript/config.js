/* ============================================================
   TruthPulse API CONFIGURATION
   Keep private API keys, passwords, and database credentials out of frontend code.
   ============================================================ */
const CONFIG = {
  API_BASE_URL: "https://truthpulse-backend-wr0r.onrender.com",
  ENDPOINTS: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    currentUser: "/api/auth/me",
    listConversations: "/api/conversations",
    createConversation: "/api/conversations",
    getConversation: "/api/conversations/{id}",
    deleteConversation: "/api/conversations/{id}",
    chat: "/api/chat",
    aiUsage: "/api/ai/usage",
    sendMessage: "/api/conversations/{id}/messages",
    uploadFile: "/api/conversations/{id}/upload"
  },
  USE_MOCK_API: false,
  USE_LIVE_AUTH: true
};

Object.freeze(CONFIG.ENDPOINTS);
Object.freeze(CONFIG);
