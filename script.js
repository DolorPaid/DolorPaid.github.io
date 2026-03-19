const API_URL = 'https://dolorpaid-github-io.onrender.com';
const WS_URL = 'wss://dolorpaid-github-io.onrender.com';

let currentUser = null;
let selectedChat = null;
let conversations = [];
let allUsers = [];
let ws = null;
let reconnectInterval = null;
let userStatuses = new Map();


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

function headerActionsType(type, options) {
    const headerActionElem = document.querySelector('.header-actions')

    if (!headerActionElem) return

    switch (type) {
        case 0:
            headerActionElem.innerHTML =
                `
                <button id="clear-msgs-btn" class="icon-btn" onclick="clearChatHistory()" title="Очистить историю сообщений">🗑️</button>
                <button class="icon-btn" onclick="logout()" title="Выйти из аккаунта">🚪</button>
                `
            break;
        case 1:
            headerActionElem.innerHTML =
                `
                <button id="kick-user-btn" class="icon-btn" onclick="kickUser()" title="Выкинуть пользователя">🚫</button>
                <button id="clear-msgs-btn" class="icon-btn" onclick="clearChatHistory()" title="Очистить историю сообщений">🗑️</button>
                <button class="icon-btn" onclick="logout()" title="Выйти из аккаунта">🚪</button>
                `
            break;
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

function clearMsgBtnVisible(visible) {
    document.getElementById(`clear-msgs-btn`).style.display = visible ? 'block' : 'none'
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
    clearMsgBtnVisible(false)
    if (document.querySelector('#kick-user-btn')) document.querySelector('#kick-user-btn').remove()
}

async function clearChatHistory() {
    if (selectedChat) {
        if (selectedChat.isGroup) {
            if (!confirm(`[Доступ Администратора] Очистить историю группы? Все сообщения будут удалены безвозвратно.`)) return

            const res = await fetch(`${API_URL}/api/group/messages`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await res.json();

            if (data?.ok) {
                alert('История группы успешно очищена');
                loadGroupMessages();
            }
            else alert('Ошибка при удалении истории');
        } else {
            try {
                if (!confirm(`Очистить историю чата? Все сообщения будут удалены безвозвратно.`)) {
                    return;
                }

                const res = await fetch(`${API_URL}/api/conversations/${selectedChat.id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                const data = await res.json();

                if (data?.ok) {
                    conversations = conversations.filter(c => c.user_id !== parseInt(selectedChat.id));

                    closeChat();
                    renderCombinedList();

                    alert('История чата успешно очищена');
                } else throw err;
            } catch (err) {
                alert('Ошибка при удалении чата');
                console.error('Ошибка при удалении чата: ', err)
            }
        }
    } else {
        alert('Для очистки истории сообщений откройте чат.')
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text || !selectedChat) return;

    if (ws?.readyState === WebSocket.OPEN) {
        if (selectedChat.isGroup) {
            ws.send(JSON.stringify({
                type: 'group:message',
                content: text,
                sender_id: currentUser.id,
                biba: 123
            }));

            addGroupMessage(true, {
                sender_id: currentUser.id,
                sender_nickname: currentUser.nickname,
                sender_is_admin: currentUser.is_admin,
                content: text,
                created_at: getCurrentTime()
            });
        } else {
            ws.send(JSON.stringify({
                type: 'message',
                receiver_id: selectedChat.id,
                content: text
            }));

            addMessage('outgoing', text, getCurrentTime());
        }


        input.value = '';
        scrollToBottom();
        loadConversations()
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

function addGroupMessage(isOwn, msg) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'outgoing' : 'incoming'}`;

    const adminBadge = msg.sender_is_admin ? '<span class="admin-badge" title="Администратор">⭐</span>' : '';

    messageDiv.innerHTML = `
        <div class="message-sender">${escapeHtml(msg.sender_nickname)} ${adminBadge}</div>
        <div class="message-bubble">${escapeHtml(msg.content)}</div>
        <span class="message-time">${msg.created_at}</span>
    `;
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}


function connectWebSocket() {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
        return;
    }

    console.log('Connecting WebSocket...');
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('WS connected');

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
        console.log('WS received:', msg.type);

        handleWebSocketMessage(msg);
    };

    ws.onclose = () => {
        console.log('WS disconnected');
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
        case 'auth:success':
            console.log('WS auth success');
            break;

        case 'auth:kicked':
            alert('Администратор выкинул вас из сети');
            checkAuth();
            break;

        case 'message:receive':
            if (selectedChat?.id === msg.sender_id) {
                addMessage('incoming', msg.content, formatTime(msg.created_at));
            }
            loadConversations();
            break;

        case 'message:sent':
            break;

        case 'group:message:receive':
            if (selectedChat?.isGroup) {
                addGroupMessage(false, {
                    sender_id: msg.sender_id,
                    sender_nickname: msg.sender_nickname,
                    sender_is_admin: msg.sender_is_admin,
                    content: msg.content,
                    created_at: formatTime(msg.created_at)
                });
            }
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
            renderCombinedList();
            break;

        case 'conversation:deleted':
            conversations = conversations.filter(c => c.user_id !== msg.user_id);
            if (selectedChat?.id === msg.user_id) {
                closeChat();
                alert('Собеседник удалил чат');
            }
            renderCombinedList();
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

async function loadConversations() {
    const data = await apiGet('/api/conversations');
    if (!data) return;

    conversations = data.conversations || [];
    renderCombinedList();
}


function renderCombinedList() {
    const list = document.querySelector('.chat-list');
    if (!list) return;

    list.innerHTML = '';

    const groupsHeader = document.createElement('div');
    groupsHeader.style.cssText = 'padding: 12px 20px; color: #64748b; font-size: 12px; text-transform: uppercase;';
    groupsHeader.textContent = 'Группы';
    list.appendChild(groupsHeader);
    const div = createGroupElement();
    list.appendChild(div);


    const conversationIds = new Set(conversations.map(c => c.user_id));

    if (conversations.length > 0) {
        const dialogHeader = document.createElement('div');
        dialogHeader.style.cssText = 'padding: 12px 20px; color: #64748b; font-size: 12px; text-transform: uppercase; border-top: 1px solid var(--bg-hover);';
        dialogHeader.textContent = 'Диалоги';
        list.appendChild(dialogHeader);

        conversations.forEach(conv => {
            const div = createConversationElement(conv);
            list.appendChild(div);
        });
    }

    const otherUsers = allUsers.filter(u => !conversationIds.has(u.id));

    if (otherUsers.length > 0) {
        const allHeader = document.createElement('div');
        allHeader.style.cssText = 'padding: 12px 20px; color: #64748b; font-size: 12px; text-transform: uppercase; border-top: 1px solid var(--bg-hover);';
        allHeader.textContent = 'Все пользователи';
        list.appendChild(allHeader);

        otherUsers.forEach(user => {
            const div = createUserElement(user);
            list.appendChild(div);
        });
    }
}

function createGroupElement() {
    const div = document.createElement('div');
    div.className = 'chat-item';

    const avatarLetter = 'AOA';

    div.addEventListener('click', () => selectGroup('aoa', 'Age Of Autists', avatarLetter));

    div.innerHTML = `
        <div class="chat-avatar group-avatar">${avatarLetter}</div>
        <div class="chat-details">
            <div class="chat-header">
                <span class="chat-name">Age Of Autists</span>
            </div>
            <div class="last-message" style="color: #6366f1;">
                Нажмите чтобы перейти
            </div>
        </div>
    `;

    return div;
}

function createConversationElement(conv) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.dataset.userId = conv.user_id;

    if (selectedChat?.id === conv.user_id) {
        div.classList.add('active');
    }

    const status = userStatuses.get(conv.user_id);
    const isOnline = status?.status === 'online';
    const isAdmin = conv.is_admin === true ? "⭐" : ''
    const avatarLetter = conv.nickname?.[0]?.toUpperCase() || '?';

    div.addEventListener('click', (e) => {
        selectUser(conv.user_id, `${conv.nickname}${isAdmin}`, true);
    });

    div.innerHTML = `
        <div class="chat-avatar ${isAdmin ? 'admin-avatar' : ''}">${avatarLetter}</div>
        <div class="chat-details" style="flex: 1; min-width: 0;">
            <div class="chat-header">
                <span class="chat-name">${escapeHtml(conv.nickname)}${isAdmin}</span>
                <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
                <span class="chat-meta">${formatTime(conv.last_time)}</span>
            </div>
            <div class="last-message">
                ${escapeHtml(conv.last_message?.substring(0, 30) || '')}${(conv.last_message?.length || 0) > 30 ? '...' : ''}
                ${conv.unread > 0 ? `<span class="unread-badge">${conv.unread}</span>` : ''}
            </div>
        </div>
    `;

    return div;
}

function createUserElement(user) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.dataset.userId = user.id;

    const isOnline = user.status === 'online';
    const isAdmin = user.is_admin === true ? "⭐" : ''
    const avatarLetter = user.nickname?.[0]?.toUpperCase() || '?';


    div.addEventListener('click', () => selectUser(user.id, `${user.nickname}${isAdmin}`, false));

    div.innerHTML = `
        <div class="chat-avatar ${isAdmin ? 'admin-avatar' : ''}">${avatarLetter}</div>
        <div class="chat-details">
            <div class="chat-header">
                <span class="chat-name">${escapeHtml(user.nickname)}${isAdmin}</span>
                <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="last-message" style="color: #6366f1;">
                Нажмите чтобы написать
            </div>
        </div>
    `;

    return div;
}

function selectUser(userId, nickname, isConversation) {
    selectedChat = {
        id: userId,
        nickname: nickname
    };

    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));

    const chatElement = document.querySelector(`.chat-item[data-user-id="${userId}"]`);
    if (document.querySelector('#kick-user-btn')) document.querySelector('#kick-user-btn').remove()

    headerActionsType(checkAdmin() ? 1 : 0)

    document.getElementById('currentChatName').textContent = `${nickname}`;
    document.getElementById('currentAvatar').textContent = nickname?.[0]?.toUpperCase() || '?';

    updateChatHeaderStatus(userId);

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }


    if (!isConversation) {
        if (!conversations.find(c => c.user_id === userId)) {
            conversations.unshift({
                user_id: userId,
                nickname: nickname,
                last_message: '',
                last_time: new Date().toISOString(),
                unread: 0
            });
        }
    }

    loadMessages(userId);
    loadConversations()
    clearMsgBtnVisible(true)

    if (chatElement) {
        chatElement.classList.add('active');
        chatElement.querySelector('.unread-badge')?.remove()
    }
}

function selectGroup(groupId, name, avatarLetter) {
    selectedChat = {
        groupId: groupId,
        name: name,
        isGroup: true
    };

    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));

    const chatElement = document.querySelector(`.chat-item`);
    if (chatElement) chatElement.classList.add('active');
    if (document.querySelector('#kick-user-btn')) document.querySelector('#kick-user-btn').remove()

    document.getElementById('currentChatName').textContent = name;
    document.getElementById('currentAvatar').textContent = avatarLetter.toUpperCase() || '?';

    updateChatHeaderStatus(false)

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }

    loadGroupMessages()
    clearMsgBtnVisible(true)
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
    if (!statusEl) return

    if (status) {
        const isOnline = status?.status === 'online';
        statusEl.innerHTML = `
            <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
            ${isOnline ? 'в сети' : 'не в сети'}
        `
    } else statusEl.innerHTML = ''
}

