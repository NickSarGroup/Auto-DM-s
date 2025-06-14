const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

// Быстрая случайная задержка, минимальная, чтобы не быть "роботом"
const randomDelay = (min, max) =>
  new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

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

    // Меняем user-agent, чтобы быть менее подозрительным
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

    // Универсальная функция для поиска и клика по кнопке "Send message" или "Message"
    async function clickSendMessage() {
      // Ищем кнопку "Options" (три точки) и кликаем, если есть
      const optionsButtons = await page.$x(
        "//button[contains(@aria-label, 'Options') or contains(@aria-label, 'More') or contains(text(), 'More')]"
      );

      if (optionsButtons.length > 0) {
        console.log('[INFO] Нажимаем на три точки (Options / More)');
        await optionsButtons[0].click();
        await page.waitForTimeout(1000);

        // Ищем меню
        const menuSelector = 'div[role="dialog"], div[role="menu"]';
        await page.waitForSelector(menuSelector, { timeout: 3000 }).catch(() => {});

        // Кнопки в меню
        const menuButtons = await page.$$(menuSelector + ' button, ' + menuSelector + ' [role="menuitem"]');

        for (const btn of menuButtons) {
          const text = await page.evaluate((el) => el.textContent.trim().toLowerCase(), btn).catch(() => '');
          const aria = await page.evaluate((el) => el.getAttribute('aria-label') || '', btn).catch(() => '');
          const title = await page.evaluate((el) => el.getAttribute('title') || '', btn).catch(() => '');

          if (text === 'send message' || aria.toLowerCase() === 'send message' || title.toLowerCase() === 'send message') {
            console.log('[INFO] Кнопка "Send message" найдена в меню, кликаем');
            await btn.click();
            await page.waitForTimeout(1000);
            return true;
          }
        }

        // Если не нашли — закрываем меню
        console.log('[INFO] Кнопка "Send message" в меню не найдена, закрываем меню');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } else {
        console.log('[INFO] Кнопка "Options" (три точки) не найдена, пропускаем меню');
      }

      // Ищем кнопку "Message" на странице напрямую
      const buttons = await page.$$('button, div[role="button"]');
      for (const btn of buttons) {
        const text = await page.evaluate((el) => el.textContent.trim().toLowerCase(), btn).catch(() => '');
        const aria = await page.evaluate((el) => el.getAttribute('aria-label') || '', btn).catch(() => '');
        const title = await page.evaluate((el) => el.getAttribute('title') || '', btn).catch(() => '');

        if (text === 'send message' || text === 'message' || aria.toLowerCase() === 'send message' || aria.toLowerCase() === 'message' || title.toLowerCase() === 'send message' || title.toLowerCase() === 'message') {
          console.log('[INFO] Кнопка "Send message" или "Message" найдена на странице, кликаем');
          await btn.click();
          await page.waitForTimeout(1000);
          return true;
        }
      }

      return false;
    }

    const clicked = await clickSendMessage();
    if (!clicked) {
      throw new Error('Кнопка "Message" или "Send message" не найдена.');
    }

    // Ждем появления поля ввода сообщения
    let inputSelector;
    try {
      await page.waitForSelector('textarea', { visible: true, timeout: 8000 });
      inputSelector = 'textarea';
    } catch {
      await page.waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 8000 });
      inputSelector = 'div[contenteditable="true"]';
    }

    await page.focus(inputSelector);

    // Вставляем сообщение через clipboard API + Ctrl+V
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
