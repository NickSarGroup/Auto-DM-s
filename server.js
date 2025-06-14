const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

// Быстрая случайная задержка
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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    const cookiesPath = './cookies.json';
    if (!fs.existsSync(cookiesPath)) {
      return res.status(500).json({ error: 'Файл cookies.json не найден' });
    }

    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);
    console.log('[INFO] Cookies загружены');

    const profileUrl = `https://www.instagram.com/${username}/`;
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    console.log('[INFO] Страница пользователя загружена');

    await randomDelay(500, 1000);

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

    // Если кнопка Message не найдена — пробуем через три точки
    if (!messageButton) {
      console.log('[INFO] Кнопка "Message" не найдена. Пробуем через три точки...');

      const moreOptionsButton = await page.$('svg[aria-label="Options"], div[role="button"]:has(svg[aria-label="More options"])');
      if (!moreOptionsButton) {
        throw new Error('Кнопка с тремя точками не найдена');
      }

      await moreOptionsButton.click();
      await page.waitForSelector('div[role="dialog"]', { visible: true, timeout: 5000 });

      const dialogButtons = await page.$$('div[role="dialog"] div[role="button"]');

      for (const btn of dialogButtons) {
        const text = await page.evaluate(el => el.textContent.trim(), btn);
        console.log('[DEBUG] В меню:', text);
        if (text === 'Send message') {
          messageButton = btn;
          break;
        }
      }

      if (!messageButton) {
        throw new Error('Опция "Send message" не найдена в меню с тремя точками');
      }
    }

    console.log('[INFO] Кликаем по кнопке отправки сообщения');
    await messageButton.click();

    // Ждем появления поля ввода
    try {
      await page.waitForSelector('textarea', { visible: true, timeout: 8000 });
    } catch {
      await page.waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 8000 });
    }

    const inputSelector = await page.$('textarea') ? 'textarea' : 'div[contenteditable="true"]';
    await page.focus(inputSelector);

    // Вставка сообщения через буфер обмена
    await page.evaluate(async (msg) => {
      await navigator.clipboard.writeText(msg);
    }, message);

    await page.click(inputSelector);

    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');

    await randomDelay(200, 400);
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
