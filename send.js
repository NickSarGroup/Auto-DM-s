const puppeteer = require('puppeteer');
const fs = require('fs');

const username = process.argv[2];
const message = process.argv.slice(3).join(' ');

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

    // Установка user-agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
    );

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
    await page.goto('https://www.instagram.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Проверка авторизации
    if (page.url().includes('accounts/login')) {
      throw new Error('❌ Неавторизован. Проверь cookies.');
    }

    // Рандомная задержка
    await delayRandom(2000, 4000);

    // Переход на профиль пользователя
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await delayRandom(3000, 5000);

    // Поиск кнопки "Сообщение"
    const buttons = await page.$$('button');
    let messageButtonClicked = false;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Message') || text.includes('Сообщение')) {
        await button.click();
        messageButtonClicked = true;
        break;
      }
    }

    if (!messageButtonClicked) {
      throw new Error('❌ Кнопка "Сообщение" не найдена. Возможно, аккаунт закрыт.');
    }

    // Ожидание поля ввода
    await page.waitForSelector('textarea', { visible: true, timeout: 10000 });

    // Ввод сообщения
    await page.type('textarea', message, { delay: 50 });

    // Альтернатива нажатию Enter
    await delayRandom(1000, 2000);
    const sendButton = await page.$('svg[aria-label="Отправить сообщение"]');
    if (sendButton) {
      await sendButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    console.log(`✅ Сообщение успешно отправлено @${username}`);

    // Логгирование
    fs.appendFileSync('sent.log', `${new Date().toISOString()} | @${username} | ${message}\n`);

    // Случайное поведение
    await page.mouse.move(100 + Math.random() * 300, 100 + Math.random() * 200);
    await delayRandom(1000, 3000);

  } catch (error) {
    console.error('❌ Ошибка:', error.message || error);
    fs.appendFileSync('errors.log', `${new Date().toISOString()} | @${username} | ${error.message}\n`);
  } finally {
    if (browser) await browser.close();
  }
})();

function delayRandom(min, max) {
  const timeout = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, timeout));
}
