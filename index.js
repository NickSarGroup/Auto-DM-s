const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

app.post('/send-message', async (req, res) => {
  const { username, message } = req.body;
  if (!username || !message) {
    return res.status(400).json({ error: 'username and message required' });
  }

  console.log(`Queued: ${username}`);

  try {
    await sendDM(username, message);
    res.json({ status: 'sent', to: username });
  } catch (error) {
    console.error(`❌ Ошибка при отправке:`, error);
    res.status(500).json({ error: error.toString() });
  }
});

async function sendDM(username, message) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  // Загружаем cookies
  const cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf-8'));
  await page.setCookie(...cookies);

  // Переход к пользователю
  const cleanUsername = username.split('|')[0].trim().replace(/\s/g, '');
  const userUrl = `https://www.instagram.com/${cleanUsername}/`;
  await page.goto(userUrl, { waitUntil: 'networkidle2' });

  // Жмем кнопку Message
  await page.waitForSelector('button');
  const buttons = await page.$$('button');
  for (let btn of buttons) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text.toLowerCase().includes('message') || text.toLowerCase().includes('сообщение')) {
      await btn.click();
      break;
    }
  }

  // Ожидаем открытие диалога
  await page.waitForSelector('textarea');
  await page.type('textarea', message);
  await page.keyboard.press('Enter');

  console.log(`✅ Отправлено сообщение для ${username}`);
  await browser.close();
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
