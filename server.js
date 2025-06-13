const express = require('express');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const app = express();
const PORT = 10000;

app.use(express.json());

app.post('/send', async (req, res) => {
  const { username, message } = req.body;
  console.log(`[INFO] Получен запрос: username=${username}, message=${message}`);

  try {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Загрузка cookies
    const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
    await page.setCookie(...cookies);
    console.log('[INFO] Cookies загружены');

    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
    console.log('[INFO] Страница пользователя загружена');

    // Поиск кнопки Message среди <button> и <a>
    const elements = await page.$$('button, a');
    let messageButton = null;

    for (const el of elements) {
      const text = await page.evaluate(el => el.textContent.trim(), el);
      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), el);
      const title = await page.evaluate(el => el.getAttribute('title'), el);

      console.log('[DEBUG] Кнопка:', { text, ariaLabel, title });

      if (
        text === 'Message' ||
        ariaLabel === 'Message' ||
        title === 'Message'
      ) {
        messageButton = el;
        break;
      }
    }

    if (!messageButton) {
      throw new Error('Кнопка "Message" не найдена.');
    }

    await messageButton.click();
    console.log('[INFO] Кнопка "Message" нажата');

    // Ждём появления текстового поля и отправляем сообщение
    await page.waitForSelector('textarea', { timeout: 10000 });
    await page.type('textarea', message);
    await page.keyboard.press('Enter');
    console.log('[INFO] Сообщение отправлено');

    await browser.close();
    res.send({ success: true });
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    res.status(500).send({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
