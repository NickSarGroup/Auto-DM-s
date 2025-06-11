const puppeteer = require('puppeteer');
const fs = require('fs');

const IG_USERNAME = 'nicksmartposter';
const IG_PASSWORD = '0RrjZIx1q4';

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Показываем окно для ручного подтверждения (например, капча)
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.goto('https://www.instagram.com/accounts/login/', {
    waitUntil: 'networkidle2',
  });

  await page.waitForSelector('input[name="username"]', { timeout: 10000 });
  await page.type('input[name="username"]', IG_USERNAME, { delay: 50 });
  await page.type('input[name="password"]', IG_PASSWORD, { delay: 50 });

  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);

  // Ждём после входа и сохраняем cookies
  await page.waitForTimeout(5000);

  const cookies = await page.cookies();
  fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));

  console.log('✅ Instagram cookies saved to cookies.json');
  await browser.close();
})();
