const API_URL = 'https://dolorpaid-github-io.onrender.com'

let currentUser = null
let selectedChat = null
let conversations = []

// ========== UI Функции (ваши, без изменений) ==========

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open')
}

function closeChat() {
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active')
    })
    document.getElementById('currentChatName').textContent = ''
    document.getElementById('currentAvatar').textContent = ''
    document.getElementById('currentStatus').textContent = ''
    document.getElementById('messagesArea').innerHTML = ''
    selectedChat = null
}

function sendMessage() {
    const input = document.getElementById('messageInput')
    const text = input.value.trim()

    if (!text || !selectedChat) return

    // Отправляем на сервер
    apiPost('/api/messages', {
        receiver_id: selectedChat.id,
        content: text
    }).then(() => {
        // Показываем сразу (оптимистично)
        addMessage('outgoing', text, getCurrentTime())
        input.value = ''
        scrollToBottom()
        // Обновляем список диалогов
        loadConversations()
    })
}

function addMessage(type, text, time) {
    const messagesArea = document.getElementById('messagesArea')
    const messageDiv = document.createElement('div')
    messageDiv.className = `message ${type}`
    messageDiv.innerHTML = `
        <div class="message-bubble">${escapeHtml(text)}</div>
        <span class="message-time">${time}</span>
    `
    messagesArea.appendChild(messageDiv)
    scrollToBottom()
}

function showTyping() {
    const messagesArea = document.getElementById('messagesArea')
    const typingDiv = document.createElement('div')
    typingDiv.className = 'typing-indicator'
    typingDiv.id = 'typing'
    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `
    messagesArea.appendChild(typingDiv)
    scrollToBottom()
}

function removeTyping() {
    const typing = document.getElementById('typing')
    if (typing) typing.remove()
}

function getCurrentTime() {
    const now = new Date()
    return now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0')
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage()
    }
}

function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea')
    messagesArea.scrollTop = messagesArea.scrollHeight
}

function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// ========== API Функции ==========

async function apiGet(endpoint) {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            credentials: 'include'
        })
        if (res.status === 401) {
            window.location.href = './auth.html'
            return null
        }
        return res.json()
    } catch (e) {
        console.error('API GET error:', e)
        return null
    }
}

async function apiPost(endpoint, body) {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        })
        if (res.status === 401) {
            window.location.href = './auth.html'
            return null
        }
        return res.json()
    } catch (e) {
        console.error('API POST error:', e)
        return null
    }
}

// ========== Чаты и сообщения ==========

async function loadConversations() {
    const data = await apiGet('/api/conversations')
    if (!data) return
    
    conversations = data.conversations || []
    renderChatList()
}

function renderChatList() {
    const list = document.querySelector('.chat-list')
    if (!list) return
    
    list.innerHTML = ''
    
    if (conversations.length === 0) {
        list.innerHTML = '<div style="padding: 20px; color: #94a3b8; text-align: center;">Нет сообщений</div>'
        return
    }
    
    conversations.forEach(conv => {
        const div = document.createElement('div')
        div.className = 'chat-item'
        if (selectedChat?.id === conv.user_id) {
            div.classList.add('active')
        }
        
        div.onclick = () => selectChatByData(conv)
        
        div.innerHTML = `
            <div class="chat-avatar">${conv.username[0].toUpperCase()}</div>
            <div class="chat-details">
                <div class="chat-header">
                    <span class="chat-name">${escapeHtml(conv.username)}</span>
                    <span class="chat-meta">${formatTime(conv.last_time)}</span>
                </div>
                <div class="last-message">
                    ${escapeHtml(conv.last_message.substring(0, 30))}${conv.last_message.length > 30 ? '...' : ''}
                    ${conv.unread > 0 ? `<span class="unread-badge">${conv.unread}</span>` : ''}
                </div>
            </div>
        `
        
        list.appendChild(div)
    })
}

function selectChatByData(conv) {
    selectedChat = {
        id: conv.user_id,
        username: conv.username
    }
    
    // UI обновление
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'))
    event.currentTarget.classList.add('active')
    
    document.getElementById('currentChatName').textContent = conv.username
    document.getElementById('currentAvatar').textContent = conv.username[0].toUpperCase()
    document.getElementById('currentStatus').textContent = '● в сети'
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open')
    }
    
    // Загружаем сообщения
    loadMessages(conv.user_id)
}

async function loadMessages(userId) {
    const data = await apiGet(`/api/messages/${userId}`)
    if (!data) return
    
    const area = document.getElementById('messagesArea')
    area.innerHTML = '<div class="date-separator"><span>Сегодня</span></div>'
    
    data.messages?.forEach(msg => {
        const isOwn = msg.sender_id === currentUser.id
        addMessage(isOwn ? 'outgoing' : 'incoming', msg.content, formatTime(msg.created_at))
    })
    
    scrollToBottom()
}

function formatTime(isoString) {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// ========== Авторизация ==========

async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}/api/check-session`, {
            credentials: 'include'
        })
        const data = await res.json()

        if (!data?.authenticated) {
            window.location.href = './auth.html'
            return
        }
        
        currentUser = data.user
        
        // Обновляем UI профиля
        const nameEl = document.querySelector('.user-info h3')
        const avatarEl = document.querySelector('.sidebar .avatar')
        
        if (nameEl) nameEl.textContent = currentUser.username || currentUser.nickname
        if (avatarEl) avatarEl.textContent = (currentUser.username || currentUser.nickname)[0].toUpperCase()
        
        // Загружаем диалоги
        loadConversations()
        
        // Обновление каждые 5 сек
        setInterval(() => {
            loadConversations()
            if (selectedChat) {
                loadMessages(selectedChat.id)
            }
        }, 5000)
        
    } catch (e) {
        window.location.href = './auth.html'
    }
}

async function logout() {
    await apiPost('/api/logout', {})
    window.location.href = './auth.html'
}

// ========== Инициализация ==========

document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar')
    const menuToggle = document.querySelector('.menu-toggle')

    if (window.innerWidth <= 768 &&
        sidebar?.classList.contains('open') &&
        !sidebar.contains(event.target) &&
        !menuToggle?.contains(event.target)) {
        sidebar.classList.remove('open')
    }
})

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeChat()
})

// Запуск
checkAuth()