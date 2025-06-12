const puppeteer = require('puppeteer');
const fs = require('fs');

const username = process.argv[2];
const message = process.argv[3];

if (!username || !message) {
  console.log('❌ Укажите имя пользователя и сообщение:');
  console.log('Пример: node send.js nicksmartposter "Привет!"');
  process.exit(1);
}

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--remote-debugging-port=9222'
      ],
    });

    const page = await browser.newPage();

    // Загрузка cookies
    const cookiesPath = './cookies.json';
    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
      await page.setCookie(...cookies);
    }

    // Переход на Instagram
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle2',
    });

    // Ожидание кнопки "Сообщение"
    await page.waitForSelector('button', { visible: true });

    const buttons = await page.$$('button');
    let messageButtonFound = false;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Message') || text.includes('Сообщение')) {
        await button.click();
        messageButtonFound = true;
        break;
      }
    }

    if (!messageButtonFound) {
      throw new Error('Не найдена кнопка "Сообщение". Возможно, пользователь закрыт для сообщений.');
    }

    // Ожидание поля ввода
    await page.waitForSelector('textarea', { visible: true });

    await page.type('textarea', message);
    await page.keyboard.press('Enter');

    console.log('✅ Сообщение успешно отправлено!');

    await browser.close();

  } catch (error) {
    console.error('❌ Общая ошибка выполнения:', error);
  }
})();
