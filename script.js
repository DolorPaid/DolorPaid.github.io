const API_URL = 'https://dolorpaid-github-io.onrender.com'

let currentUser = null
let selectedChat = null
let conversations = []
let allUsers = [] // ← Добавлено: все пользователи для поиска

// ========== UI Функции ==========

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

    apiPost('/api/messages', {
        receiver_id: selectedChat.id,
        content: text
    }).then((data) => {
        if (data?.ok) {
            addMessage('outgoing', text, getCurrentTime())
            input.value = ''
            scrollToBottom()
            loadConversations()
        }
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

// ========== ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ (НОВОЕ) ==========

async function loadAllUsers() {
    const data = await apiGet('/api/users')
    if (!data) return

    allUsers = data.users || []
}

function filterUsers(searchTerm) {
    const term = searchTerm.toLowerCase().trim()

    if (!term) {
        // Если поиск пустой — показываем существующие диалоги
        renderChatList()
        return
    }

    // Фильтруем пользователей
    const filtered = allUsers.filter(u =>
        u.username.toLowerCase().includes(term) &&
        u.id !== currentUser?.id
    )

    renderUserSearchResults(filtered)
}

function renderUserSearchResults(users) {
    const list = document.querySelector('.chat-list')
    if (!list) return

    list.innerHTML = ''

    if (users.length === 0) {
        list.innerHTML = '<div style="padding: 20px; color: #94a3b8; text-align: center;">Пользователи не найдены</div>'
        return
    }

    // Заголовок "Найденные пользователи"
    const header = document.createElement('div')
    header.style.cssText = 'padding: 12px 20px; color: #64748b; font-size: 12px; text-transform: uppercase;'
    header.textContent = 'Найденные пользователи'
    list.appendChild(header)

    users.forEach(user => {
        const div = document.createElement('div')
        div.className = 'chat-item'

        div.addEventListener('click', () => startNewChat(user))

        div.innerHTML = `
            <div class="chat-avatar">${user.username[0].toUpperCase()}</div>
            <div class="chat-details">
                <div class="chat-header">
                    <span class="chat-name">${escapeHtml(user.username)}</span>
                </div>
                <div class="last-message" style="color: #6366f1;">
                    Нажмите чтобы написать
                </div>
            </div>
        `

        list.appendChild(div)
    })
}

function startNewChat(user) {
    selectedChat = {
        id: user.id,
        username: user.username
    }

    // Очищаем поиск
    const searchInput = document.querySelector('.search-box input')
    if (searchInput) searchInput.value = ''

    // Обновляем UI
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'))

    document.getElementById('currentChatName').textContent = user.username
    document.getElementById('currentAvatar').textContent = user.username[0].toUpperCase()
    document.getElementById('currentStatus').textContent = '● в сети'

    // Очищаем сообщения (новый чат пустой)
    document.getElementById('messagesArea').innerHTML = '<div class="date-separator"><span>Сегодня</span></div>'

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open')
    }

    // Добавляем в список диалогов (если ещё нет)
    if (!conversations.find(c => c.user_id === user.id)) {
        conversations.unshift({
            user_id: user.id,
            username: user.username,
            last_message: 'Начните общение...',
            last_time: new Date().toISOString(),
            unread: 0
        })
        renderChatList()
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
    const list = document.querySelector(    '.chat-list')
    if (!list) return
    
    list.innerHTML = ''
    
    if (conversations.length === 0) {
        list.innerHTML = '<div style="padding: 20px; color: #94a3b8; text-align: center;">Нет сообщений</div>'
        return
    }
    
    conversations.forEach(conv => {
        const div = document.createElement('div')
        div.className = 'chat-item'
        div.dataset.userId = conv.user_id
        
        if (selectedChat?.id === conv.user_id) {
            div.classList.add('active')
        }
        
        // Получаем статус из кэша
        const status = userStatuses.get(conv.user_id)
        const isOnline = status?.status === 'online'
        
        div.addEventListener('click', () => selectChatByData(conv))
        
        // ← ИНДИКАТОР СТАТУСА в chat-header
        div.innerHTML = `
            <div class="chat-avatar">${conv.username[0].toUpperCase()}</div>
            <div class="chat-details">
                <div class="chat-header">
                    <span class="chat-name">${escapeHtml(conv.username)}</span>
                    <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
                    <span class="chat-meta">${formatTime(conv.last_time)}</span>
                </div>
                <div class="last-message">
                    ${escapeHtml(conv.last_message?.substring(0, 30) || '')}${(conv.last_message?.length || 0) > 30 ? '...' : ''}
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
    
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'))
    
    const chatElement = document.querySelector(`.chat-item[data-user-id="${conv.user_id}"]`)
    if (chatElement) chatElement.classList.add('active')
    
    document.getElementById('currentChatName').textContent = conv.username
    document.getElementById('currentAvatar').textContent = conv.username[0].toUpperCase()
    
    // ← ИНДИКАТОР СТАТУСА в шапке чата
    const status = userStatuses.get(conv.user_id)
    const statusEl = document.getElementById('currentStatus')
    
    if (statusEl) {
        const isOnline = status?.status === 'online'
        statusEl.innerHTML = `
            <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
            ${isOnline ? 'в сети' : 'не в сети'}
        `
    }
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open')
    }
    
    loadMessages(conv.user_id)
}

async function loadMessages(userId) {
    const data = await apiGet(`/api/messages/${userId}`)
    if (!data) return

    const area = document.getElementById('messagesArea')
    area.innerHTML = '<div class="date-separator"><span>Сегодня</span></div>'

    data.messages?.forEach(msg => {
        const isOwn = msg.sender_id === currentUser?.id
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

        const nameEl = document.querySelector('.user-info h3')
        const avatarEl = document.querySelector('.sidebar .avatar')

        const displayName = currentUser.username || currentUser.nickname || 'User'

        if (nameEl) nameEl.textContent = displayName
        if (avatarEl) avatarEl.textContent = displayName[0].toUpperCase()

        // Загружаем всё
        loadConversations()
        loadAllUsers() // ← Загружаем пользователей для поиска

    } catch (e) {
        console.error('Auth error:', e)
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

// Поиск пользователей
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-box input')
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterUsers(e.target.value))
    }

    checkAuth()

    setInterval(() => {
        if (!currentUser) return
        loadConversations()
        if (selectedChat) {
            loadMessages(selectedChat.id)
        }
    }, 5000)
})


// ========== НОВОЕ: Online/Offline статус ==========

const ONLINE_THRESHOLD = 2 * 60 * 1000 // 2 минуты

let userStatuses = new Map() // id -> {status, last_seen}

// Отправляем "я жив" каждые 30 секунд
function startHeartbeat() {
    setInterval(() => {
        if (!currentUser) return

        // Просто делаем любой запрос — сервер обновит last_seen через middleware
        apiGet('/api/check-session')
    }, 30000) // 30 секунд
}

// Загрузить статусы всех пользователей
async function loadUserStatuses() {
    const data = await apiGet('/api/users/status')
    if (!data) return

    userStatuses.clear()
    data.users?.forEach(u => {
        userStatuses.set(u.id, u)
    })

    // Обновляем отображение в списке чатов
    updateChatListStatuses()
}

// Обновить статусы в списке чатов
function updateChatListStatuses() {
    // Обновляем индикаторы в списке
    document.querySelectorAll('.chat-item').forEach(item => {
        const userId = parseInt(item.dataset.userId)
        const status = userStatuses.get(userId)
        
        if (!status) return
        
        const dot = item.querySelector('.status-dot')
        if (dot) {
            dot.className = `status-dot ${status.status === 'online' ? 'online' : 'offline'}`
        }
    })
    
    // Обновляем индикатор в открытом чате
    if (selectedChat) {
        const status = userStatuses.get(selectedChat.id)
        const statusEl = document.getElementById('currentStatus')
        
        if (statusEl && status) {
            const isOnline = status.status === 'online'
            statusEl.innerHTML = `
                <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
                ${isOnline ? 'в сети' : 'не в сети'}
            `
        }
    }
}

// При закрытии вкладки — отправляем offline
function setupOfflineOnUnload() {
    window.addEventListener('beforeunload', () => {
        // Отправляем синхронный запрос (fetch не работает в beforeunload)
        navigator.sendBeacon?.(`${API_URL}/api/offline`, '')
    })
}

// ========== ИЗМЕНИТЬ: selectChatByData ==========

function selectChatByData(conv) {
    selectedChat = {
        id: conv.user_id,
        username: conv.username
    }

    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'))

    const chatElement = document.querySelector(`.chat-item[data-user-id="${conv.user_id}"]`)
    if (chatElement) chatElement.classList.add('active')

    document.getElementById('currentChatName').textContent = conv.username
    document.getElementById('currentAvatar').textContent = conv.username[0].toUpperCase()

    // Устанавливаем статус из кэша
    const status = userStatuses.get(conv.user_id)
    const statusEl = document.getElementById('currentStatus')
    if (statusEl) {
        if (status?.status === 'online') {
            statusEl.textContent = '● в сети'
            statusEl.style.color = '#10b981'
        } else {
            statusEl.textContent = '● не в сети'
            statusEl.style.color = '#64748b'
        }
    }

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open')
    }

    loadMessages(conv.user_id)
}

// ========== ИЗМЕНИТЬ: инициализацию ==========

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-box input')
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterUsers(e.target.value))
    }

    checkAuth()
    setupOfflineOnUnload() // ← Добавить

    // Обновление данных
    setInterval(() => {
        if (!currentUser) return
        loadConversations()
        loadUserStatuses() // ← Добавить
        if (selectedChat) {
            loadMessages(selectedChat.id)
        }
    }, 5000)

    startHeartbeat() // ← Добавить
})