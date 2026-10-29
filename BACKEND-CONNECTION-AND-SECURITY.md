# TruthPulse — Backend connection and security checklist

## Frontend connection fields

Open `assets/javascript/config.js` after the backend teammate provides the connection details.

- `API_BASE_URL`: paste the public API base URL including its `/api` prefix if the backend uses one.
  - Example shape only: `https://api.your-domain.example/api`
  - Do not use the example as a real URL.
- `ENDPOINTS.login`: exact login path, relative to the base URL; expected method is POST.
- `ENDPOINTS.register`: exact account-creation path; expected method is POST.
- `ENDPOINTS.logout`: exact logout path; expected method is POST.
- `ENDPOINTS.currentUser`: endpoint that returns the current signed-in user; expected method is GET.
- `ENDPOINTS.listConversations`: list the signed-in user's conversations; expected method is GET.
- `ENDPOINTS.createConversation`: create a conversation; expected method is POST.
- `ENDPOINTS.getConversation`: path template for one conversation. Keep `{id}` if the route uses an ID in the path.
- `ENDPOINTS.sendMessage`: path template for sending a message. Confirm request body and response schema with the backend developer.
- `ENDPOINTS.uploadFile`: multipart/form-data endpoint. Confirm whether it expects `file`, `files`, or another field name.
- `ENDPOINTS.analyzeContent`: endpoint for analysis. Confirm if text and media use one endpoint or separate routes.
- `USE_LIVE_AUTH`: leave `false` until real auth routes, CORS, and cookie/session behavior have been tested.
- `USE_MOCK_API`: leave `true` until the analysis endpoint is actually integrated into `chat.js`.

The API helper is `assets/javascript/api.js`. It uses JSON for ordinary requests, `FormData` for uploads, a 20-second timeout, and `credentials: "include"` for server-managed cookie sessions. It deliberately does not persist passwords or bearer tokens in browser storage. The chat UI still uses mock replies until its real endpoint contract is mapped.

## Passwords and personal data — important truth

The browser does **not** securely encrypt account data by itself. Client-side validation is only for user experience and can be bypassed. The backend must independently validate all inputs.

- Serve the production website and API over HTTPS only.
- Never store plaintext passwords. Hash passwords on the server using a modern password-hashing algorithm such as Argon2id (preferred where available) or bcrypt, with library-managed salts and safe parameters.
- Do not log passwords, authentication headers, session cookies, or sensitive uploaded content.
- Prefer server-set session cookies with `Secure`, `HttpOnly`, and an appropriate `SameSite` setting. Add CSRF protection if the chosen session architecture requires it.
- Never store passwords or session tokens in `localStorage` or `sessionStorage`.
- Encrypt sensitive data at rest on the server/database where required by the project's data policy; protect backups and encryption keys separately.
- The demo chat history currently uses browser `localStorage` and is **not encrypted**. Do not enter real sensitive information into the prototype. For real accounts, move history to authenticated backend storage and define retention/deletion rules.
- Restrict CORS to the real frontend origins. Do not use wildcard origins with credentialed requests.
- Apply server-side authorization to every conversation and file route; users must only access their own records.
- Validate uploads on the server using file size limits, allow-listed types, file signatures (magic bytes), safe filenames, and malware scanning where available. Do not trust the browser's `accept` attribute or MIME type.
- Add rate limits to login, registration, analysis, and upload endpoints; use generic login failure messages and monitor suspicious traffic.
- Configure security headers on the server/hosting layer (for example CSP, HSTS after HTTPS is configured, `X-Content-Type-Options`, and a suitable `Referrer-Policy`).
- Keep API/database secrets in server environment variables or a secrets manager, never in frontend files or Git.
- Test authentication, authorization, invalid inputs, oversized files, rate limits, CORS, CSRF where applicable, and account deletion before calling the app production-ready.

## Expected coordination details from the backend teammate

Ask the backend developer for:
1. Public base URL and whether it includes `/api`.
2. Exact endpoint paths and HTTP methods.
3. Request body examples and success/error response examples for each endpoint.
4. Whether authentication uses HttpOnly cookies or another documented mechanism.
5. CORS allow-list origins for local development and production.
6. Upload limits, accepted formats, and whether the backend returns an upload ID or analysis result.
7. Whether text analysis and image/video analysis have separate endpoints.
8. How confidence scores and evidence are represented, and what the model's limitations are.

Until these are confirmed and tested, the project should continue to label AI output as demo/test data.
