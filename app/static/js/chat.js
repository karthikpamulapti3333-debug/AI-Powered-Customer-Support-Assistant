document.addEventListener('DOMContentLoaded', function () {
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const sessionIdInput = document.getElementById('sessionId');

  if (!chatMessages || !chatInput || !sendBtn) return;

  function appendMessage(sender, text, timestamp = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message-bubble ${sender === 'USER' ? 'message-user' : 'message-ai'}`;
    
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let formattedText = typeof marked !== 'undefined' ? marked.parse(text) : text.replace(/\n/g, '<br>');

    msgDiv.innerHTML = `
      <div class="message-content">${formattedText}</div>
      <div class="text-end text-muted mt-1" style="font-size: 0.7rem; opacity: 0.7;">${timeStr}</div>
    `;

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'message-bubble message-ai typing-indicator';
    typingDiv.innerHTML = `<span></span><span></span><span></span>`;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTypingIndicator() {
    const typingDiv = document.getElementById('typingIndicator');
    if (typingDiv) typingDiv.remove();
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    const sessionId = sessionIdInput ? sessionIdInput.value : '';
    appendMessage('USER', text);
    chatInput.value = '';
    showTypingIndicator();

    try {
      const res = await fetch('/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId })
      });

      const data = await res.json();
      hideTypingIndicator();

      if (data.aiResponse) {
        appendMessage('AI', data.aiResponse.content, data.aiResponse.timestamp);
      }

      if (data.suggestTicket) {
        const ticketDiv = document.createElement('div');
        ticketDiv.className = 'my-2 text-center';
        ticketDiv.innerHTML = `
          <a href="/tickets/new" class="btn btn-sm btn-outline-info rounded-pill">
            <i class="bi bi-ticket-perforated"></i> Create Support Ticket
          </a>
        `;
        chatMessages.appendChild(ticketDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    } catch (err) {
      hideTypingIndicator();
      appendMessage('AI', '⚠️ Connection error. Please try again or create a support ticket.');
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});
