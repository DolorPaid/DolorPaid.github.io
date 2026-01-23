// Серверная часть
const API_URL = 'https://dolorpaid-github-io.onrender.com';

async function GetLinks() {
    try {
        const response = await fetch(`${API_URL}/api/GetLinks`);
        const data = await response.json();
        return data
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


function StartMain() {
    const cont = document.querySelector('#container')

    console.log(GetLinks())
    return
    const Cells = GetLinks()

    Cells.forEach(Cell => {
        const cell = document.createElement('cell')
        cell.classList.add('cell')
        cell.setAttribute('onclick', `GoTo("${Cell[2]}")`)
        const Title = document.createElement('h2')
        Title.innerHTML = Cell[0]
        const Desc = document.createElement('desc')
        Desc.innerHTML = Cell[1]

        cell.append(Title, Desc)
        cont.append(cell)
    })

    cont.style.display = 'flex'
    setTimeout(() => {
        cont.style.opacity = 1
    }, 10);
}

document.addEventListener('DOMContentLoaded', async () => {
    StartScreen()
})


function GoTo(link){
    window.open(link, '_blank')
}