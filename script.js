const API_URL = 'https://dolorpaid-github-io.onrender.com'

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Select chat
function selectChat(element, status) {
    const name = element.querySelector('.chat-name').textContent
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });

    element.classList.add('active');

    document.getElementById('currentChatName').textContent = name;
    document.getElementById('currentAvatar').textContent = name.split(' ').map(n => n[0]).join('').substring(0, 2);

    const statusText = status === 'online' ? '● в сети' :
        status === 'offline' ? '● не в сети' :
            status;
    document.getElementById('currentStatus').textContent = statusText;

    const messagesArea = document.getElementById('messagesArea');
    messagesArea.innerHTML = `<div class="date-separator"> <span> Сегодня </span> </div>`;

    setTimeout(() => {
        document.getElementById('typing').remove();
        addMessage('incoming', `Привет! Это чат с ${name}`, getCurrentTime());
    }, 2000);

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

function closeChat() {
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active')
    });

    document.getElementById('currentChatName').textContent = ''
    document.getElementById('currentAvatar').textContent = ''
    document.getElementById('currentStatus').textContent = ''

    const messagesArea = document.getElementById('messagesArea')
    messagesArea.innerHTML = ``
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (text) {
        addMessage('outgoing', text, getCurrentTime());
        input.value = '';
        scrollToBottom();
    }
}

function addMessage(type, text, time) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
                <div class="message-bubble">${escapeHtml(text)}</div>
                <span class="message-time">${time}</span>
            `;
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

function showTyping() {
    const messagesArea = document.getElementById('messagesArea');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typing';
    typingDiv.innerHTML = `
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            `;
    messagesArea.appendChild(typingDiv);
    scrollToBottom();
}

function removeTyping() {
    const typing = document.getElementById('typing');
    if (typing) typing.remove();
}

function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0');
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea')
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');

    if (window.innerWidth <= 768 &&
        sidebar.classList.contains('open') &&
        !sidebar.contains(event.target) &&
        !menuToggle.contains(event.target)) {
        sidebar.classList.remove('open');
    }
});

scrollToBottom();


document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeChat()
});



async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}/api/check-session`, {
            credentials: 'include'
        });
        const data = await res.json();


        if (!data.authenticated) return window.location.href = './auth.html'
        currentUser = data.user;
        document.querySelector('.user-info').querySelector('h3').textContent = currentUser.nickname;
        document.querySelector('.avatar').textContent = currentUser.nickname[0].toUpperCase();

        // loadMessages();
    } catch (e) {
        window.location.href = './auth.html';
    }
}

checkAuth()

async function logout() {
    await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
    });
    window.location.href = './auth.html';
}
