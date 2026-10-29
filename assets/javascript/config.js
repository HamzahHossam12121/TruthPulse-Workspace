/* ============================================================
   TruthPulse API CONFIGURATION
   ============================================================
   BACKEND CONNECTION CHECKLIST — fill these only when the backend
   developer sends the real values:
   [1] API_BASE_URL: full public API origin + base prefix, e.g.
       "https://api.your-real-domain.com/api"
   [2] ENDPOINTS: exact route paths relative to API_BASE_URL.
   [3] USE_MOCK_API: keep true until the analysis endpoint is implemented.
   [4] USE_LIVE_AUTH: set true only after register/login endpoints are tested.
   Never place private API keys, passwords, or database credentials here.
   ============================================================ */
const CONFIG = {
  API_BASE_URL: "http://localhost:8000/api", // TODO: replace with teammate's API base URL

  ENDPOINTS: {
    login:              "/auth/login",                  // TODO: exact login endpoint; expected POST
    register:           "/auth/register",               // TODO: exact registration endpoint; expected POST
    logout:             "/auth/logout",                 // TODO: exact logout endpoint; expected POST
    currentUser:        "/auth/me",                     // TODO: endpoint that returns current session user; GET
    listConversations:  "/conversations",               // TODO: GET
    createConversation: "/conversations",               // TODO: POST
    getConversation:    "/conversations/{id}",          // TODO: replace route shape if backend differs
    sendMessage:        "/conversations/{id}/messages", // TODO: POST; confirm request/response schema
    uploadFile:         "/conversations/{id}/upload"    // TODO: POST multipart/form-data
  },

  USE_MOCK_API: true,  // keep true until the real AI-analysis API is ready
  USE_LIVE_AUTH: false // turn on only after real auth endpoints + cookie behavior are confirmed
};

Object.freeze(CONFIG.ENDPOINTS);
Object.freeze(CONFIG);
