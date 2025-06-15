const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

const randomDelay = (min, max) =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      defaultViewport: null,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

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

    const buttons = await page.$$('div[role="button"], button');

    let messageButton = null;

    for (const btn of buttons) {
      const [text, ariaLabel, title] = await Promise.all([
        page.evaluate(el => el.textContent.trim(), btn).catch(() => ''),
        page.evaluate(el => el.getAttribute('aria-label') || '', btn).catch(() => ''),
        page.evaluate(el => el.getAttribute('title') || '', btn).catch(() => ''),
      ]);

      const textLower = text.toLowerCase();
      const ariaLower = ariaLabel.toLowerCase();
      const titleLower = title.toLowerCase();

      console.log('[DEBUG] Кнопка:', text, 'aria-label:', ariaLabel, 'title:', title);

      if (textLower === 'message' || ariaLower === 'message' || titleLower === 'message') {
        messageButton = btn;
        break;
      }

      if (
        ['options', 'more'].includes(textLower) ||
        ['options', 'more'].includes(ariaLower) ||
        ['options', 'more'].includes(titleLower)
      ) {
        console.log('[INFO] Пробуем нажать на три точки (Options / More)');
        await btn.click();
        await randomDelay(800, 1200);

        const menuSelector = 'div[role="dialog"], div[role="menu"]';
        await page.waitForSelector(menuSelector, { timeout: 3000 }).catch(() => {});

        const menuButtons = await page.$$(`${menuSelector} *`);

        for (const item of menuButtons) {
          const itemText = await page.evaluate(el => el.innerText?.trim().toLowerCase() || '', item).catch(() => '');

          if (itemText.includes('send message')) {
            console.log('[INFO] Найдена кнопка "Send message" через резервный способ');
            messageButton = item;
            break;
          }
        }

        if (messageButton) break;

        await page.keyboard.press('Escape');
        await randomDelay(300, 500);
      }
    }

    if (!messageButton) {
      throw new Error('Кнопка "Message" или "Send message" не найдена.');
    }

    console.log('[INFO] Кнопка "Message" найдена, кликаем по ней');
    await messageButton.click();
    await randomDelay(800, 1200);

    try {
      console.log('[INFO] Ждём появления окна "Turn on notifications" с кнопкой "Not Now"...');
      const notNowButton = await page.waitForSelector('button._a9--._ap36._a9_1', { timeout: 5000 });
      if (notNowButton) {
        console.log('[INFO] Кнопка "Not Now" найдена, нажимаем');
        await notNowButton.click();
        await randomDelay(500, 800);
      }
    } catch (e) {
      console.log('[INFO] Окно "Turn on notifications" не появилось — продолжаем');
    }

    let inputSelector;
    try {
      await page.waitForSelector('textarea', { visible: true, timeout: 8000 });
      inputSelector = 'textarea';
    } catch {
      await page.waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 8000 });
      inputSelector = 'div[contenteditable="true"]';
    }

    const inputElement = await page.$(inputSelector);
    await inputElement.focus();

    // 🔥 Новая универсальная логика ввода сообщения с переносами строк
    const finalMessage = message;
    const lines = finalMessage.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');
      }
      await page.keyboard.type(lines[i], { delay: 10 });
      await randomDelay(100, 300);
    }

    await randomDelay(500, 700);
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
