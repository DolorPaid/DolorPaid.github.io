const API_URL = 'https://dolorpaid-github-io.onrender.com';
const WS_URL = 'wss://dolorpaid-github-io.onrender.com';

let currentUser = null;
let selectedChat = null;
let conversations = [];
let allUsers = [];
let ws = null;
let reconnectInterval = null;
let userStatuses = new Map();

// ========== UI Функции ==========

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function closeChat() {
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById('currentChatName').textContent = '';
    document.getElementById('currentAvatar').textContent = '';
    document.getElementById('currentStatus').textContent = '';
    document.getElementById('messagesArea').innerHTML = '';
    selectedChat = null;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text || !selectedChat) return;

    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'message',
            receiver_id: selectedChat.id,
            content: text
        }));
        
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
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== HTTP API ==========

async function apiGet(endpoint) {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            credentials: 'include'
        });
        if (res.status === 401) {
            window.location.href = './auth.html';
            return null;
        }
        return res.json();
    } catch (e) {
        console.error('API GET error:', e);
        return null;
    }
}

async function apiPost(endpoint, body) {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });
        if (res.status === 401) {
            window.location.href = './auth.html';
            return null;
        }
        return res.json();
    } catch (e) {
        console.error('API POST error:', e);
        return null;
    }
}

// ========== WEBSOCKET ==========

function connectWebSocket() {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
        return;
    }
    
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
        
        ws.send(JSON.stringify({
            type: 'auth',
            userId: currentUser?.id,
            nickname: currentUser?.nickname
        }));
        
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        
        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    };
    
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        handleWebSocketMessage(msg);
    };
    
    ws.onclose = () => {
        ws = null;
        
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                connectWebSocket();
            }, 3000);
        }
    };
    
    ws.onerror = (err) => {
        console.error('WS error:', err);
    };
}

function handleWebSocketMessage(msg) {
    switch (msg.type) {
        case 'message:receive':
            if (selectedChat?.id === msg.sender_id) {
                addMessage('incoming', msg.content, formatTime(msg.created_at));
            }
            loadConversations();
            break;
            
        case 'message:sent':
            break;
            
        case 'status':
            userStatuses.set(msg.user_id, {
                status: msg.status,
                last_seen: new Date().toISOString()
            });
            updateChatListStatuses();
            
            if (selectedChat?.id === msg.user_id) {
                updateChatHeaderStatus(msg.user_id);
            }
            break;
            
        case 'online:list':
            msg.users?.forEach(u => {
                userStatuses.set(u.id, { status: 'online', nickname: u.nickname });
            });
            renderChatList();
            break;
            
        case 'typing':
            if (selectedChat?.id === msg.sender_id && msg.is_typing) {
                showTyping();
            } else {
                removeTyping();
            }
            break;
            
        case 'error':
            console.error('WS server error:', msg.message);
            break;
    }
}

// ========== Чаты и сообщения ==========

async function loadConversations() {
    const data = await apiGet('/api/conversations');
    if (!data) return;
    
    conversations = data.conversations || [];
    renderChatList();
}

function renderChatList() {
    const list = document.querySelector('.chat-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (conversations.length === 0) {
        list.innerHTML = '<div style="padding: 20px; color: #94a3b8; text-align: center;">Нет сообщений</div>';
        return;
    }
    
    conversations.forEach(conv => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.dataset.userId = conv.user_id;
        
        if (selectedChat?.id === conv.user_id) {
            div.classList.add('active');
        }
        
        const status = userStatuses.get(conv.user_id);
        const isOnline = status?.status === 'online';
        
        div.addEventListener('click', () => selectChatByData(conv));
        
        // Используем nickname вместо username
        const displayName = conv.nickname || 'Unknown';
        const avatarLetter = displayName[0].toUpperCase();
        
        div.innerHTML = `
            <div class="chat-avatar">${avatarLetter}</div>
            <div class="chat-details">
                <div class="chat-header">
                    <span class="chat-name">${escapeHtml(displayName)}</span>
                    <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
                    <span class="chat-meta">${formatTime(conv.last_time)}</span>
                </div>
                <div class="last-message">
                    ${escapeHtml(conv.last_message?.substring(0, 30) || '')}${(conv.last_message?.length || 0) > 30 ? '...' : ''}
                    ${conv.unread > 0 ? `<span class="unread-badge">${conv.unread}</span>` : ''}
                </div>
            </div>
        `;
        
        list.appendChild(div);
    });
}

function updateChatListStatuses() {
    document.querySelectorAll('.chat-item').forEach(item => {
        const userId = parseInt(item.dataset.userId);
        const status = userStatuses.get(userId);
        
        const dot = item.querySelector('.status-dot');
        if (dot && status) {
            dot.className = `status-dot ${status.status === 'online' ? 'online' : 'offline'}`;
        }
    });
}

