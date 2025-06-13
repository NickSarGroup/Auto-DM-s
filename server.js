const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

app.post('/send', async (req, res) => {
  const { username, message } = req.body;
  console.log(`[INFO] Получен запрос: username=${username}, message=${message}`);

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './profile',
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();

    // Загрузка cookies
    if (fs.existsSync('cookies.json')) {
      const cookies = JSON.parse(fs.readFileSync('cookies.json'));
      await page.setCookie(...cookies);
      console.log('[INFO] Cookies загружены');
    }

    const profileUrl = `https://www.instagram.com/${username}`;
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });
    console.log('[INFO] Страница пользователя загружена');

    // Ждём кнопки "Follow" или аналогичной для уверенности в загрузке интерфейса
    await page.waitForTimeout(3000);

    const elements = await page.$$('button, a');
    let messageButton = null;

    for (const el of elements) {
      const text = await page.evaluate(el => el.textContent?.trim(), el);
      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), el);
      const title = await page.evaluate(el => el.getAttribute('title'), el);
      const html = await page.evaluate(el => el.innerHTML, el);

      console.log('[DEBUG] Кнопка:', { text, ariaLabel, title, html });

      if (
        (text && text.toLowerCase().includes('message')) ||
        (ariaLabel && ariaLabel.toLowerCase().includes('message')) ||
        (title && title.toLowerCase().includes('message')) ||
        (html && html.toLowerCase().includes('message'))
      ) {
        messageButton = el;
        break;
      }
    }

    if (!messageButton) {
      await page.screenshot({ path: 'debug_not_found.png', fullPage: true });
      throw new Error('Кнопка "Message" не найдена. Скрин сохранён как debug_not_found.png');
    }

    await messageButton.click();
    console.log('[INFO] Клик по кнопке "Message"');

    // Ждём textarea
    await page.waitForSelector('textarea', { timeout: 10000 });
    await page.type('textarea', message);
    await page.keyboard.press('Enter');

    console.log('[INFO] Сообщение отправлено');
    res.send({ status: 'ok' });
  } catch (err) {
    console.error('[FATAL ERROR]', err);
    res.status(500).send({ error: err.message });
  } finally {
    // НЕ закрываем браузер — оставляем открытым для отладки
    // await browser.close();
  }
});

app.listen(10000, () => {
  console.log('Server started on http://localhost:10000');
});
