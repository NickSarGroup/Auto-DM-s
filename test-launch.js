const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const username = 'nicksmartposter';
const cookiesPath = path.join(__dirname, 'cookies', `${username}.json`);

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  if (fs.existsSync(cookiesPath)) {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath));
    await page.setCookie(...cookies);
    console.log('✅ Куки загружены');
  } else {
    console.log('❌ Куки не найдены');
  }

  await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

  // Оставляем окно открытым
})();
