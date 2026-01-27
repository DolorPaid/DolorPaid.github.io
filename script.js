const API_URL = 'https://dolorpaid-github-io.onrender.com'

const root = document.documentElement

const cont = document.querySelector('#container')

async function GetLinks() {
    try {
        const response = await fetch(`${API_URL}/api/GetLinks`)
        const data = await response.json()
        return data.links
    } catch (error) {
        console.error('Ошибка при запросе к API:', error)
    }
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const body = document.querySelector('body')

function StartScreen() {
    const hello_world = document.createElement('HelloWorld')
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%&*='
    const EndText = 'Hello, World!'

    body.prepend(hello_world)
    hello_world.style.opacity = 1

    let iter = 0

    const interval = setInterval(() => {
        hello_world.textContent = EndText
            .split('')
            .map((char, index) => {
                if (index < iter) return char
                return chars[Math.floor(Math.random() * chars.length)]
            })
            .join('')

        iter += 1 / 3

        if (iter >= EndText.length) {
            clearInterval(interval)
            hello_world.textContent = EndText
            hello_world.className = 'end'

            setTimeout(() => {
                hello_world.style.setProperty('--console_char', '1')
                hello_world.style.setProperty('--console_anim', 'translateX(-55%)')
                setTimeout(() => {
                    hello_world.style.opacity = 0
                    setTimeout(() => {
                        hello_world.remove()
                        ToMainPage()
                    }, 500);
                }, 450);
            }, 200);
        }
    }, 15);
}

function ContainerToggle(type) {
    cont.style.display = type == 0 ? 'none' : 'flex'
    setTimeout(() => cont.style.opacity = type, 10)
}


// async function ToChoosePage() {
//     ContainerToggle(0)
//     const Pages = [
//         { title: 'Игровая', func: () => ToMainPage()() },
//         { title: 'Информация', func: () => ToMainPage() }
//     ]
//     const pageContainer = document.createElement('div')
//     pageContainer.id = 'page-container'

//     Pages.forEach(page => {
//         const newPage = document.createElement('div')
//         newPage.className = 'page-btn'
//         newPage.textContent = page.title
//         newPage.addEventListener('click', page.func)

//         pageContainer.appendChild(newPage)
//     })

//     body.prepend(pageContainer)
// }

async function ToGamePage() {
    ContainerToggle(0)
    ContainerToggle(1)
}


async function ToMainPage() {
    ContainerToggle(0)
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
                cell.addEventListener('click', function (c) {
                    c.stopPropagation()
                    if (cell.hasAttribute('ready'))
                        ToLink(`${url}`)
                    else
                        cell.setAttribute('ready', '')
                })
            }
            else cell.addEventListener('click', () => ToLink(`${url}`))

            cell.append(ElementTitle, ElementDesc)
            cont.append(cell)
        })


        ContainerToggle(1)
    } catch (error) {
        console.error('Ошибка загрузки ссылок: ', error)
        cont.innerHTML = 'Не удалось загрузить ссылки'
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    ContainerToggle(0)
    if (isMobileDevice()) {
        root.style.setProperty('--startscreentextsize', '50px')
        cont.style.justifyContent = 'center'

        document.addEventListener('touchstart', (event) => {
            const element = event.target
            document.querySelectorAll('cell').forEach(cell => {
                if (!cell.contains(element) && element != cell) cell.removeAttribute('ready')
            })
        })
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
        })

        const result = await response.json()

        if (response.ok) console.log(`Успех: ${result.message}. Кол-во кликов: ${result.newCount}`);
        else console.error('Ошибка сервера:', result.message);
    } catch (error) {
        console.error('Ошибка сети:', error)
    }

    window.location.href = url;
}