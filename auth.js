
const API_URL = 'https://dolorpaid-github-io.onrender.com'

async function login(username, password) {
    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            mode: 'cors',
            body: JSON.stringify({ username, password })
        });
        
        return res.json();
    } catch (e) {
        console.error('Login error:', e);
        return { ok: false, error: e.message };
    }
}

async function checkSession() {
    try {
        const response = await fetch(`${API_URL}/api/check-session`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.authenticated) window.location.href = './';
    } catch (err) {
        console.warn('Не удалось проверить сессию');
    }
}

checkSession()

const form = document.getElementById('loginForm');
const nameInput = document.getElementById('name');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const submitBtn = document.getElementById('submitBtn');
const errorMessage = document.getElementById('errorMessage');
const successCheckmark = document.getElementById('successCheckmark');
const loginHeader = document.getElementById('loginHeader');

const emailError = document.getElementById('emailError');
const emailSuccess = document.getElementById('emailSuccess');
const passwordError = document.getElementById('passwordError');
const passwordSuccess = document.getElementById('passwordSuccess');

togglePasswordBtn?.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
    passwordInput.focus();
});

// Очистка ошибок при вводе
nameInput?.addEventListener('input', function () {
    if (this.value.length > 0) {
        clearError(this);
    }
});

passwordInput?.addEventListener('input', function () {
    if (this.value.length > 0) {
        clearError(this);
    }
});

function clearError(input) {
    input.classList.remove('error');
    emailError.classList.remove('show');
    passwordError.classList.remove('show');
}

form?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = nameInput.value.trim();
    const password = passwordInput.value;

    if (!name || !password) {
        errorMessage.textContent = 'Алеша, заполни ВСЕ поля';
        errorMessage.classList.add('show');
        return;
    }

    errorMessage.classList.remove('show');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    const checkAuth = await login(name, password);

    if (checkAuth.ok) showSuccessState();
    else showErrorState('Точно из наших? Херня данные');
});

function showSuccessState() {
    form.style.display = 'none';
    loginHeader.style.display = 'none';
    errorMessage.classList.remove('show');

    successCheckmark.style.display = 'flex';

    setTimeout(() => {
        window.location.href = './';
    }, 500);
}

function showErrorState(message) {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;

    errorMessage.textContent = message;
    errorMessage.classList.add('show');

    passwordInput.value = '';
    passwordInput.classList.remove('success');
    passwordSuccess.classList.remove('show');
    passwordInput.focus();
}

document.querySelectorAll('.social-btn')?.forEach(btn => {
    btn.addEventListener('click', function () {
        const provider = this.getAttribute('title');
        alert(`Вход через ${provider} (в разработке)`);
    });
});

document.querySelector('.forgot-password')?.addEventListener('click', function (e) {
    e.preventDefault();
    alert('Функция восстановления пароля в разработке');
});

document.querySelector('.register-link')?.addEventListener('click', function (e) {
    e.preventDefault();
    alert('Регистрация будет доступна позже');
});

window?.addEventListener('load', () => {
    nameInput?.focus();
    checkSession();
});

// Enter в поле пароля
passwordInput?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        form.dispatchEvent(new Event('submit'));
    }
});


const isTelegram = new URLSearchParams(location.search).has('tg')

if(isTelegram){
    document.querySelector('.brand-name').textContent = 'Telegram Nexus'
}


console.log('%c👀 Че ты тут ищешь?', 'font-size: 25px; color: red;');
console.log('%cПосторонним просмотр запрещен — закрой вкладку.', 'font-size: 14px;');
console.log('%cНо раз уж ты залез... Ctrl + W — панель разработчика закрывается.', 'font-size: 10px;');