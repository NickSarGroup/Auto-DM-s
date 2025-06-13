const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

let browser;

async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({ headless: false });
  }
  return browser;
}

app.post('/send-dm', async (req, res) => {
  const { username, message } = req.body;

  if (!username || !message) {
    return res.status(400).json({ error: 'username и message обязательны' });
  }

  try {
    const browser = await initBrowser();
    const page = await browser.newPage();

    const profileUrl = `https://www.instagram.com/${username}/`;
    console.info(`[INFO] Открываем профиль ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });

    // Ждем появления кнопок
    await page.waitForSelector('div[role="button"]', { timeout: 10000 });

    // Ищем кнопку "Message"
    const buttons = await page.$$('div[role="button"]');
    let messageBtn = null;

    for (const btn of buttons) {
      const text = await (await btn.getProperty('textContent')).jsonValue();
      if (text.trim() === 'Message') {
        messageBtn = btn;
        break;
      }
    }

    if (!messageBtn) {
      throw new Error('Кнопка "Message" не найдена');
    }

    console.info('[INFO] Нажимаем кнопку "Message"');
    await messageBtn.click();

    // Ждем появления textarea или input для сообщения (примерно)
    await page.waitForSelector('textarea', { timeout: 5000 });

    // Вводим сообщение
    await page.type('textarea', message, { delay: 50 });

    // Отправляем сообщение нажатием Enter
    await page.keyboard.press('Enter');

    console.info(`[INFO] Сообщение отправлено пользователю ${username}`);

    await page.close();

    res.json({ status: 'success', message: `Сообщение отправлено пользователю ${username}` });
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 10000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
