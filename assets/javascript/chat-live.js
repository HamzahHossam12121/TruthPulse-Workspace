/* ============================================================
   CHAT PAGE — account-owned conversations + Google AI backend.
   Keeps the existing page markup and CSS classes; conversation data is
   loaded from the authenticated backend rather than browser localStorage.
   ============================================================ */
(function initLiveChatPage() {
  "use strict";
  const form = document.getElementById("messageForm");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const messagesEl = document.getElementById("chatMessages");
  const titleEl = document.getElementById("chatTitle");
  const subtitleEl = document.getElementById("chatSubtitle");
  const newChatBtn = document.getElementById("newChatBtn");
  const listEl = document.getElementById("conversationList");
  const sidebar = document.getElementById("sidebar");
  const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
  const attachBtn = document.getElementById("attachBtn");
  const fileInput = document.getElementById("fileInput");
  const attachmentPreviews = document.getElementById("attachmentPreviews");
  const badge = document.querySelector(".chat-badge");
  if (!form || !window.TruthPulseAPI) return;

  const state = { conversations: [], currentId: null, sending: false, attachedFiles: [], remaining: 5, dailyLimit: 5 };
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const scrollBottom = () => { messagesEl.scrollTop = messagesEl.scrollHeight; };
  function clearMessages() { messagesEl.replaceChildren(); }
  function showEmpty() {
    const wrap = el("div", "empty-state");
    wrap.id = "emptyState";
    const iconWrap = el("div", "empty-icon-wrap");
    const icon = el("i", "bi bi-search empty-icon-i");
    icon.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(icon);
    wrap.append(iconWrap, el("h3", "", "Let's verify something"),
      el("p", "", "Type a message below to get started. File uploads are not connected yet."));
    messagesEl.appendChild(wrap);
  }
  function appendMessage(role, text, files = []) {
    const row = el("div", `message-row ${role === "user" ? "user" : "ai"}`);
    const bubble = el("div", "message-bubble");
    if (text) bubble.appendChild(document.createTextNode(text));
    if (files.length) {
      const fileList = el("div", "message-files");
      files.forEach((name) => {
        const item = el("div", "message-file-item");
        const icon = el("i", "bi bi-paperclip");
        icon.setAttribute("aria-hidden", "true");
        item.append(icon, document.createTextNode(name));
        fileList.appendChild(item);
      });
      bubble.appendChild(fileList);
    }
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollBottom();
  }
  function showError(text) {
    const row = el("div", "message-row ai");
    row.appendChild(el("div", "message-error", text));
    messagesEl.appendChild(row);
    scrollBottom();
  }
  function updateUsage(remaining, limit) {
    if (Number.isFinite(remaining)) state.remaining = remaining;
    if (Number.isFinite(limit)) state.dailyLimit = limit;
    if (subtitleEl) subtitleEl.textContent = `${state.remaining} of ${state.dailyLimit} AI questions remaining today.`;
  }
  function renderConversationList() {
    listEl.replaceChildren();
    if (!state.conversations.length) {
      listEl.appendChild(el("li", "conversation-empty", "No conversations yet."));
      return;
    }
    state.conversations.forEach((conversation) => {
      const li = el("li", "conversation-item");
      if (conversation.id === state.currentId) li.classList.add("active");
      const openBtn = el("button", "conversation-title-btn", conversation.title || "New Conversation");
      openBtn.type = "button";
      openBtn.title = "Open conversation";
      openBtn.addEventListener("click", () => openConversation(conversation.id));
      const deleteBtn = el("button", "conversation-action-btn delete");
      deleteBtn.type = "button";
      deleteBtn.title = "Delete conversation";
      deleteBtn.setAttribute("aria-label", `Delete ${conversation.title || "conversation"}`);
      const icon = el("i", "bi bi-trash3");
      icon.setAttribute("aria-hidden", "true");
      deleteBtn.appendChild(icon);
      deleteBtn.addEventListener("click", () => deleteConversation(conversation.id));
      li.append(openBtn, deleteBtn);
      listEl.appendChild(li);
    });
  }
  async function refreshConversations() {
    const result = await TruthPulseAPI.listConversations();
    state.conversations = Array.isArray(result.conversations) ? result.conversations : [];
    renderConversationList();
  }
  async function refreshUsage() {
    try {
      const usage = await TruthPulseAPI.aiUsage();
      updateUsage(usage.remaining, usage.dailyLimit);
    } catch (error) {
      if (error.status === 401) throw error;
      console.warn("Could not load daily AI usage.", error);
    }
  }
  async function openConversation(id) {
    try {
      const result = await TruthPulseAPI.getConversation(id);
      const conversation = result.conversation;
      if (!conversation) throw new Error("Conversation could not be loaded.");
      state.currentId = conversation.id;
      titleEl.textContent = conversation.title || "Conversation";
      clearMessages();
      const history = Array.isArray(conversation.messages) ? conversation.messages : [];
      if (!history.length) showEmpty();
      history.forEach((message) => appendMessage(message.role, message.content || ""));
      renderConversationList();
      if (sidebar) sidebar.classList.remove("open");
    } catch (error) {
      if (error.status === 401) return requireLogin();
      showError(error.message || "Could not load this conversation.");
    }
  }
  async function deleteConversation(id) {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      await TruthPulseAPI.deleteConversation(id);
      state.conversations = state.conversations.filter((item) => item.id !== id);
      if (state.currentId === id) newConversation();
      renderConversationList();
    } catch (error) {
      if (error.status === 401) return requireLogin();
      showError(error.message || "Could not delete the conversation.");
    }
  }
  function newConversation() {
    state.currentId = null;
    titleEl.textContent = "New Conversation";
    clearMessages();
    showEmpty();
    renderConversationList();
    input.focus();
  }
  function requireLogin() {
    showError("Please sign in to use AI chat and access your conversations.");
    window.setTimeout(() => window.location.assign("login.html"), 1200);
  }
  function showTyping() {
    const row = el("div", "message-row ai");
    row.id = "typingRow";
    const indicator = el("div", "typing-indicator");
    indicator.append(el("span"), el("span"), el("span"));
    row.appendChild(indicator);
    messagesEl.appendChild(row);
    scrollBottom();
  }
  function setSending(value) {
    state.sending = value;
    sendBtn.disabled = value;
    input.disabled = value;
    if (attachBtn) attachBtn.disabled = value;
    sendBtn.innerHTML = value
      ? '<i class="bi bi-hourglass-split me-1" aria-hidden="true"></i>Sending…'
      : '<i class="bi bi-send-fill me-1" aria-hidden="true"></i>Send';
  }
  async function handleSend(event) {
    event.preventDefault();
    if (state.sending) return;
    const message = input.value.trim();
    const fileNames = state.attachedFiles.map((entry) => entry.file.name);
    if (!message) {
      if (fileNames.length) showError("File analysis is not connected yet. Please send a text question.");
      return;
    }

    const titleWasNew = !state.currentId;
    clearMessages();
    appendMessage("user", message, fileNames);
    input.value = "";
    clearAttachments();
    setSending(true);
    showTyping();
    try {
      const result = await TruthPulseAPI.chat({ message, conversationId: state.currentId });
      document.getElementById("typingRow")?.remove();
      if (!result || result.success !== true || typeof result.text !== "string") {
        throw new Error("The backend returned an unexpected AI response.");
      }
      appendMessage("assistant", result.text);
      state.currentId = result.conversationId || state.currentId;
      if (titleWasNew) titleEl.textContent = message.slice(0, 40) + (message.length > 40 ? "…" : "");
      updateUsage(result.remaining, result.dailyLimit);
      if (badge) {
        badge.title = "AI responses are generated by Google AI Studio.";
        badge.replaceChildren(el("i", "bi bi-stars me-1"), document.createTextNode("AI connected"));
      }
      await refreshConversations();
    } catch (error) {
      document.getElementById("typingRow")?.remove();
      if (error.status === 401) {
        requireLogin();
      } else {
        if (error.code === "DAILY_QUESTION_LIMIT") updateUsage(0, error.dailyLimit || state.dailyLimit);
        if (Number.isFinite(error.remaining)) updateUsage(error.remaining, error.dailyLimit || state.dailyLimit);
        showError(error.message || "The AI service could not answer. Please try again.");
      }
    } finally {
      setSending(false);
      input.focus();
    }
  }
  function clearAttachments() {
    state.attachedFiles.forEach((entry) => { if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl); });
    state.attachedFiles = [];
    if (attachmentPreviews) { attachmentPreviews.replaceChildren(); attachmentPreviews.hidden = true; }
    if (fileInput) fileInput.value = "";
  }
  function handleFiles(event) {
    const chosen = Array.from(event.target.files || []);
    const accepted = chosen.filter((file) => file.size <= 25 * 1024 * 1024 &&
      /^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|quicktime)|application\/pdf)$/.test(file.type));
    state.attachedFiles = accepted.slice(0, 3).map((file) => ({ file, objectUrl: URL.createObjectURL(file) }));
    if (attachmentPreviews) {
      attachmentPreviews.replaceChildren();
      state.attachedFiles.forEach(({ file }) => attachmentPreviews.appendChild(el("div", "attachment-card", `${file.name} · preview only (not sent)`)));
      attachmentPreviews.hidden = !state.attachedFiles.length;
    }
    fileInput.value = "";
  }

  form.addEventListener("submit", handleSend);
  newChatBtn?.addEventListener("click", newConversation);
  attachBtn?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", handleFiles);
  toggleSidebarBtn?.addEventListener("click", () => sidebar?.classList.toggle("open"));
  if (badge) {
    badge.title = "Chat requests use Google AI Studio through the authenticated backend.";
    badge.replaceChildren(el("i", "bi bi-stars me-1"), document.createTextNode("AI connected"));
  }

  (async () => {
    try {
      await Promise.all([refreshConversations(), refreshUsage()]);
      if (state.conversations.length) await openConversation(state.conversations[0].id);
      else newConversation();
    } catch (error) {
      if (error.status === 401) requireLogin();
      else {
        updateUsage(5, 5);
        newConversation();
        showError(error.message || "Could not connect to the backend. Please try again later.");
      }
    }
  })();
})();
