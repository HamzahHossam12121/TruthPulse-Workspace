(function initLiveChatPage() {
  "use strict";
  const form = document.getElementById("messageForm");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const messagesEl = document.getElementById("chatMessages");
  const titleEl = document.getElementById("chatTitle");
  const subtitleEl = document.getElementById("chatSubtitle");
  const newChatBtn = document.getElementById("newChatBtn");
  const logoutBtn = document.getElementById("chatLogoutBtn");
  const listEl = document.getElementById("conversationList");
  const sidebar = document.getElementById("sidebar");
  const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
  const uploadImageBtn = document.getElementById("uploadImageBtn");
  const uploadVideoBtn = document.getElementById("uploadVideoBtn");
  const uploadDocBtn = document.getElementById("uploadDocBtn");
  const imageFileInput = document.getElementById("imageFileInput");
  const videoFileInput = document.getElementById("videoFileInput");
  const docFileInput = document.getElementById("docFileInput");
  const attachmentPreviews = document.getElementById("attachmentPreviews");
  const badge = document.querySelector(".chat-badge");
  if (!form || !window.TruthPulseAPI) return;

  const state = {
    conversations: [], currentId: null, sending: false, creating: false,
    pendingFiles: [], videoEnabled: true
  };

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
    wrap.append(iconWrap, el("h3", "", "Get started"),
      el("p", "", "Choose New Chat to create and name a conversation. Your messages will be saved to your account."));
    messagesEl.appendChild(wrap);
  }

  function parseMessageContent(content) {
    const tag = content.match(/\n\[files:(\[.*\])\]$/s);
    if (!tag) return { text: content, fileContext: [] };
    try {
      const files = JSON.parse(tag[1]).map((f) => ({ type: f.t, filename: f.n, extracted: f.x }));
      return { text: content.slice(0, tag.index), fileContext: files };
    } catch {
      return { text: content, fileContext: [] };
    }
  }

  function renderMarkdown(text) {
    if (typeof marked === "undefined") return document.createTextNode(text);
    const div = el("div", "markdown-body");
    div.innerHTML = marked.parse(text, { breaks: true, gfm: true });
    div.querySelectorAll("a").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
    return div;
  }

  function appendMessage(role, text, fileContext = []) {
    const row = el("div", `message-row ${role === "user" ? "user" : "ai"}`);
    const bubble = el("div", "message-bubble");
    if (fileContext.length) {
      const fileList = el("div", "message-files");
      fileContext.forEach((f) => {
        const item = el("div", "message-file-item");
        const header = el("div", "message-file-item-header");
        const icon = el("i", "bi bi-paperclip");
        icon.setAttribute("aria-hidden", "true");
        const name = el("span", "", f.filename || f);
        header.append(icon, name);
        item.appendChild(header);
        if (f.extracted) {
          const preview = el("div", "message-file-extracted",
            f.extracted.slice(0, 120) + (f.extracted.length > 120 ? "…" : ""));
          item.appendChild(preview);
        }
        fileList.appendChild(item);
      });
      bubble.appendChild(fileList);
    }
    if (text) bubble.appendChild(role === "assistant" ? renderMarkdown(text) : document.createTextNode(text));
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
      history.forEach((message) => {
        const { text, fileContext } = parseMessageContent(message.content || "");
        appendMessage(message.role, text, fileContext);
      });
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
      if (state.currentId === id) showStartPage();
      renderConversationList();
    } catch (error) {
      if (error.status === 401) return requireLogin();
      showError(error.message || "Could not delete the conversation.");
    }
  }

  function showStartPage() {
    state.currentId = null;
    titleEl.textContent = "Get started";
    clearMessages();
    clearPendingFiles();
    showEmpty();
    renderConversationList();
  }

  function nextDefaultTitle() {
    let maxNumber = 0;
    state.conversations.forEach((conversation) => {
      const match = /^chat(\d+)$/i.exec((conversation.title || "").trim());
      if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
    });
    return `chat${maxNumber + 1}`;
  }

  async function createConversation() {
    if (state.creating) return;
    const fallbackTitle = nextDefaultTitle();
    const entered = window.prompt(`Name this chat (leave blank to use ${fallbackTitle}):`, "");
    if (entered === null) return;
    const title = entered.trim().slice(0, 100) || fallbackTitle;
    state.creating = true;
    if (newChatBtn) newChatBtn.disabled = true;
    try {
      const result = await TruthPulseAPI.createConversation({ title });
      const conversation = result?.conversation;
      if (!conversation?.id) throw new Error("The backend did not return the saved conversation.");
      state.conversations.unshift(conversation);
      state.currentId = conversation.id;
      titleEl.textContent = conversation.title || title;
      clearMessages();
      showEmpty();
      renderConversationList();
      if (sidebar) sidebar.classList.remove("open");
      input.focus();
    } catch (error) {
      if (error.status === 401) requireLogin();
      else showError(error.message || "Could not create and save the conversation.");
    } finally {
      state.creating = false;
      if (newChatBtn) newChatBtn.disabled = false;
    }
  }

  function requireLogin() {
    showError("Your sign-in session has expired. Please sign in again.");
    window.setTimeout(() => window.location.assign("login.html"), 1200);
  }

  async function handleLogout() {
    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.setAttribute("aria-busy", "true");
    }
    try {
      await TruthPulseAPI.logout();
      window.location.replace("index.html");
    } catch (error) {
      showError(error.message || "Sign out failed. Please try again.");
      if (logoutBtn) {
        logoutBtn.disabled = false;
        logoutBtn.removeAttribute("aria-busy");
      }
    }
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

  function applyVideoButton() {
    if (!uploadVideoBtn) return;
    const blocked = !state.videoEnabled;
    uploadVideoBtn.disabled = state.sending || blocked;
    uploadVideoBtn.title = blocked
      ? "Video upload is unavailable."
      : "Upload a video";
    if (videoFileInput) videoFileInput.disabled = blocked;
  }

  function setSending(value) {
    state.sending = value;
    sendBtn.disabled = value;
    input.disabled = value;
    [uploadImageBtn, uploadDocBtn].forEach((btn) => { if (btn) btn.disabled = value; });
    applyVideoButton();
    sendBtn.innerHTML = value
      ? '<i class="bi bi-hourglass-split me-1" aria-hidden="true"></i>Sending…'
      : '<i class="bi bi-send-fill me-1" aria-hidden="true"></i>Send';
  }

  function clearPendingFiles() {
    state.pendingFiles = [];
    if (attachmentPreviews) {
      attachmentPreviews.replaceChildren();
      attachmentPreviews.classList.remove("visible");
    }
    if (imageFileInput) imageFileInput.value = "";
    if (videoFileInput) videoFileInput.value = "";
    if (docFileInput) docFileInput.value = "";
  }

  function fileIcon(file) {
    if (!file) return "bi-paperclip";
    const type = file.type || "";
    if (type.startsWith("image/")) return "bi-file-image";
    if (type.startsWith("video/")) return "bi-camera-video";
    if (type === "application/pdf") return "bi-file-earmark-pdf";
    if (type.includes("word")) return "bi-file-earmark-word";
    if (type.includes("sheet") || type.includes("excel")) return "bi-file-earmark-spreadsheet";
    if (type.includes("presentation") || type.includes("powerpoint")) return "bi-file-earmark-slides";
    return "bi-file-earmark-text";
  }

  function addPendingFileCard(filename, status, id, iconClass) {
    if (!attachmentPreviews) return;
    const card = el("div", "attachment-card");
    card.id = `attach-${id}`;

    const iconWrap = el("div", "attachment-card-icon");
    const icon = el("i", iconClass || "bi bi-paperclip");
    icon.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(icon);

    const body = el("div", "attachment-card-body");
    const nameSpan = el("span", "attachment-card-name", filename);
    const statusSpan = el("span", "attachment-card-status", status);
    const progressWrap = el("div", "attachment-card-progress");
    const progressBar = el("div", "attachment-card-progress-bar indeterminate");
    progressWrap.appendChild(progressBar);
    body.append(nameSpan, statusSpan, progressWrap);

    const removeBtn = el("button", "attachment-card-remove", "×");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", `Remove ${filename}`);
    removeBtn.addEventListener("click", () => {
      state.pendingFiles = state.pendingFiles.filter((f) => f._id !== id);
      card.remove();
      if (!attachmentPreviews.children.length) attachmentPreviews.classList.remove("visible");
    });

    card.append(iconWrap, body, removeBtn);
    attachmentPreviews.appendChild(card);
    attachmentPreviews.classList.add("visible");
  }

  function updatePendingFileCard(id, status, done) {
    const card = document.getElementById(`attach-${id}`);
    if (!card) return;
    const statusSpan = card.querySelector(".attachment-card-status");
    const progressBar = card.querySelector(".attachment-card-progress-bar");
    if (statusSpan) {
      statusSpan.textContent = status;
      statusSpan.className = "attachment-card-status" + (done === true ? " success" : done === false ? " error" : "");
    }
    if (progressBar) {
      progressBar.classList.remove("indeterminate");
      if (done === true) progressBar.classList.add("done");
      else if (done === false) progressBar.classList.add("failed");
    }
  }

  async function handleFilesChosen(files) {
    for (const file of files) {
      const id = Date.now() + Math.random().toString(36).slice(2);
      const icon = "bi " + fileIcon(file);
      addPendingFileCard(file.name, "Processing…", id, icon);
      try {
        const result = await TruthPulseAPI.uploadFile(file);
        const item = Array.isArray(result.results) ? result.results[0] : result;
        if (!item || !item.success) {
          const error = new Error(item?.message || "Upload failed.");
          error.code = item?.code;
          throw error;
        }
        state.pendingFiles.push({ _id: id, type: item.type, filename: item.filename, extracted: item.extracted });
        updatePendingFileCard(id, "Ready ✓", true);
      } catch (err) {
        if (err.code === "GROQ_QUOTA_EXCEEDED") {
          state.videoEnabled = false;
          applyVideoButton();
        }
        updatePendingFileCard(id, err.message || "Failed", false);
      }
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    if (state.sending) return;
    if (!state.currentId) {
      showError("Create a chat first using New Chat. Your question will be sent after it is saved.");
      return;
    }
    const message = input.value.trim();
    if (!message) return;

    const fileContext = state.pendingFiles.map(({ type, filename, extracted }) => ({ type, filename, extracted }));

    appendMessage("user", message, fileContext);
    input.value = "";
    clearPendingFiles();
    setSending(true);
    showTyping();

    let aiBubble = null;
    let thinkContent = null;
    let markdownDiv = null;
    let accumulated = "";
    let thinkAccumulated = "";

    function initAIBubble() {
      document.getElementById("typingRow")?.remove();
      const row = el("div", "message-row ai");
      aiBubble = el("div", "message-bubble");

      // Collapsible think block (hidden until first think token)
      const thinkWrap = el("div", "think-block");
      thinkWrap.hidden = true;
      const thinkToggle = el("button", "think-toggle");
      thinkToggle.type = "button";
      thinkToggle.innerHTML = '<i class="bi bi-lightbulb" aria-hidden="true"></i> Thinking <i class="bi bi-chevron-down think-chevron" aria-hidden="true"></i>';
      thinkContent = el("div", "think-content");
      thinkToggle.addEventListener("click", () => {
        const open = thinkWrap.classList.toggle("open");
        thinkToggle.querySelector(".think-chevron").className = `bi ${open ? "bi-chevron-up" : "bi-chevron-down"} think-chevron`;
      });
      thinkWrap.append(thinkToggle, thinkContent);

      markdownDiv = el("div", "markdown-body");
      aiBubble.append(thinkWrap, markdownDiv);
      row.appendChild(aiBubble);
      messagesEl.appendChild(row);
      scrollBottom();
    }

    try {
      const result = await TruthPulseAPI.chat(
        { message, conversationId: state.currentId, fileContext },
        {
          onThink(token) {
            if (!aiBubble) initAIBubble();
            const thinkWrap = aiBubble.querySelector(".think-block");
            if (thinkWrap) thinkWrap.hidden = false;
            thinkAccumulated += token;
            if (thinkContent) thinkContent.textContent = thinkAccumulated;
            scrollBottom();
          },
          onToken(token) {
            if (!aiBubble) initAIBubble();
            accumulated += token;
            if (typeof marked !== "undefined") {
              markdownDiv.innerHTML = marked.parse(accumulated, { breaks: true, gfm: true });
              markdownDiv.querySelectorAll("a").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
            } else {
              markdownDiv.textContent = accumulated;
            }
            scrollBottom();
          }
        }
      );
      if (!aiBubble) {
        document.getElementById("typingRow")?.remove();
        showError("The AI returned an empty response.");
        return;
      }
      if (badge) {
        badge.title = "AI responses are generated by Ollama.";
        badge.replaceChildren(el("i", "bi bi-stars me-1"), document.createTextNode("AI connected"));
      }
      await refreshConversations();
    } catch (error) {
      document.getElementById("typingRow")?.remove();
      if (error.status === 401) requireLogin();
      else {
        showError(error.message || "The AI service could not answer. Please try again.");
      }
    } finally {
      setSending(false);
      input.focus();
    }
  }

  form.addEventListener("submit", handleSend);
  newChatBtn?.addEventListener("click", createConversation);
  logoutBtn?.addEventListener("click", handleLogout);
  toggleSidebarBtn?.addEventListener("click", () => sidebar?.classList.toggle("open"));

  uploadImageBtn?.addEventListener("click", () => imageFileInput?.click());
  uploadVideoBtn?.addEventListener("click", () => videoFileInput?.click());
  uploadDocBtn?.addEventListener("click", () => docFileInput?.click());

  imageFileInput?.addEventListener("change", () => { if (imageFileInput.files.length) handleFilesChosen(Array.from(imageFileInput.files)); imageFileInput.value = ""; });
  videoFileInput?.addEventListener("change", () => { if (videoFileInput.files.length) handleFilesChosen(Array.from(videoFileInput.files)); videoFileInput.value = ""; });
  docFileInput?.addEventListener("change", () => { if (docFileInput.files.length) handleFilesChosen(Array.from(docFileInput.files)); docFileInput.value = ""; });

  if (badge) {
    badge.title = "Chat requests use Ollama through the authenticated backend.";
    badge.replaceChildren(el("i", "bi bi-stars me-1"), document.createTextNode("AI connected"));
  }

  (async () => {
    try {
      const status = await TruthPulseAPI.status().catch(() => null);
      if (status && status.videoEnabled === false) {
        state.videoEnabled = false;
        applyVideoButton();
      }
      await refreshConversations();
      if (state.conversations.length) await openConversation(state.conversations[0].id);
      else showStartPage();
    } catch (error) {
      if (error.status === 401) requireLogin();
      else {
        showStartPage();
        showError(error.message || "Could not connect to the backend. Please try again later.");
      }
    }
  })();
})();
