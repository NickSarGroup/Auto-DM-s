const puppeteer = require('puppeteer');
const fs = require('fs');

const sendMessage = async (username, message) => {
  const cookiesFilePath = './cookies.json';

  if (!fs.existsSync(cookiesFilePath)) {
    console.error('❌ Файл cookies.json не найден.');
    process.exit(1);
  }

  const cookies = JSON.parse(fs.readFileSync(cookiesFilePath));

  const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--remote-debugging-port=9222'],
});

    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });

  const [page] = await browser.pages();

  await page.setCookie(...cookies);
  await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

  // Ждём загрузки страницы и подтверждаем вход
  try {
    await page.waitForSelector('svg[aria-label="Главная страница"]', { timeout: 10000 });
    console.log('✅ Авторизация успешна.');
  } catch (err) {
    console.error('❌ Не удалось авторизоваться. Проверь cookies.');
    await browser.close();
    return;
  }

  // Навигация в профиль получателя
  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });

  // Кнопка "Написать"
  try {
    await page.waitForSelector('button', { timeout: 10000 });
    const buttons = await page.$$('button');
    for (let btn of buttons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.toLowerCase().includes('написать') || text.toLowerCase().includes('message')) {
        await btn.click();
        break;
      }
    }
  } catch (err) {
    console.error('❌ Не удалось найти кнопку "Написать".');
    await browser.close();
    return;
  }

  // Ожидаем появления поля ввода
  try {
    await page.waitForSelector('textarea', { timeout: 10000 });
    await page.type('textarea', message);
    await page.keyboard.press('Enter');
    console.log('✅ Сообщение отправлено!');
  } catch (err) {
    console.error('❌ Ошибка при вводе сообщения:', err);
  }

  await browser.close();
};

// Получение аргументов
const [,, username, ...messageParts] = process.argv;
const message = messageParts.join(' ');

if (!username || !message) {
  console.error('⚠️ Использование: node send.js <username> "<сообщение>"');
  process.exit(1);
}

sendMessage(username, message).catch((err) => {
  console.error('❌ Общая ошибка выполнения:', err);
});
