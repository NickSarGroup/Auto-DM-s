const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const username = 'nicksmartposter';
  const cookiesPath = `cookies/${username}.json`;

  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
  console.log('⏳ Войдите вручную. У тебя 60 сек...');
  await page.waitForTimeout(60000);

  const cookies = await page.cookies();
  if (!fs.existsSync('cookies')) fs.mkdirSync('cookies');
  fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));

  console.log(`✅ Куки сохранены в ${cookiesPath}`);
  await browser.close();
})();
