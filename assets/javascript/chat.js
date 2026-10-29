/* ============================================================
   CHAT PAGE LOGIC — Stage 2 (file upload UI, mock mode)
   ============================================================
   Uses: config.js, utils.js, mockApi.js
   Loaded only by chat.html.
   ============================================================ */

(function initChatPage() {
  // ---------- 1. DOM elements ----------
  const messageForm       = document.getElementById("messageForm");
  const messageInput      = document.getElementById("messageInput");
  const sendBtn           = document.getElementById("sendBtn");
  const chatMessages      = document.getElementById("chatMessages");
  const chatTitle         = document.getElementById("chatTitle");
  const newChatBtn        = document.getElementById("newChatBtn");
  const conversationList  = document.getElementById("conversationList");
  const toggleSidebarBtn  = document.getElementById("toggleSidebarBtn");
  const sidebar           = document.getElementById("sidebar");
  const attachBtn         = document.getElementById("attachBtn");
  const fileInput         = document.getElementById("fileInput");
  const attachmentPreviews = document.getElementById("attachmentPreviews");

  if (!messageForm || !chatMessages) return;

  // ---------- 2. File rules (change here when backend limits known) ----------
  const FILE_RULES = {
    maxSizeBytes: 25 * 1024 * 1024, // 25 MB per file
    maxFiles: 3,
    acceptedTypes: [
      "image/png", "image/jpeg", "image/webp", "image/gif",
      "video/mp4", "video/webm", "video/quicktime",
      "application/pdf"
    ],
    acceptedExtensions: ["png","jpg","jpeg","webp","gif","mp4","webm","mov","pdf"],
  };

  // ---------- 3. Persistent browser history ----------
  // Prototype only: localStorage is NOT encrypted. Do not enter sensitive data.
  const STORAGE_KEY = "truthpulse_conversations_v1";

  function loadSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.conversations)) {
        return { currentConversationId: null, conversations: [] };
      }
      const conversations = saved.conversations
        .filter((conv) => conv && typeof conv.id === "string" &&
          typeof conv.title === "string" && Array.isArray(conv.messages))
        .map((conv) => ({
          id: conv.id,
          title: conv.title.slice(0, 60),
          messages: conv.messages
            .filter((msg) => msg && ["user", "assistant"].includes(msg.role) &&
              typeof msg.text === "string")
            .map((msg) => msg.role === "user"
              ? { role: "user", text: msg.text, fileNames: Array.isArray(msg.fileNames)
                  ? msg.fileNames.filter((name) => typeof name === "string").slice(0, 3)
                  : [] }
              : { role: "assistant", text: msg.text, isMock: Boolean(msg.isMock) })
        }));
      const savedId = saved.currentConversationId;
      return {
        currentConversationId: conversations.some((conv) => conv.id === savedId) ? savedId : null,
        conversations
      };
    } catch (error) {
      console.warn("Could not restore TruthPulse conversation history:", error);
      return { currentConversationId: null, conversations: [] };
    }
  }

  const savedState = loadSavedState();
  const state = {
    currentConversationId: savedState.currentConversationId,
    isSending: false,
    mockConversations: savedState.conversations,
    attachedFiles: [], // actual File objects are temporary and never stored
  };

  function saveConversationState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentConversationId: state.currentConversationId,
        conversations: state.mockConversations
      }));
    } catch (error) {
      console.error("Could not save TruthPulse conversation history:", error);
      appendError("Conversation history could not be saved in this browser. Storage may be full or unavailable.");
    }
  }

  // ---------- 4. Rendering helpers ----------
  function hideEmptyState() {
    const empty = document.getElementById("emptyState");
    if (empty) empty.remove();
  }

  function appendUserMessage(text, fileNames = [], saveToHistory = true) {
    const row = createElement("div", "message-row user");
    const bubble = createElement("div", "message-bubble");

    if (text) {
      bubble.appendChild(document.createTextNode(text));
    }

    if (fileNames.length > 0) {
      const list = createElement("div", "message-files");
      fileNames.forEach((name) => {
        const item = createElement("div", "message-file-item");
        const icon = document.createElement("i");
        icon.className = "bi bi-paperclip";
        icon.setAttribute("aria-hidden", "true");
        item.appendChild(icon);
        item.appendChild(document.createTextNode(name));
        list.appendChild(item);
      });
      bubble.appendChild(list);
    }

    row.appendChild(bubble);
    chatMessages.appendChild(row);
    if (saveToHistory) saveMessageToCurrentConversation({ role: "user", text, fileNames });
    scrollToBottom();
  }

  function appendAiMessage(text, isMock = false, saveToHistory = true) {
    const row = createElement("div", "message-row ai");
    const bubble = createElement("div", "message-bubble");

    if (isMock) {
      bubble.appendChild(createElement("div", "mock-label", "Test data"));
    }
    bubble.appendChild(document.createTextNode(text));

    row.appendChild(bubble);
    chatMessages.appendChild(row);
    if (saveToHistory) saveMessageToCurrentConversation({ role: "assistant", text, isMock });
    scrollToBottom();
  }

  function saveMessageToCurrentConversation(message) {
    const conversation = state.mockConversations.find(
      (item) => item.id === state.currentConversationId
    );
    if (conversation) {
      conversation.messages.push(message);
      saveConversationState();
    }
  }

  function appendError(message) {
    const row = createElement("div", "message-row ai");
    const box = createElement("div", "message-error", message);
    row.appendChild(box);
    chatMessages.appendChild(row);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const row = createElement("div", "message-row ai");
    row.id = "typingRow";

    const indicator = createElement("div", "typing-indicator");
    indicator.appendChild(createElement("span"));
    indicator.appendChild(createElement("span"));
    indicator.appendChild(createElement("span"));

    row.appendChild(indicator);
    chatMessages.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const row = document.getElementById("typingRow");
    if (row) row.remove();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function buildEmptyState() {
    const wrap = createElement("div", "empty-state");
    wrap.id = "emptyState";

    const iconWrap = createElement("div", "empty-icon-wrap");
    const icon = document.createElement("i");
    icon.className = "bi bi-search empty-icon-i";
    icon.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(icon);
    wrap.appendChild(iconWrap);

    wrap.appendChild(createElement("h3", "", "Let's verify something"));
    wrap.appendChild(
      createElement(
        "p",
        "",
        "Type a message below, or attach an image, video, or file to get started."
      )
    );

    return wrap;
  }

  // ---------- 5. File handling ----------
  function openFilePicker() {
    fileInput.click();
  }

  function handleFilesSelected(event) {
    const selected = Array.from(event.target.files || []);
    fileInput.value = ""; // allow re-selecting same file later

    const remaining = FILE_RULES.maxFiles - state.attachedFiles.length;
    if (remaining <= 0) {
      showAttachmentError(`You can attach at most ${FILE_RULES.maxFiles} files.`);
      return;
    }

    const toAdd = selected.slice(0, remaining);
    const skippedCount = selected.length - toAdd.length;

    const errors = [];

    toAdd.forEach((file) => {
      if (!isAcceptedFile(file)) {
        errors.push(`"${file.name}" is not a supported file type.`);
        return;
      }
      if (file.size > FILE_RULES.maxSizeBytes) {
        errors.push(
          `"${file.name}" is ${formatBytes(file.size)} — exceeds ${formatBytes(FILE_RULES.maxSizeBytes)}.`
        );
        return;
      }

      state.attachedFiles.push({
        id: "f-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        file,
        objectUrl: URL.createObjectURL(file),
      });
    });

    if (skippedCount > 0 && errors.length === 0) {
      errors.push(`Only ${FILE_RULES.maxFiles} files can be attached at a time.`);
    }

    renderAttachmentPreviews();

    if (errors.length > 0) {
      showAttachmentError(errors.join(" "));
    }
  }

  function isAcceptedFile(file) {
    if (FILE_RULES.acceptedTypes.includes(file.type)) return true;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    return FILE_RULES.acceptedExtensions.includes(ext);
  }

  function renderAttachmentPreviews() {
    // Clear (no user content yet — safe)
    while (attachmentPreviews.firstChild) {
      attachmentPreviews.removeChild(attachmentPreviews.firstChild);
    }

    if (state.attachedFiles.length === 0) {
      attachmentPreviews.hidden = true;
      return;
    }
    attachmentPreviews.hidden = false;

    state.attachedFiles.forEach((entry) => {
      const card = createElement("div", "attachment-card");

      // Thumbnail / icon
      const thumb = createElement("div", "attachment-thumb");
      if (entry.file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = entry.objectUrl;
        img.alt = entry.file.name;
        thumb.appendChild(img);
      } else if (entry.file.type.startsWith("video/")) {
        const vid = document.createElement("video");
        vid.src = entry.objectUrl;
        vid.muted = true;
        vid.playsInline = true;
        thumb.appendChild(vid);
        const badge = createElement("span", "attachment-badge", "VIDEO");
        thumb.appendChild(badge);
      } else {
        const icon = document.createElement("i");
        icon.className = "bi bi-file-earmark-text";
        icon.setAttribute("aria-hidden", "true");
        thumb.appendChild(icon);
      }

      // Info
      const info = createElement("div", "attachment-info");
      info.appendChild(createElement("div", "attachment-name", entry.file.name));
      info.appendChild(
        createElement(
          "div",
          "attachment-meta",
          `${entry.file.type || "file"} · ${formatBytes(entry.file.size)}`
        )
      );

      // Remove button
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "attachment-remove";
      remove.setAttribute("aria-label", "Remove attachment");
      const x = document.createElement("i");
      x.className = "bi bi-x-lg";
      x.setAttribute("aria-hidden", "true");
      remove.appendChild(x);
      remove.addEventListener("click", () => removeAttachment(entry.id));

      card.appendChild(thumb);
      card.appendChild(info);
      card.appendChild(remove);
      attachmentPreviews.appendChild(card);
    });
  }

  function removeAttachment(id) {
    const entry = state.attachedFiles.find((e) => e.id === id);
    if (entry && entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
    state.attachedFiles = state.attachedFiles.filter((e) => e.id !== id);
    renderAttachmentPreviews();
    clearAttachmentError();
  }

  function clearAttachments() {
    state.attachedFiles.forEach((e) => {
      if (e.objectUrl) URL.revokeObjectURL(e.objectUrl);
    });
    state.attachedFiles = [];
    renderAttachmentPreviews();
  }

  function showAttachmentError(message) {
    clearAttachmentError();
    const box = createElement("div", "attachment-error", message);
    box.id = "attachmentError";
    attachmentPreviews.hidden = false;
    attachmentPreviews.insertAdjacentElement("afterbegin", box);
  }

  function clearAttachmentError() {
    const existing = document.getElementById("attachmentError");
    if (existing) existing.remove();
  }

  // ---------- 6. Send logic ----------
  async function handleSend(event) {
    event.preventDefault();
    if (state.isSending) return;

    const text = messageInput.value.trim();
    const fileNames = state.attachedFiles.map((e) => e.file.name);

    if (!text && fileNames.length === 0) return;

    if (!state.currentConversationId) {
      startNewConversation(text || fileNames[0] || null);
    }

    hideEmptyState();
    appendUserMessage(text, fileNames);

    messageInput.value = "";
    clearAttachments();
    clearAttachmentError();

    setSendingState(true);
    showTypingIndicator();

    try {
      if (CONFIG.USE_MOCK_API) {
        const response = await mockSendMessage(text || "(file attached)");
        removeTypingIndicator();
        appendAiMessage(response.text, response.isMock);
      } else {
        removeTypingIndicator();
        appendAiMessage(
          "The API client is prepared, but the analysis endpoint and response format " +
            "must be confirmed with the backend team before live analysis can be enabled.",
          true
        );
      }
    } catch (err) {
      removeTypingIndicator();
      appendError("Something went wrong while sending. Please try again.");
      console.error("Send error:", err);
    } finally {
      setSendingState(false);
      messageInput.focus();
    }
  }

  function setSendingState(isSending) {
    state.isSending = isSending;
    sendBtn.disabled = isSending;
    messageInput.disabled = isSending;
    attachBtn.disabled = isSending;
    sendBtn.innerHTML = isSending
      ? '<i class="bi bi-hourglass-split me-1" aria-hidden="true"></i>Sending…'
      : '<i class="bi bi-send-fill me-1" aria-hidden="true"></i>Send';
  }

  // ---------- 7. Conversation management ----------
  function startNewConversation(firstMessage = null) {
    state.currentConversationId = generateMockId();

    while (chatMessages.firstChild) {
      chatMessages.removeChild(chatMessages.firstChild);
    }

    const title = firstMessage
      ? firstMessage.slice(0, 40) + (firstMessage.length > 40 ? "…" : "")
      : "New Conversation";

    state.mockConversations.unshift({
      id: state.currentConversationId,
      title,
      messages: [],
    });

    renderConversationList();
    chatTitle.textContent = title;
    saveConversationState();

    const existingEmpty = document.getElementById("emptyState");
    if (existingEmpty) existingEmpty.remove();
  }

  function openConversation(id) {
    const conversation = state.mockConversations.find((item) => item.id === id);
    if (!conversation) return;

    state.currentConversationId = id;
    chatTitle.textContent = conversation.title;
    while (chatMessages.firstChild) chatMessages.removeChild(chatMessages.firstChild);

    if (!conversation.messages.length) {
      chatMessages.appendChild(buildEmptyState());
    } else {
      conversation.messages.forEach((message) => {
        if (message.role === "user") {
          appendUserMessage(message.text, message.fileNames || [], false);
        } else {
          appendAiMessage(message.text, Boolean(message.isMock), false);
        }
      });
    }
    renderConversationList();
    saveConversationState();
    if (sidebar) sidebar.classList.remove("open");
  }

  function renameConversation(id) {
    const conversation = state.mockConversations.find((item) => item.id === id);
    if (!conversation) return;

    const enteredTitle = window.prompt("Rename conversation:", conversation.title);
    if (enteredTitle === null) return;
    const title = enteredTitle.trim();
    if (!title) {
      window.alert("Please enter a title before saving.");
      return;
    }

    conversation.title = title.slice(0, 60);
    if (state.currentConversationId === id) chatTitle.textContent = conversation.title;
    saveConversationState();
    renderConversationList();
  }

  function deleteConversation(id) {
    const conversation = state.mockConversations.find((item) => item.id === id);
    if (!conversation) return;
    const confirmed = window.confirm(`Delete "${conversation.title}"? This cannot be undone.`);
    if (!confirmed) return;

    state.mockConversations = state.mockConversations.filter((item) => item.id !== id);
    if (state.currentConversationId === id) {
      state.currentConversationId = null;
      clearAttachments();
      clearAttachmentError();
      chatMessages.replaceChildren(buildEmptyState());
      chatTitle.textContent = "New Conversation";
    }
    saveConversationState();
    renderConversationList();
  }

  function renderConversationList() {
    conversationList.replaceChildren();

    if (state.mockConversations.length === 0) {
      conversationList.appendChild(
        createElement("li", "conversation-empty", "No conversations yet.")
      );
      return;
    }

    state.mockConversations.forEach((conv) => {
      const li = createElement("li", "conversation-item");
      if (conv.id === state.currentConversationId) li.classList.add("active");

      const titleBtn = createElement("button", "conversation-title-btn", conv.title);
      titleBtn.type = "button";
      titleBtn.title = "Open conversation";
      titleBtn.addEventListener("click", () => openConversation(conv.id));

      const renameBtn = createElement("button", "conversation-action-btn");
      renameBtn.type = "button";
      renameBtn.title = "Rename conversation";
      renameBtn.setAttribute("aria-label", `Rename ${conv.title}`);
      const renameIcon = document.createElement("i");
      renameIcon.className = "bi bi-pencil";
      renameIcon.setAttribute("aria-hidden", "true");
      renameBtn.appendChild(renameIcon);
      renameBtn.addEventListener("click", () => renameConversation(conv.id));

      const deleteBtn = createElement("button", "conversation-action-btn delete");
      deleteBtn.type = "button";
      deleteBtn.title = "Delete conversation";
      deleteBtn.setAttribute("aria-label", `Delete ${conv.title}`);
      const deleteIcon = document.createElement("i");
      deleteIcon.className = "bi bi-trash3";
      deleteIcon.setAttribute("aria-hidden", "true");
      deleteBtn.appendChild(deleteIcon);
      deleteBtn.addEventListener("click", () => deleteConversation(conv.id));

      li.append(titleBtn, renameBtn, deleteBtn);
      conversationList.appendChild(li);
    });
  }

  // ---------- 8. New chat ----------
  function handleNewChat() {
    state.currentConversationId = null;
    saveConversationState();
    clearAttachments();
    clearAttachmentError();

    while (chatMessages.firstChild) {
      chatMessages.removeChild(chatMessages.firstChild);
    }
    chatMessages.appendChild(buildEmptyState());

    chatTitle.textContent = "New Conversation";
    messageInput.focus();
    renderConversationList();
  }

  // ---------- 9. Event wiring ----------
  messageForm.addEventListener("submit", handleSend);
  newChatBtn.addEventListener("click", handleNewChat);
  attachBtn.addEventListener("click", openFilePicker);
  fileInput.addEventListener("change", handleFilesSelected);

  if (toggleSidebarBtn && sidebar) {
    toggleSidebarBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  renderConversationList();
  if (state.currentConversationId) {
    openConversation(state.currentConversationId);
  } else {
    chatTitle.textContent = "New Conversation";
  }
  messageInput.focus();
})();