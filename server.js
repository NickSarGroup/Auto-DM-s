const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

app.post('/send-dm', async (req, res) => {
  const { username, message } = req.body;

  console.log(`[INFO] Получен запрос: username=${username}, message=${message}`);

  if (!username || !message) {
    return res.status(400).json({ error: 'username и message обязательны' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null,
    });

    const page = await browser.newPage();

    const cookiesPath = './cookies.json';
    if (!fs.existsSync(cookiesPath)) {
      return res.status(500).json({ error: 'Файл cookies.json не найден' });
    }

    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);
    console.log('[INFO] Cookies загружены');

    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
    console.log('[INFO] Страница пользователя загружена');

    // Заменили на рабочий вариант
    await new Promise(resolve => setTimeout(resolve, 3000));

    const buttons = await page.$$('button');

    let messageButton = null;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent.trim(), button);
      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), button);
      const title = await page.evaluate(el => el.getAttribute('title'), button);

      console.log('[DEBUG] Кнопка:', { text, ariaLabel, title });

      if (
        text === 'Message' ||
        ariaLabel === 'Message' ||
        title === 'Message'
      ) {
        messageButton = button;
        break;
      }
    }

    if (!messageButton) {
      throw new Error('Кнопка "Message" не найдена.');
    }

    console.log('[INFO] Кнопка "Message" найдена, кликаем по ней');
    await messageButton.click();

    try {
      await page.waitForSelector('textarea', { visible: true, timeout: 10000 });
    } catch {
      await page.waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 10000 });
    }

    const inputSelector = await page.$('textarea') ? 'textarea' : 'div[contenteditable="true"]';
    await page.focus(inputSelector);
    await page.keyboard.type(message, { delay: 50 });
    await page.keyboard.press('Enter');

    console.log('[INFO] Сообщение отправлено');

    res.json({ status: 'ok', message: 'Сообщение успешно отправлено' });
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = 10000;
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