async function loadMessages(userId) {
    const data = await apiGet(`/api/messages/${userId}`);
    if (!data) return;

    const area = document.getElementById('messagesArea');
    area.innerHTML = '<div class="date-separator"><span>Начало чата</span></div>';

    data.messages?.forEach(msg => {
        const isOwn = msg.sender_id === currentUser?.id;
        addMessage(isOwn ? 'outgoing' : 'incoming', msg.content, formatTime(msg.created_at));
    });

    scrollToBottom();
}

async function loadGroupMessages() {
    const data = await apiGet(`/api/group/messages`)
    if (!data) return

    const area = document.getElementById('messagesArea');
    area.innerHTML = '<div class="date-separator"><span>Начало чата Аутистов</span></div>';

    data.messages?.forEach(msg => {
        const isOwn = msg.sender_id === currentUser?.id;
        addGroupMessage(isOwn, {
            sender_id: msg.sender_id,
            sender_nickname: msg.sender_nickname,
            sender_is_admin: msg.sender_is_admin,
            content: msg.content,
            created_at: formatTime(msg.created_at)
        });
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
        renderCombinedList();
        return;
    }

    const filtered = allUsers.filter(u =>
        u.nickname?.toLowerCase().includes(term) &&
        u.id !== currentUser?.id
    );

    renderSearchResults(filtered, term);
}

function renderSearchResults(users, term) {
    const list = document.querySelector('.chat-list');
    if (!list) return;

    list.innerHTML = '';

    if (users.length === 0) {
        list.innerHTML = `<div style="padding: 20px; color: #94a3b8; text-align: center;">По запросу "${escapeHtml(term)}" ничего не найдено</div>`;
        return;
    }

    const header = document.createElement('div');
    header.style.cssText = 'padding: 12px 20px; color: #64748b; font-size: 12px; text-transform: uppercase;';
    header.textContent = `Результаты поиска (${users.length})`;
    list.appendChild(header);

    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.dataset.userId = user.id;

        const isOnline = user.status === 'online';
        const isAdmin = user.is_admin === true ? "⭐" : ''
        const avatarLetter = user.nickname?.[0]?.toUpperCase() || '?';

        div.addEventListener('click', () => selectUser(user.id, `${user.nickname}${isAdmin}`, false));

        div.innerHTML = `
            <div class="chat-avatar">${avatarLetter}</div>
            <div class="chat-details">
                <div class="chat-header">
                    <span class="chat-name">${escapeHtml(user.nickname)}${isAdmin}</span>
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
        const rankEl = document.querySelector('.user-info p');
        const avatarEl = document.querySelector('.sidebar .avatar');

        const displayName = currentUser.nickname || 'User';

        if (nameEl) nameEl.textContent = displayName;
        if (rankEl && currentUser.is_admin) rankEl.textContent = `⭐`;
        if (avatarEl) {
            avatarEl.textContent = displayName[0].toUpperCase();
            if (currentUser.is_admin) avatarEl.classList.add('admin-my-avatar')
        }



        await Promise.all([loadAllUsers(), loadConversations()]);
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


async function checkAdmin() {
    try {
        const data = await apiGet(`/api/check-admin`)

        if (!data?.ok) return false
        else return true
    } catch (err) {
        console.error('Check Admin error: ', err)
    }
}

async function kickUser() {
    try {
        const data = await apiGet(`/api/user/kick/${userId}`);

        if (data.ok) alert('Пользователь был выкинут из сети')
        else alert('Пользователь не был кикнут из сети: ', data.reason)

    } catch (err) {
        console.log('Kick User Error: ', err)
    }
}

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

    // clearMsgBtnVisible(false)
    checkAuth();
});


console.warn('%c👀 Че ты тут ищешь?', 'font-size: 25px; color: red;');
console.warn('%cПосторонним просмотр запрещен — закрой вкладку.', 'font-size: 14px;');
console.warn('%cНо раз уж ты залез... Ctrl + W — панель разработчика закрывается.', 'font-size: 10px;');