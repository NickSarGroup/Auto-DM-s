const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

const LOG_PATH = './sent-log.json';
const MAX_PER_HOUR = 15;
const DELAY_MIN = 5000; // 5 сек
const DELAY_MAX = 8000; // 8 сек

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay() {
  return Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1)) + DELAY_MIN;
}

function readLog() {
  if (!fs.existsSync(LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
}

function writeLog(logs) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
}

function filterLastHourLogs(logs) {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return logs.filter(log => log.timestamp > oneHourAgo);
}

app.post('/send-dm', async (req, res) => {
  const { username, message } = req.body;

  console.log(`[INFO] Получен запрос: username=${username}, message=${message}`);

  if (!username || !message) {
    return res.status(400).json({ error: 'username и message обязательны' });
  }

  // === АНТИБАН ===
  let logs = readLog();
  logs = filterLastHourLogs(logs);

  if (logs.length >= MAX_PER_HOUR) {
    return res.status(429).json({ error: `Лимит ${MAX_PER_HOUR} сообщений в час достигнут.` });
  }

  const recentToUser = logs.find(l => l.username === username);
  if (recentToUser) {
    return res.status(429).json({ error: 'Этому пользователю уже отправляли в течение часа.' });
  }

  const delayMs = getRandomDelay();
  console.log(`[ANTIBAN] Задержка перед отправкой: ${delayMs / 1000} секунд`);
  await delay(delayMs);

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

    await delay(3000);

    const messageButton = await page.$('div[role="button"]:has-text("Message")');

    if (!messageButton) {
      throw new Error('Кнопка "Message" не найдена.');
    }

    console.log('[INFO] Кнопка "Message" найдена, кликаем по ней');
    await messageButton.click();

    try {
      await page.waitForSelector('textarea, div[contenteditable="true"]', { visible: true, timeout: 10000 });
    } catch (e) {
      throw new Error('Поле ввода не найдено.');
    }

    const inputSelector = await page.$('textarea') ? 'textarea' : 'div[contenteditable="true"]';
    await page.focus(inputSelector);
    await page.keyboard.type(message, { delay: 50 });
    await page.keyboard.press('Enter');

    console.log('[INFO] Сообщение отправлено');

    // Логируем
    logs.push({ username, timestamp: Date.now() });
    writeLog(filterLastHourLogs(logs)); // Сохраняем только последние записи

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
