const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

// Быстрая случайная задержка
const randomDelay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms)); // ← исправленная пауза

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

      console.log('[DEBUG] Кнопка:', text, 'aria:', ariaLabel, 'title:', title);

      if (textLower === 'message' || ariaLower === 'message' || titleLower === 'message') {
        messageButton = btn;
        break;
      }

      if (textLower === 'options' || textLower === 'more' || ariaLower === 'options' || ariaLower === 'more' || titleLower === 'options' || titleLower === 'more') {
        console.log('[INFO] Нажимаем на три точки (Options / More)');
        await btn.click();
        await wait(1000); // ← исправлено

        const menuSelector = 'div[role="dialog"], div[role="menu"]';
        await page.waitForSelector(menuSelector, { timeout: 3000 }).catch(() => {});

        const menuButtons = await page.$$(menuSelector + ' [role="button"], ' + menuSelector + ' button, ' + menuSelector + ' div[role="menuitem"]');

        let foundInMenu = null;
        for (const item of menuButtons) {
          const [itemText, itemAria, itemTitle] = await Promise.all([
            page.evaluate(el => el.textContent.trim().toLowerCase(), item).catch(() => ''),
            page.evaluate(el => el.getAttribute('aria-label') || '', item).catch(() => ''),
            page.evaluate(el => el.getAttribute('title') || '', item).catch(() => ''),
          ]);

          console.log('[DEBUG] Пункт меню:', itemText, 'aria-label:', itemAria, 'title:', itemTitle);

          if (itemText === 'send message' || itemAria.toLowerCase() === 'send message' || itemTitle.toLowerCase() === 'send message') {
            foundInMenu = item;
            break;
          }
        }

        if (foundInMenu) {
          messageButton = foundInMenu;
          break;
        }

        await page.keyboard.press('Escape');
        await wait(500); // ← исправлено
      }
    }

    if (!messageButton) {
      throw new Error('Кнопка "Message" или "Send message" не найдена.');
    }

    console.log('[INFO] Кнопка "Message" найдена, кликаем по ней');
    await messageButton.click();

    let inputSelector;
    try {
      await page.waitForSelector('textarea', { visible: true, timeout: 8000 });
      inputSelector = 'textarea';
    } catch {
      await page.waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 8000 });
      inputSelector = 'div[contenteditable="true"]';
    }

    await page.focus(inputSelector);

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
