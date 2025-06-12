const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.goto('https://www.instagram.com/accounts/login/');

  console.log('🔐 Войди в Instagram вручную в открывшемся окне...');

  await page.waitForTimeout(180000); // 3 минуты
  const cookies = await page.cookies();
  fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, 2));
  console.log('✅ Cookies сохранены.');

  await browser.close();
})();
