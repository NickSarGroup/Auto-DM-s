const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

// Быстрая случайная задержка, минимальная, чтобы не быть "роботом"
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

    // Опционально: меняем user-agent чтобы быть менее подозрительным
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    const cookiesPath = './cookies.json';
    if (!fs.existsSync(cookiesPath)) {
      return res.status(500).json({ error: 'Файл cookies.json не найден' });
    }

    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);
    console.log('[INFO] Cookies загружены');

    const profileUrl = `https://www.instagram.com/${username}/`;
    // Загружаем страницу с более быстрым событием загрузки
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    console.log('[INFO] Страница пользователя загружена');

    // Очень короткая задержка, просто чтобы страница стабилизировалась
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

    if (!messageButton) {
      throw new Error('Кнопка "Message" не найдена.');
    }

    console.log('[INFO] Кнопка "Message" найдена, кликаем по ней');
    await messageButton.click();

    // Ждем появление поля ввода сообщения
    try {
      await page.waitForSelector('textarea', { visible: true, timeout: 8000 });
    } catch {
      await page.waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 8000 });
    }

    const inputSelector = await page.$('textarea') ? 'textarea' : 'div[contenteditable="true"]';
    await page.focus(inputSelector);

    // Вставляем сообщение через clipboard API + Ctrl+V
    // Используем evaluate для записи в буфер обмена браузера
    await page.evaluate(async (msg) => {
      await navigator.clipboard.writeText(msg);
    }, message);

    // Клик по полю, чтобы точно быть в фокусе
    await page.click(inputSelector);

    // Ctrl+V — вставка текста
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');

    await randomDelay(200, 400); // Короткая пауза перед отправкой

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
