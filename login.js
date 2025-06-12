const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.goto('https://www.instagram.com/accounts/login/');

  console.log('🔐 Войди в Instagram вручную в открывшемся окне...');

  // Ожидание 3 минуты с использованием Promise
  await new Promise(resolve => setTimeout(resolve, 180000)); // 3 минуты

  const cookies = await page.cookies();
  fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
  console.log('✅ Cookies сохранены в cookies.json');

  await browser.close();
})();
