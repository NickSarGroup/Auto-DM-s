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

    // --- Проверка на блокировку сообщений или приватный акк ---
    const dmBlockedText = await page.evaluate(() => {
      const targetText = "This account can't receive your message because they don't allow new message requests from everyone.";
      const blockedDiv = document.querySelector('div.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x186z157.xk50ysn');
      return blockedDiv?.innerText.trim() === targetText;
    });

    const dmBlockedImage = await page.evaluate(() => {
      const banAltTexts = ['lock', 'private', 'not allowed', 'restricted', 'block', 'shield', 'no entry'];
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.some(img => {
        const alt = img.alt?.toLowerCase() || '';
        return banAltTexts.some(word => alt.includes(word));
      });
    });

    const isPrivateByText = await page.evaluate(() => {
      return document.body.innerText.includes('This Account is Private');
    });

    if (dmBlockedText || dmBlockedImage || isPrivateByText) {
      console.log(`[SKIP] DM заблокированы (по тексту или изображениям): ${username}`);
      skippedAccounts.push({
        username,
        reason: dmBlockedText ? 'restricted_dms_text' :
                dmBlockedImage ? 'restricted_dms_image' :
                'private_account_text'
      });
      return res.json({ status: 'skipped', reason: 'User DMs blocked or private' });
    }

    // --- Поиск кнопки Message или Send Message ---
    let messageButton = null;

    const findMessageButton = async () => {
      const buttons = await page.$$('div[role="button"], button');

      for (const btn of buttons) {
        const [text, ariaLabel, title] = await Promise.all([
          page.evaluate(el => el.textContent.trim(), btn).catch(() => ''),
          page.evaluate(el => el.getAttribute('aria-label') || '', btn).catch(() => ''),
          page.evaluate(el => el.getAttribute('title') || '', btn).catch(() => ''),
        ]);

        const lowerText = (text + ariaLabel + title).toLowerCase();

        if (lowerText.includes('message')) {
          return btn;
        }

        if (['options', 'more'].some(opt => lowerText.includes(opt))) {
          await btn.click();
          await randomDelay(800, 1200);

          const menuSelector = 'div[role="dialog"], div[role="menu"]';
          await page.waitForSelector(menuSelector, { timeout: 3000 }).catch(() => {});

          const menuButtons = await page.$$(`${menuSelector} *`);
          for (const item of menuButtons) {
            const itemText = await page.evaluate(el => el.innerText?.trim().toLowerCase() || '', item).catch(() => '');
            if (itemText.includes('send message')) {
              return item;
            }
          }

          await page.keyboard.press('Escape');
          await randomDelay(300, 500);
        }
      }
      return null;
    };

    messageButton = await findMessageButton();

    if (messageButton) {
      console.log('[INFO] Кнопка "Message" или "Send message" найдена, кликаем');
      await messageButton.click();
      await randomDelay(800, 1200);
    } else {
      console.log(`[SKIP] Не удалось найти кнопку "Message" или "Send message": ${username}`);
      skippedAccounts.push({ username, reason: 'no_message_or_send_message_button' });
      return res.json({ status: 'skipped', reason: 'Cannot open DM — no button found' });
    }

    // --- Закрытие "Not Now" при открытии чата ---
    try {
      const notNowButton = await page.waitForSelector('button._a9--._ap36._a9_1', { timeout: 5000 });
      if (notNowButton) {
        await notNowButton.click();
        await randomDelay(500, 800);
      }
    } catch (e) {}

    // --- Поиск поля ввода и отправка сообщения ---
    let inputSelector;
    try {
      await page.waitForSelector('textarea', { visible: true, timeout: 8000 });
      inputSelector = 'textarea';
    } catch {
      try {
        await page.waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 8000 });
        inputSelector = 'div[contenteditable="true"]';
      } catch {
        console.log(`[SKIP] Поле ввода не найдено: ${username}`);
        skippedAccounts.push({ username, reason: 'no_input_field' });
        return res.json({ status: 'skipped', reason: 'No input field — DMs likely restricted' });
      }
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
