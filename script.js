const API_URL = 'httpshttps://dolorpaid-github-io.onrender.com';

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

// Вызовите функцию при загрузке страницы
getData();
