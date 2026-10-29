# TruthPulse — current frontend status

## What this version fixes
- Corrected the sign-up page document head (duplicate metadata and missing `</head>`).
- Loaded Bootstrap Icons on all pages so the existing `bi` icons render.
- Removed references to missing/unused frontend scripts.
- Made the landing-page feature-card markup consistent and clarified features that are not live yet.
- Improved demo chat history so conversations can be revisited during the current page session.

## Still intentionally not connected
- Login and sign-up do not create accounts.
- Chat responses are mock/test responses, not the team AI model.
- Attachments are previewed locally only and are not uploaded.
- Conversation history is in memory only and is cleared when the page is refreshed.
- Medical diagnosis, nearby-hospital lookup, research/citation checks, and AI-content detection are product requirements, not implemented capabilities in this frontend yet. Do not present them as live until the relevant backend features are available and tested.

## Backend integration checklist
Before wiring up requests, get from the backend teammate: base URL, endpoint paths/methods, request and response examples, auth mechanism (session cookie or bearer token), allowed file types/size limits, CORS setup, and expected error format. Never put API secrets or passwords in frontend files.

## Run locally
Open the folder in VS Code and use a local static server (for example, VS Code Live Server) rather than opening HTML files directly. External CDN assets require an internet connection.
