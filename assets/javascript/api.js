/* ============================================================
 * TruthPulse API client — backend requests with cookie sessions.
 * Private credentials remain on the backend, never in this file.
 * ============================================================ */
(function () {
  "use strict";

  function endpoint(path, params = {}) {
    let resolved = path;
    Object.entries(params).forEach(([key, value]) => {
      resolved = resolved.replace(`{${key}}`, encodeURIComponent(String(value)));
    });
    if (/\{[^}]+\}/.test(resolved)) throw new Error("A required API endpoint parameter is missing.");
    return resolved;
  }

  async function request(path, options = {}) {
    const base = String(CONFIG.API_BASE_URL || "").replace(/\/+$/, "");
    if (!base || base.includes("YOUR_BACKEND")) throw new Error("Backend URL is not configured in config.js.");
    if (window.location.protocol === "https:" && base.startsWith("http://") &&
        !/^http:\/\/localhost(?::\d+)?(?:\/|$)/i.test(base)) {
      throw new Error("The live API must use HTTPS when the website uses HTTPS.");
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || 20000);
    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;
    if (!isFormData && options.body !== undefined) headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");

    try {
      const response = await fetch(base + path, {
        method: options.method || "GET",
        headers,
        body: options.body,
        credentials: "include",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal
      });
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : await response.text();
      if (!response.ok) {
        const error = new Error(payload && typeof payload === "object" && typeof payload.message === "string"
          ? payload.message : `Request failed (${response.status}).`);
        error.status = response.status;
        error.code = payload && typeof payload === "object" ? payload.code : undefined;
        error.remaining = payload && typeof payload === "object" ? payload.remaining : undefined;
        error.dailyLimit = payload && typeof payload === "object" ? payload.dailyLimit : undefined;
        throw error;
      }
      return payload;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("The request timed out. Please try again.");
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const endpoints = CONFIG.ENDPOINTS;
  window.TruthPulseAPI = Object.freeze({
    request,
    register(data) { return request(endpoints.register, { method: "POST", body: JSON.stringify(data) }); },
    login(data) { return request(endpoints.login, { method: "POST", body: JSON.stringify(data) }); },
    logout() { return request(endpoints.logout, { method: "POST" }); },
    currentUser() { return request(endpoints.currentUser); },
    listConversations() { return request(endpoints.listConversations); },
    getConversation(id) { return request(endpoint(endpoints.getConversation, { id })); },
    createConversation(data) { return request(endpoints.createConversation, { method: "POST", body: JSON.stringify(data) }); },
    deleteConversation(id) { return request(endpoint(endpoints.deleteConversation, { id }), { method: "DELETE" }); },
    chat(data) {
      return request(endpoints.chat, {
        method: "POST", body: JSON.stringify(data), timeoutMs: 70000
      });
    },
    aiUsage() { return request(endpoints.aiUsage); },
    sendMessage(id, data) { return request(endpoint(endpoints.sendMessage, { id }), { method: "POST", body: JSON.stringify(data) }); },
    uploadFile(id, file) {
      const body = new FormData();
      body.append("file", file);
      return request(endpoint(endpoints.uploadFile, { id }), { method: "POST", body });
    },
    analyzeContent(data) { return request(endpoints.analyzeContent, { method: "POST", body: JSON.stringify(data) }); }
  });
})();
