const express = require('express');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));

const COOKIES_PATH = path.resolve(__dirname, 'cookies.json');
const CHROME_EXEC_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; // поменяй на свой путь

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_EXEC_PATH,
    userDataDir: './user_data', // чтобы сессия сохранялась
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Загружаем cookies, если есть
  if (fs.existsSync(COOKIES_PATH)) {
    const cookiesString = fs.readFileSync(COOKIES_PATH, 'utf-8');
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log('[INFO] Cookies загружены');
  } else {
    console.log('[WARN] cookies.json не найден, залогинься вручную');
  }

  // Маршрут для приёма POST с username и message
  app.post('/', async (req, res) => {
    const { username, message } = req.body;
    console.log(`[INFO] Получен запрос: username=${username}, message=${message}`);

    try {
      const profileUrl = `https://www.instagram.com/${username}/`;
      await page.goto(profileUrl, { waitUntil: 'networkidle2' });

      // Подождать, чтобы UI прогрузился
      await page.waitForTimeout(3000);

      // Ищем кнопку "Message" более точно
      const buttons = await page.$$('button, a, div');
      let messageButton = null;

      for (const btn of buttons) {
        const [text, ariaLabel, title] = await Promise.all([
          page.evaluate(el => el.textContent.trim(), btn).catch(() => ''),
          page.evaluate(el => el.getAttribute('aria-label'), btn).catch(() => ''),
          page.evaluate(el => el.getAttribute('title'), btn).catch(() => ''),
        ]);

        console.log('[DEBUG] Кнопка:', { text, ariaLabel, title });

        if (
          text === 'Message' ||
          ariaLabel === 'Message' ||
          title === 'Message'
        ) {
          messageButton = btn;
          break;
        }
      }

      if (!messageButton) {
        throw new Error('Кнопка "Message" не найдена.');
      }

      await messageButton.click();

      // Ждем появления textarea для ввода сообщения
      await page.waitForSelector('textarea', { visible: true, timeout: 10000 });
      await page.type('textarea', message, { delay: 50 });
      await page.keyboard.press('Enter');

      console.log('[SUCCESS] Сообщение успешно отправлено!');
      res.send('OK');
    } catch (error) {
      console.error('[FATAL ERROR]', error);
      res.status(500).send(error.message);
    }
  });

  app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
  });
})();
