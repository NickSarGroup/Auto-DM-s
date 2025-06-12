const puppeteer = require('puppeteer');
const fs = require('fs');

const username = process.argv[2];
const message = process.argv.slice(3).join(' '); // захват всей строки

if (!username || !message) {
  console.log('❌ Укажите имя пользователя и сообщение:\nПример: node send.js nicksmartposter "Привет!"');
  process.exit(1);
}

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null
    });

    const page = await browser.newPage();

    // Загрузка cookies
    const cookiesPath = './cookies.json';
    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
      await page.setCookie(...cookies);
      console.log('✅ Куки загружены');
    } else {
      throw new Error('❌ Файл cookies.json не найден.');
    }

    // Переход на Instagram
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Ожидание кнопки "Сообщение"
    await page.waitForTimeout(3000); // дожидаемся прогрузки
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
      throw new Error('❌ Кнопка "Сообщение" не найдена. Возможно, аккаунт закрыт для сообщений.');
    }

    // Ожидание поля ввода
    await page.waitForSelector('textarea', { visible: true, timeout: 10000 });

    await page.type('textarea', message, { delay: 50 });
    await page.keyboard.press('Enter');

    console.log('✅ Сообщение успешно отправлено!');

  } catch (error) {
    console.error('❌ Ошибка:', error.message || error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
