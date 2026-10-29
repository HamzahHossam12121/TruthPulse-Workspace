# TruthPulse — Frontend polish package

## What changed
- Home page: sticky navigation that changes appearance on scroll, restrained motion, fluid spacing, updated font pairing, refined hero and cards.
- Chat: subtle message/empty-state motion, improved input focus treatment, and conversation rename/delete controls.
- Conversation history: browser-local persistence for demo conversations.
- Auth: live password checklist (8+ chars, lowercase, uppercase, number, special character), matching-password feedback, and demo/live API flow switches.
- Integration: `assets/javascript/api.js` provides a configurable fetch client; `assets/javascript/config.js` contains clearly commented placeholders.
- Documentation: `BACKEND-CONNECTION-AND-SECURITY.md` explains where to put backend details and what the server must enforce.

## Run
Open the folder using a local development server (for example, VS Code Live Server). Some browser features and API calls behave differently when opening HTML files directly via `file://`.

## Before real deployment
This is still a frontend prototype, not a production-secured application. The AI analysis request is not wired into the chat because the backend request/response contract has not been provided. Keep `USE_MOCK_API: true` and `USE_LIVE_AUTH: false` until the endpoints are confirmed and tested.

The demo chat history uses `localStorage` and is not encrypted. Do not enter sensitive information. Production security requires HTTPS, server-side validation, password hashing, secure session cookies, authorization checks, upload validation, rate limiting, CORS/CSRF configuration where applicable, and server-side security headers. See `BACKEND-CONNECTION-AND-SECURITY.md`.
