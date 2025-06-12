const puppeteer = require('puppeteer');
const fs = require('fs');

const username = process.argv[2];
const message = process.argv[3];

if (!username || !message) {
  console.log('❌ Укажи имя пользователя и сообщение, пример:\nnode send.js nicksmartposter "Привет!"');
  process.exit();
}

(async () => {
  try {
    const cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf8'));

    const browser = await puppeteer.launch({
      headless: false, // для дебага ставим false
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setCookie(...cookies);
    await page.goto(`https://www.instagram.com/direct/t/${username}/`, { waitUntil: 'networkidle2' });

    await page.waitForSelector('textarea', { timeout: 10000 });
    await page.type('textarea', message);
    await page.keyboard.press('Enter');

    console.log(`✅ Сообщение отправлено пользователю @${username}`);
    await browser.close();

  } catch (error) {
    console.error('❌ Ошибка при отправке сообщения:', error);
  }
})();
