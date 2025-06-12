const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // чтобы окно открылось для ручного логина
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  // Заходишь вручную
  console.log('🔐 Войди в Instagram вручную в открывшемся окне...');

  await page.goto('https://www.instagram.com/accounts/login/', {
    waitUntil: 'networkidle2',
  });

  // Ждём 3 минуты (180000 ms) ручного входа
  await new Promise(resolve => setTimeout(resolve, 180000));

  // Сохраняем cookies после логина
  const cookies = await page.cookies();
  fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
  console.log('✅ Cookies сохранены в cookies.json');

  await browser.close();
})();
