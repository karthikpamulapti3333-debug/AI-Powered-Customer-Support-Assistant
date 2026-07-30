document.addEventListener('DOMContentLoaded', function() {
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const sessionIdInput = document.getElementById('sessionId');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const quickBtns = document.querySelectorAll('.quick-q');

  if (!chatMessages || !chatInput || !sendBtn) return;

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendMessage(sender, text, timestamp = 'Just now') {
    const isUser = sender === 'USER';
    const wrapper = document.createElement('div');
    wrapper.className = `message-bubble ${isUser ? 'message-user text-end' : 'message-ai'} mb-3`;

    const parsedContent = isUser ? text : (window.marked ? marked.parse(text) : text);

    wrapper.innerHTML = `
      <div class="message-content d-inline-block p-3 rounded-3 ${isUser ? 'bg-primary text-white text-start' : 'bg-dark-subtle border border-secondary text-white'} style="max-width: 85%;">
        ${parsedContent}
      </div>
      <div class="text-muted mt-1 small" style="font-size: 0.75rem;">${timestamp}</div>
    `;

    chatMessages.appendChild(wrapper);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'typingIndicator';
    indicator.className = 'message-bubble message-ai mb-3';
    indicator.innerHTML = `
      <div class="message-content d-inline-block p-3 rounded-3 bg-dark-subtle border border-secondary text-muted">
        <span class="spinner-grow spinner-grow-sm text-info me-1" role="status"></span>
        <span class="spinner-grow spinner-grow-sm text-info me-1" role="status" style="animation-delay: 0.2s;"></span>
        <span class="spinner-grow spinner-grow-sm text-info me-1" role="status" style="animation-delay: 0.4s;"></span>
        AI is typing response...
      </div>
    `;
    chatMessages.appendChild(indicator);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
  }

  async function sendMessage(text) {
    const msgText = text || chatInput.value.trim();
    if (!msgText) return;

    appendMessage('USER', msgText);
    chatInput.value = '';
    showTypingIndicator();

    try {
      const response = await fetch('/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          sessionId: sessionIdInput ? sessionIdInput.value : ''
        })
      });

      removeTypingIndicator();

      if (response.ok) {
        const data = await response.json();
        if (data.sessionId && sessionIdInput) {
          sessionIdInput.value = data.sessionId;
        }

        const aiText = data.aiResponse ? data.aiResponse.content : "No response generated.";
        appendMessage('AI', aiText);

        // Auto trigger ticket modal if low confidence or negative sentiment
        if (data.suggestTicket) {
          setTimeout(() => {
            const ticketModalEl = document.getElementById('ticketModal');
            if (ticketModalEl && window.bootstrap) {
              const modal = new bootstrap.Modal(ticketModalEl);
              modal.show();
            }
          }, 1200);
        }
      } else {
        appendMessage('AI', '⚠️ Server error encountered. Please try again or submit a support ticket.');
      }
    } catch (err) {
      removeTypingIndicator();
      console.error(err);
      appendMessage('AI', '⚠️ Connection error. Please check your network connection.');
    }
  }

  sendBtn.addEventListener('click', () => sendMessage());
  chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
  });

  quickBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      sendMessage(this.innerText);
    });
  });

  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', async function() {
      if (!sessionIdInput || !sessionIdInput.value) return;
      try {
        await fetch(`/chat/history?session_id=${sessionIdInput.value}`, { method: 'DELETE' });
        chatMessages.innerHTML = `
          <div class="message-bubble message-ai mb-3">
            <div class="message-content p-3 rounded-3 bg-dark-subtle border border-secondary text-white">
              Conversation cleared! How can I assist you now?
            </div>
          </div>
        `;
      } catch (err) {
        console.error(err);
      }
    });
  }
});
