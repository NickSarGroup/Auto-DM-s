const puppeteer = require('puppeteer');

async function sendDM(username, message) {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './user_data',  // Папка для сессии, авторизуйся в первый запуск вручную
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    // Переходим на профиль пользователя
    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });

    // Ждем кнопку "Message" (или "Написать")
    await page.waitForSelector('button', { timeout: 15000 });

    // Ищем кнопку с текстом "Message" или "Написать"
    const buttons = await page.$$('button');
    let messageButton = null;
    for (const btn of buttons) {
      const txt = await (await btn.getProperty('innerText')).jsonValue();
      if (txt.toLowerCase().includes('message') || txt.includes('Написать')) {
        messageButton = btn;
        break;
      }
    }
    if (!messageButton) throw new Error('Кнопка Message не найдена');
    await messageButton.click();

    // Ждем поле ввода сообщения
    await page.waitForSelector('textarea, div[contenteditable="true"]', { timeout: 15000 });

    // Выбираем поле ввода
    let input = await page.$('textarea');
    if (!input) input = await page.$('div[contenteditable="true"]');
    if (!input) throw new Error('Поле для ввода не найдено');

    // Вводим сообщение
    await input.focus();
    await page.keyboard.type(message, { delay: 50 });

    // Отправляем Enter
    await page.keyboard.press('Enter');

    // Ждем 3 секунды для отправки
    await page.waitForTimeout(3000);

    await browser.close();

    console.log(`Сообщение отправлено пользователю ${username}`);
  } catch (err) {
    await page.screenshot({ path: `error-${username}.png` });
    await browser.close();
    throw err;
  }
}

// Запуск через node index.js username "Текст сообщения"
(async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Использование: node index.js username "текст сообщения"');
    process.exit(1);
  }
  const [username, ...msgParts] = args;
  const message = msgParts.join(' ');

  try {
    await sendDM(username, message);
  } catch (e) {
    console.error('Ошибка:', e.message);
  }
})();
