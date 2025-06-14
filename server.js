const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

// Функция случайной задержки
const randomDelay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

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

    const profileUrl = `https://www.instagram.com/${username}/`;
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });
    console.log('[INFO] Страница пользователя загружена');

    await randomDelay(3000, 5000); // Пауза после загрузки страницы

    // Ищем кнопку "Message"
    const buttons = await page.$$('div[role="button"]');

    let messageButton = null;

    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent.trim(), btn);
      console.log('[DEBUG] Кнопка:', text);
      if (text === 'Message') {
        messageButton = btn;
        break;
      }
    }

    if (!messageButton) {
      throw new Error('Кнопка "Message" не найдена.');
    }

    console.log('[INFO] Кнопка "Message" найдена, кликаем по ней');
    await messageButton.click();

    await randomDelay(2000, 4000); // Пауза перед полем ввода

    try {
      await page.waitForSelector('textarea', { visible: true, timeout: 10000 });
    } catch {
      await page.waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 10000 });
    }

    const inputSelector = await page.$('textarea') ? 'textarea' : 'div[contenteditable="true"]';

    await page.focus(inputSelector);

    // Имитация набора сообщения по символам с задержкой
    for (let char of message) {
      await page.keyboard.type(char);
      await randomDelay(50, 150); // "Человеческий" ввод
    }

    await randomDelay(500, 1200); // Пауза перед отправкой
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
