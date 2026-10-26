/* ============================================================
   CHAT PAGE LOGIC
   ============================================================
   Uses: config.js, utils.js, mockApi.js
   Loaded only by chat.html.
   ============================================================ */

(function initChatPage() {
  // ---------- 1. DOM elements ----------
  const messageForm      = document.getElementById("messageForm");
  const messageInput     = document.getElementById("messageInput");
  const sendBtn          = document.getElementById("sendBtn");
  const chatMessages     = document.getElementById("chatMessages");
  const chatTitle        = document.getElementById("chatTitle");
  const newChatBtn       = document.getElementById("newChatBtn");
  const conversationList = document.getElementById("conversationList");
  const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
  const sidebar          = document.getElementById("sidebar");

  // Safety: if the page is not the chat page, stop.
  if (!messageForm || !chatMessages) return;

  // ---------- 2. State (in-memory only) ----------
  const state = {
    currentConversationId: null,
    isSending: false,
    mockConversations: [],
  };

  // ---------- 3. Rendering helpers ----------
  function hideEmptyState() {
    const empty = document.getElementById("emptyState");
    if (empty) empty.remove();
  }

  function appendUserMessage(text) {
    const row = createElement("div", "message-row user");
    const bubble = createElement("div", "message-bubble", text);
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    scrollToBottom();
  }

  function appendAiMessage(text, isMock = false) {
    const row = createElement("div", "message-row ai");
    const bubble = createElement("div", "message-bubble");

    if (isMock) {
      bubble.appendChild(createElement("div", "mock-label", "Test data"));
    }
    bubble.appendChild(document.createTextNode(text));

    row.appendChild(bubble);
    chatMessages.appendChild(row);
    scrollToBottom();
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

  // ---------- 4. Empty state (built safely, no innerHTML) ----------
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

  // ---------- 5. Send logic ----------
  async function handleSend(event) {
    event.preventDefault();
    if (state.isSending) return;

    const text = messageInput.value.trim();
    if (!text) return;

    if (!state.currentConversationId) {
      startNewConversation(text);
    }

    hideEmptyState();
    appendUserMessage(text);

    messageInput.value = "";
    setSendingState(true);
    showTypingIndicator();

    try {
      if (CONFIG.USE_MOCK_API) {
        const response = await mockSendMessage(text);
        removeTypingIndicator();
        appendAiMessage(response.text, response.isMock);
      } else {
        removeTypingIndicator();
        appendAiMessage(
          "Real API integration is not wired up yet. " +
            "Please enable mock mode until js/api.js exists.",
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
    sendBtn.textContent = isSending ? "Sending…" : "Send";
  }

  // ---------- 6. Conversation management (mock) ----------
  function startNewConversation(firstMessage = null) {
    state.currentConversationId = generateMockId();

    chatMessages.innerHTML = ""; // ← clears messages, not user content

    const title = firstMessage
      ? firstMessage.slice(0, 40) + (firstMessage.length > 40 ? "…" : "")
      : "New Conversation";

    state.mockConversations.unshift({
      id: state.currentConversationId,
      title,
    });

    renderConversationList();
    chatTitle.textContent = "New Conversation";

    const existingEmpty = document.getElementById("emptyState");
    if (existingEmpty) existingEmpty.remove();
  }

  function renderConversationList() {
    conversationList.innerHTML = ""; // ← clears list, no user content

    if (state.mockConversations.length === 0) {
      conversationList.appendChild(
        createElement("li", "conversation-empty", "No conversations yet.")
      );
      return;
    }

    state.mockConversations.forEach((conv) => {
      const li = createElement("li", "conversation-item", conv.title);
      if (conv.id === state.currentConversationId) {
        li.classList.add("active");
      }
      li.addEventListener("click", () => {
        state.currentConversationId = conv.id;
        chatTitle.textContent = conv.title;
        renderConversationList();
      });
      conversationList.appendChild(li);
    });
  }

  // ---------- 7. New chat reset ----------
  function handleNewChat() {
    state.currentConversationId = null;

    // Clear the messages pane
    while (chatMessages.firstChild) {
      chatMessages.removeChild(chatMessages.firstChild);
    }

    // Rebuild empty state safely
    chatMessages.appendChild(buildEmptyState());

    chatTitle.textContent = "New Conversation";
    messageInput.focus();
    renderConversationList();
  }

  // ---------- 8. Event wiring ----------
  messageForm.addEventListener("submit", handleSend);
  newChatBtn.addEventListener("click", handleNewChat);

  if (toggleSidebarBtn && sidebar) {
    toggleSidebarBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  messageInput.focus();
})();