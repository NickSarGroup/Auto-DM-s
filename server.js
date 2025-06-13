const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

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
      defaultViewport: null
    });

    const page = await browser.newPage();

    const cookiesPath = './cookies.json';
    if (!fs.existsSync(cookiesPath)) {
      return res.status(500).json({ error: 'Файл cookies.json не найден' });
    }

    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);

    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });

    await page.waitForTimeout(3000);

    let messageButton = null;
    const buttons = await page.$$('button');

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      console.log(`[DEBUG] Кнопка: ${text}`);

      if (text.includes('Follow')) {
        console.log('[ACTION] Нажимаю Follow...');
        await button.click();
        await page.waitForTimeout(2000);
      }

      if (text.includes('Message') || text.includes('Сообщение')) {
        messageButton = button;
        break;
      }
    }

    // Вторичная проверка после Follow
    if (!messageButton) {
      console.log('[INFO] Ищу кнопку "Message" повторно...');
      await page.waitForTimeout(2000);

      const updatedButtons = await page.$$('button');
      for (const button of updatedButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        console.log(`[DEBUG] Повторная кнопка: ${text}`);
        if (text.includes('Message') || text.includes('Сообщение')) {
          messageButton = button;
          break;
        }
      }
    }

    if (!messageButton) {
      await page.screenshot({ path: 'debug.png', fullPage: true });
      throw new Error('Кнопка "Message" не найдена.');
    }

    await messageButton.click();
    await page.waitForSelector('textarea', { visible: true, timeout: 10000 });
    await page.type('textarea', message, { delay: 50 });
    await page.keyboard.press('Enter');

    res.json({ status: 'ok', message: 'Сообщение отправлено' });
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = 10000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