function updateChatHeaderStatus(userId) {
    const status = userStatuses.get(userId);
    const statusEl = document.getElementById('currentStatus');
    
    if (statusEl && status) {
        const isOnline = status.status === 'online';
        statusEl.innerHTML = `
            <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
            ${isOnline ? 'в сети' : 'не в сети'}
        `;
    }
}

function selectChatByData(conv) {
    selectedChat = {
        id: conv.user_id,
        nickname: conv.nickname
    };
    
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    
    const chatElement = document.querySelector(`.chat-item[data-user-id="${conv.user_id}"]`);
    if (chatElement) chatElement.classList.add('active');
    
    const displayName = conv.nickname || 'Unknown';
    
    document.getElementById('currentChatName').textContent = displayName;
    document.getElementById('currentAvatar').textContent = displayName[0].toUpperCase();
    
    updateChatHeaderStatus(conv.user_id);
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
    
    loadMessages(conv.user_id);
}

async function loadMessages(userId) {
    const data = await apiGet(`/api/messages/${userId}`);
    if (!data) return;
    
    const area = document.getElementById('messagesArea');
    area.innerHTML = '<div class="date-separator"><span>Сегодня</span></div>';
    
    data.messages?.forEach(msg => {
        const isOwn = msg.sender_id === currentUser?.id;
        addMessage(isOwn ? 'outgoing' : 'incoming', msg.content, formatTime(msg.created_at));
    });
    
    scrollToBottom();
}

function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ========== Поиск пользователей по nickname ==========

async function loadAllUsers() {
    const data = await apiGet('/api/users');
    if (!data) return;
    
    allUsers = data.users || [];
    data.users?.forEach(u => {
        userStatuses.set(u.id, { status: u.status, nickname: u.nickname });
    });
}

function filterUsers(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
        renderChatList();
        return;
    }
    
    // Ищем по nickname
    const filtered = allUsers.filter(u =>
        u.nickname?.toLowerCase().includes(term) &&
        u.id !== currentUser?.id
    );
    
    renderUserSearchResults(filtered);
}

function renderUserSearchResults(users) {
    const list = document.querySelector('.chat-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (users.length === 0) {
        list.innerHTML = '<div style="padding: 20px; color: #94a3b8; text-align: center;">Пользователи не найдены</div>';
        return;
    }
    
    const header = document.createElement('div');
    header.style.cssText = 'padding: 12px 20px; color: #64748b; font-size: 12px; text-transform: uppercase;';
    header.textContent = 'Найденные пользователи';
    list.appendChild(header);
    
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        
        const isOnline = user.status === 'online';
        const avatarLetter = user.nickname?.[0]?.toUpperCase() || '?';
        
        div.addEventListener('click', () => startNewChat(user));
        
        div.innerHTML = `
            <div class="chat-avatar">${avatarLetter}</div>
            <div class="chat-details">
                <div class="chat-header">
                    <span class="chat-name">${escapeHtml(user.nickname)}</span>
                    <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
                </div>
                <div class="last-message" style="color: #6366f1;">
                    Нажмите чтобы написать
                </div>
            </div>
        `;
        
        list.appendChild(div);
    });
}

function startNewChat(user) {
    selectedChat = {
        id: user.id,
        nickname: user.nickname
    };
    
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) searchInput.value = '';
    
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById('currentChatName').textContent = user.nickname;
    document.getElementById('currentAvatar').textContent = user.nickname?.[0]?.toUpperCase() || '?';
    updateChatHeaderStatus(user.id);
    
    document.getElementById('messagesArea').innerHTML = '<div class="date-separator"><span>Сегодня</span></div>';
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
    
    if (!conversations.find(c => c.user_id === user.id)) {
        conversations.unshift({
            user_id: user.id,
            nickname: user.nickname,
            last_message: 'Начните общение...',
            last_time: new Date().toISOString(),
            unread: 0
        });
        renderChatList();
    }
}

// ========== Авторизация ==========

async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}/api/check-session`, {
            credentials: 'include'
        });
        const data = await res.json();

        if (!data?.authenticated) {
            window.location.href = './auth.html';
            return;
        }
        
        currentUser = data.user;
        
        const nameEl = document.querySelector('.user-info h3');
        const avatarEl = document.querySelector('.sidebar .avatar');
        
        const displayName = currentUser.nickname || 'User';
        
        if (nameEl) nameEl.textContent = displayName;
        if (avatarEl) avatarEl.textContent = displayName[0].toUpperCase();
        
        await loadAllUsers();
        await loadConversations();
        connectWebSocket();
        
    } catch (e) {
        console.error('Auth error:', e);
        window.location.href = './auth.html';
    }
}

async function logout() {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
    }
    
    await apiPost('/api/logout', {});
    window.location.href = './auth.html';
}

// ========== Инициализация ==========

document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');

    if (window.innerWidth <= 768 &&
        sidebar?.classList.contains('open') &&
        !sidebar.contains(event.target) &&
        !menuToggle?.contains(event.target)) {
        sidebar.classList.remove('open');
    }
});

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeChat();
});

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterUsers(e.target.value));
    }
    
    checkAuth();
});