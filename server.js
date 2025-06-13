console.log("=== SERVER LOADED ===");
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

app.post('/send-dm', async (req, res) => {
  const { username, message } = req.body;

  if (!username || !message) {
    return res.status(400).json({ error: 'username и message обязательны' });
  }

  let browser;

  try {
    console.log(`[INFO] Получен запрос: username=${username}, message=${message}`);

    const cookiesPath = './cookies.json';
    if (!fs.existsSync(cookiesPath)) {
      console.error('[ERROR] Файл cookies.json не найден');
      return res.status(500).json({ error: 'Файл cookies.json не найден' });
    }

    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));

    browser = await puppeteer.launch({
      headless: false, // чтобы можно было видеть процесс
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null
    });

    const page = await browser.newPage();
    await page.setCookie(...cookies);

    console.log('[INFO] Переход на профиль пользователя...');
    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);

    console.log('[INFO] Поиск кнопки "Message"...');
    const buttons = await page.$$('button');
    let messageButtonFound = false;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Message') || text.includes('Сообщение')) {
        await button.click();
        messageButtonFound = true;
        console.log('[INFO] Кнопка "Message" найдена и нажата.');
        break;
      }
    }

    if (!messageButtonFound) {
      throw new Error('Кнопка "Сообщение" не найдена. Убедись, что ты залогинен и это не закрытый аккаунт.');
    }

    await page.waitForSelector('textarea', { visible: true, timeout: 10000 });
    await page.type('textarea', message, { delay: 50 });
    await page.keyboard.press('Enter');

    console.log('[SUCCESS] Сообщение отправлено!');
    res.json({ status: 'ok', message: 'Сообщение успешно отправлено' });

  } catch (error) {
    console.error('[FATAL ERROR]', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) {
      await browser.close();
      console.log('[INFO] Браузер закрыт');
    }
  }
});

const PORT = 10000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
