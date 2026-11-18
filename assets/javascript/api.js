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
    chat(data, { onToken } = {}) {
      return new Promise((resolve, reject) => {
        const base = String(CONFIG.API_BASE_URL || "").replace(/\/+$/, "");
        fetch(base + endpoints.chat, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
          body: JSON.stringify(data),
          credentials: "include",
          cache: "no-store"
        }).then((response) => {
          if (!response.ok) {
            return response.json().catch(() => ({})).then((payload) => {
              const error = new Error(payload?.message || `Request failed (${response.status}).`);
              error.status = response.status;
              error.code = payload?.code;
              error.remaining = payload?.remaining;
              error.dailyLimit = payload?.dailyLimit;
              reject(error);
            });
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          function pump() {
            reader.read().then(({ done, value }) => {
              if (done) return;
              buf += decoder.decode(value, { stream: true });
              const parts = buf.split("\n\n");
              buf = parts.pop();
              for (const part of parts) {
                const eventMatch = part.match(/^event: (\w+)/m);
                const dataMatch = part.match(/^data: (.+)$/m);
                if (!eventMatch || !dataMatch) continue;
                try {
                  const payload = JSON.parse(dataMatch[1]);
                  if (eventMatch[1] === "token" && typeof onToken === "function") onToken(payload.token);
                  if (eventMatch[1] === "done") resolve(payload);
                  if (eventMatch[1] === "error") {
                    const err = new Error(payload.message || "AI error.");
                    err.code = payload.code;
                    reject(err);
                  }
                } catch { /* skip */ }
              }
              pump();
            }).catch(reject);
          }
          pump();
        }).catch(reject);
      });
    },
    aiUsage() { return request(endpoints.aiUsage); },
    sendMessage(id, data) { return request(endpoint(endpoints.sendMessage, { id }), { method: "POST", body: JSON.stringify(data) }); },
    status() { return request(endpoints.status); },
    uploadFile(file) {
      const body = new FormData();
      body.append("files", file);
      return request(endpoints.uploadFile, { method: "POST", body, timeoutMs: 120000 });
    },
    analyzeContent(data) { return request(endpoints.analyzeContent, { method: "POST", body: JSON.stringify(data) }); }
  });
})();
