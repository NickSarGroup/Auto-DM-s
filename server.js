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

    // Загружаем cookies
    const cookiesPath = './cookies.json';
    if (!fs.existsSync(cookiesPath)) {
      throw new Error('Файл cookies.json не найден');
    }
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);

    // Переход на страницу пользователя
    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('body');

    // Немного подождем
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Ищем кнопку Message
    const elements = await page.$$('button, a');
    let messageButtonFound = false;

    for (const element of elements) {
      const text = await page.evaluate(el => el.textContent, element);
      console.log('[DEBUG] Кнопка:', text.trim());
      if (text.includes('Message') || text.includes('Сообщение')) {
        await element.click();
        messageButtonFound = true;
        break;
      }
    }

    if (!messageButtonFound) {
      throw new Error('Кнопка "Сообщение" не найдена.');
    }

    // Ждем появления textarea и отправляем сообщение
    await page.waitForSelector('textarea', { visible: true, timeout: 10000 });
    await page.type('textarea', message, { delay: 50 });
    await page.keyboard.press('Enter');

    console.log('[SUCCESS] Сообщение успешно отправлено!');
    res.json({ status: 'ok', message: 'Сообщение успешно отправлено' });
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = 10000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
