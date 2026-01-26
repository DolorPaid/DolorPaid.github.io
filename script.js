const API_URL = 'https://dolorpaid-github-io.onrender.com';

const root = document.documentElement;

async function GetLinks() {
    try {
        const response = await fetch(`${API_URL}/api/GetLinks`);
        const data = await response.json();
        return data.links
    } catch (error) {
        console.error('Ошибка при запросе к API:', error);
    }
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const body = document.querySelector('body')

function StartScreen() {
    const hello_world = document.createElement('div')
    hello_world.style = `
    display: flex;
    opacity: 0;
    height: 90vh;
    font-size: var(--startscreentextsize);
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


function checkAttribute(el, attribute) {
    return el.hasAttribute(attribute)
}

async function StartMain() {
    const cont = document.querySelector('#container')

    try {
        const Cells = await GetLinks()

        Cells.forEach(cellData => {
            const title = cellData.title
            const url = cellData.url
            const description = cellData.description

            const cell = document.createElement('cell')
            cell.classList.add('cell')
            const ElementTitle = document.createElement('daunakusok')
            ElementTitle.className = 'title'
            ElementTitle.textContent = title
            const ElementDesc = document.createElement('desc')
            ElementDesc.textContent = description

            if (isMobileDevice()) {
                cell.setAttribute('url', url)
                cell.addEventListener('click', () => {
                    if (cell.hasAttribute('ready'))
                        ToLink(cell.getAttribute('url'))
                    else
                        cell.setAttribute('ready', 'true')
                })
            }
            else cell.addEventListener('click', () => ToLink(`${url}`))

            cell.append(ElementTitle, ElementDesc)
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
    if (isMobileDevice()) {
        root.style.setProperty('--startscreentextsize', '50px')
        document.querySelector('#container').style.justifyContent = 'center'
    }
    StartScreen()

    document.addEventListener('click', (event) => {
        const element = event.target
        document.querySelectorAll('cell').forEach(cell => {
            if (!cell.contains(element) && element != cell) cell.removeAttribute('ready')
        })
    });

})

async function ToLink(url) {
    try {
        const response = await fetch(`${API_URL}/api/ClickLink`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url })
        });

        const result = await response.json();

        if (response.ok) console.log(`Успех: ${result.message}. Кол-во кликов: ${result.newCount}`);
        else console.error('Ошибка сервера:', result.message);
    } catch (error) {
        console.error('Ошибка сети:', error);
    }
    // Создаем невидимую ссылку
    const link = document.createElement('a');
    link.href = url;
    link.rel = 'noopener';
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

}
