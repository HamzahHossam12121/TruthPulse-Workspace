/* ============================================================
   CONFIG — central place for backend API settings
   ============================================================
    NO secret keys, tokens, or passwords belong here.
   The frontend only knows a PUBLIC base URL.
   Auth tokens will be handled later per the backend's design.
   ============================================================ */

const CONFIG = {
  //  Replace with the real backend URL when your teammate
  //    provides it. Example: "https://api.example.com"
  API_BASE_URL: "http://localhost:8000/api",

  // Endpoint paths — RELATIVE to API_BASE_URL.
  // These are PLACEHOLDERS. Confirm with your teammate.
  ENDPOINTS: {
    login:               "/auth/login",                    // POST
    register:            "/auth/register",                 // POST
    logout:              "/auth/logout",                   // POST
    currentUser:         "/auth/me",                       // GET
    listConversations:   "/conversations",                 // GET
    createConversation:  "/conversations",                 // POST
    getConversation:     "/conversations/{id}",            // GET
    sendMessage:         "/conversations/{id}/messages",   // POST
    uploadFile:          "/conversations/{id}/upload",     // POST (multipart)
  },

  // Feature flag — Stage 1 uses mocks. Set to false when backend
  // is ready and js/api.js exists.
  USE_MOCK_API: true,
};

Object.freeze(CONFIG);
Object.freeze(CONFIG.ENDPOINTS);