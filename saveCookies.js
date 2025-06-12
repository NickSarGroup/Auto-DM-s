const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

  console.log('⏳ Войди в аккаунт. У тебя 90 сек...');
  await page.waitForTimeout(90000); // больше времени на вход

  const cookies = await page.cookies();
  fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));

  console.log('✅ Куки сохранены в cookies.json');
  await browser.close();
})();
