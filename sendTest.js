const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const username = 'nicksmartposter';
  const targetUser = 'nick_smartposter'; // Кому шлем
  const message = 'Привет! Это реальный тест DМ 🚀';

  const cookiesPath = `cookies/${username}.json`;
  if (!fs.existsSync(cookiesPath)) {
    console.log('Файл куков не найден.');
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });
  const page = await browser.newPage();

  const cookies = JSON.parse(fs.readFileSync(cookiesPath));
  await page.setCookie(...cookies);

  await page.goto(`https://www.instagram.com/direct/inbox/`, { waitUntil: 'networkidle2' });

  await page.waitForTimeout(3000);

  // Навигация к новому сообщению
  await page.goto(`https://www.instagram.com/direct/new/`, { waitUntil: 'networkidle2' });

  await page.waitForSelector('input[name="queryBox"]', { visible: true });
  await page.type('input[name="queryBox"]', targetUser, { delay: 1000 });

  await page.waitForTimeout(3000);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.click('div[role="dialog"] button[type="button"]');

  await page.waitForSelector('textarea', { visible: true });
  await page.type('textarea', message);
  await page.keyboard.press('Enter');

  console.log('✅ Сообщение отправлено!');
  await page.waitForTimeout(3000);
  await browser.close();
})();
