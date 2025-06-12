const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();
  await page.goto('https://google.com');
})();
