const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

const randomDelay = (min, max) =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

const skippedAccounts = [];

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

      if (
        textLower.includes('message') ||
        ariaLower.includes('message') ||
        titleLower.includes('message')
      ) {
        messageButton = btn;
        break;
      }
    }

    if (!messageButton) {
      console.log('[INFO] Попробуем найти альтернативную кнопку через три точки');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent.trim().toLowerCase(), btn).catch(() => '');
        if (['options', 'more'].includes(text)) {
          await btn.click();
          await randomDelay(1000, 1500);

          const menuButtons = await page.$$('[role="dialog"] button, [role="menu"] button');

          for (const item of menuButtons) {
            const label = await page.evaluate(el => el.textContent?.toLowerCase() || '', item).catch(() => '');
            if (label.includes('send message')) {
              messageButton = item;
              break;
            }
          }

          await page.keyboard.press('Escape');
          await randomDelay(500, 700);
          break;
        }
      }
    }

    if (!messageButton) {
      console.log(`[INFO] Кнопка "Message" не найдена, но продолжаем пробовать, вдруг поле всё равно появится`);
    } else {
      console.log('[INFO] Кнопка "Message" найдена, кликаем по ней');
      await messageButton.click();
      await randomDelay(1000, 1500);
    }

    // Пытаемся закрыть окно уведомлений
    try {
      const notNowButton = await page.waitForSelector('button._a9--._ap36._a9_1', { timeout: 5000 });
      if (notNowButton) {
        console.log('[INFO] Закрываем окно "Turn on Notifications"');
        await notNowButton.click();
        await randomDelay(500, 700);
      }
    } catch {
      console.log('[INFO] Окно уведомлений не появилось');
    }

    // Ждём появления поля ввода или банворда
    const dmStatus = await page.waitForFunction(() => {
      const textarea = document.querySelector('textarea');
      const editable = document.querySelector('div[contenteditable="true"]');
      const allTextElements = Array.from(document.querySelectorAll('div, span'));
      const banText = "this account can't receive your message because they don't allow new message requests from everyone.";

      const foundBan = allTextElements.some(el => el.innerText?.trim().toLowerCase() === banText);
      if (foundBan) return 'ban';
      if (textarea || editable) return 'ok';
      return null;
    }, { timeout: 10000 });

    const result = await dmStatus.jsonValue();
    if (result === 'ban') {
      console.log('[SKIP] У пользователя ограничения на получение сообщений');
      skippedAccounts.push({ username, reason: 'dm_restricted' });
      return res.json({ status: 'skipped', reason: 'User has DM restrictions (ban text shown)' });
    }

    // Найдём поле ввода
    let inputSelector = null;
    try {
      await page.waitForSelector('textarea', { visible: true, timeout: 5000 });
      inputSelector = 'textarea';
    } catch {
      await page.waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 5000 });
      inputSelector = 'div[contenteditable="true"]';
    }

    const inputElement = await page.$(inputSelector);
    await inputElement.focus();

    const lines = message.split('\n');
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

    if (skippedAccounts.length > 0) {
      const logsDir = './logs';
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
      fs.writeFileSync(`${logsDir}/skipped_accounts.json`, JSON.stringify(skippedAccounts, null, 2));
      console.log('[INFO] Список пропущенных аккаунтов записан в logs/skipped_accounts.json');
    }
  }
});

const PORT = 10000;
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
