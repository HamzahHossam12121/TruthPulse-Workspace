/* ============================================================
 * TruthPulse API client — integration-ready placeholder.
 *
 * WHEN YOUR TEAMMATE SENDS THE BACKEND DETAILS:
 * 1) Set CONFIG.API_BASE_URL in config.js to the provided base URL.
 * 2) Update each CONFIG.ENDPOINTS value to the exact route.
 * 3) Confirm HTTP method, request body, response shape, and cookie/session
 *    behavior with the backend developer before enabling live mode.
 *
 * Never put API secrets, private keys, or database credentials in frontend code.
 * This client intentionally does not store passwords or auth tokens in localStorage.
 * For browser sessions, prefer server-set Secure + HttpOnly + SameSite cookies.
 * ============================================================ */
(function () {
  "use strict";

  function endpoint(path, params = {}) {
    let resolved = path;
    Object.entries(params).forEach(([key, value]) => {
      resolved = resolved.replace(`{${key}}`, encodeURIComponent(String(value)));
    });
    if (/\{[^}]+\}/.test(resolved)) {
      throw new Error("A required API endpoint parameter is missing.");
    }
    return resolved;
  }

  async function request(path, options = {}) {
    const base = String(CONFIG.API_BASE_URL || "").replace(/\/+$/, "");
    if (!base || base.includes("YOUR_BACKEND")) {
      throw new Error("Backend URL is not configured yet. Update config.js.");
    }
    if (window.location.protocol === "https:" && base.startsWith("http://") &&
        !/^http:\/\/localhost(?::\d+)?(?:\/|$)/i.test(base)) {
      throw new Error("The live API must use HTTPS when the website uses HTTPS.");
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;

    if (!isFormData && options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("Accept", "application/json");

    try {
      const response = await fetch(base + path, {
        method: options.method || "GET",
        headers,
        body: options.body,
        credentials: "include", // for backend-managed HttpOnly session cookies
        cache: "no-store",
        redirect: "error",
        signal: controller.signal
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const safeMessage =
          payload && typeof payload === "object" && typeof payload.message === "string"
            ? payload.message
            : `Request failed (${response.status}).`;
        const error = new Error(safeMessage);
        error.status = response.status;
        throw error;
      }
      return payload;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("The request timed out. Please try again.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  window.TruthPulseAPI = Object.freeze({
    request,
    register(data) {
      return request(endpoint(CONFIG.ENDPOINTS.register), {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    login(data) {
      return request(endpoint(CONFIG.ENDPOINTS.login), {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    logout() {
      return request(endpoint(CONFIG.ENDPOINTS.logout), { method: "POST" });
    },
    currentUser() {
      return request(endpoint(CONFIG.ENDPOINTS.currentUser));
    },
    listConversations() {
      return request(endpoint(CONFIG.ENDPOINTS.listConversations));
    },
    getConversation(id) {
      return request(endpoint(CONFIG.ENDPOINTS.getConversation, { id }));
    },
    createConversation(data) {
      return request(endpoint(CONFIG.ENDPOINTS.createConversation), {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    sendMessage(id, data) {
      return request(endpoint(CONFIG.ENDPOINTS.sendMessage, { id }), {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    uploadFile(id, file) {
      const body = new FormData();
      body.append("file", file);
      return request(endpoint(CONFIG.ENDPOINTS.uploadFile, { id }), {
        method: "POST",
        body
      });
    },
    analyzeContent(data) {
      return request(endpoint(CONFIG.ENDPOINTS.analyzeContent), {
        method: "POST",
        body: JSON.stringify(data)
      });
    }
  });
})();
