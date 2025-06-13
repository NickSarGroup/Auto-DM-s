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

  const cookiesPath = './cookies.json';
  if (!fs.existsSync(cookiesPath)) {
    return res.status(500).json({ error: 'Файл cookies.json не найден' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // путь для macOS
      // если Windows — замени на:
      // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null
    });

    const page = await browser.newPage();
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);

    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const buttons = await page.$$('button');
    let messageButtonFound = false;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Message') || text.includes('Сообщение')) {
        await button.click();
        messageButtonFound = true;
        break;
      }
    }

    if (!messageButtonFound) {
      throw new Error('Кнопка "Сообщение" не найдена.');
    }

    await page.waitForSelector('textarea', { visible: true, timeout: 10000 });
    await page.type('textarea', message, { delay: 50 });
    await page.keyboard.press('Enter');

    res.json({ status: 'ok', message: 'Сообщение успешно отправлено' });
  } catch (error) {
    console.error('[FATAL ERROR]', error); // Показываем ошибку в консоль
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = 10000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
