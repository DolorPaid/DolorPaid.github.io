// Серверная часть
const API_URL = 'https://dolorpaid-github-io.onrender.com';

async function GetLinks() {
    try {
        const response = await fetch(`${API_URL}/api/GetLinks`);
        const data = await response.json();
        return data.links
    } catch (error) {
        console.error('Ошибка при запросе к API:', error);
    }
}


// Клиентская часть
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
        setTimeout(() => {
            hello_world.style.opacity = 0
            setTimeout(() => {
                hello_world.remove()
                StartMain()
            }, 500);
        }, 1000);
    }, 500);
}


async function StartMain() {
    const cont = document.querySelector('#container')

    try {
        const Cells = await GetLinks()

        Cells.forEach(cellData => {
            const cell = document.createElement('cell')
            cell.classList.add('cell')
            cell.addEventListener('click', () => window.open(cellData.url, "_blank"))
            const Title = document.createElement('h2')
            Title.textContent = cellData.title
            const Desc = document.createElement('desc')
            Desc.textContent = cellData.description

            cell.append(Title, Desc)
            cont.append(cell)
        })

        cont.style.display = 'flex'
        setTimeout(() => {
            cont.style.opacity = 1
        }, 10);
    } catch (error) {
        console.error('Ошибка загрузки ссылок: ', error)
        cont.innerHTML = 'Не удалось загрузить ссылки'
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    StartScreen()
})