const API_URL = 'https://dolorpaid-github-io.onrender.com';

async function getData() {
    try {
        const response = await fetch(`${API_URL}/api/data`);
        const data = await response.json();
        console.log(data);
        // ... обновите интерфейс
    } catch (error) {
        console.error('Ошибка при запросе к API:', error);
    }
}

const body = document.querySelector('body')

function StartScreen() {
    const hello_world = document.createElement('div')
    hello_world.style = `
                display: flex;
                opacity: 0;
                height: 90vh;
                font-size: 75px;
                justify-content: center;
                align-items: center;
    `

    hello_world.innerHTML = 'Hello, World!'

    body.prepend(hello_world)

    setTimeout(() => {
        hello_world.style.opacity = 1
    }, 500);
}

document.addEventListener('DOMContentLoaded', async () => {
    StartScreen()

    setTimeout(() => {
        getData();
    }, 3000);
})

