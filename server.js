const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // для наглядности
  const page = await browser.newPage();

  const username = 'nick_smartposter'; // заменяй на нужного
  const profileUrl = `https://www.instagram.com/${username}/`;

  await page.goto(profileUrl, { waitUntil: 'networkidle2' });

  // Подождать появления кнопок с role="button"
  await page.waitForSelector('div[role="button"]');

  // Найти кнопку "Message" и нажать
  const buttons = await page.$$('div[role="button"]');
  let messageBtn = null;

  for (const btn of buttons) {
    const text = await (await btn.getProperty('textContent')).jsonValue();
    if (text.trim() === 'Message') {
      messageBtn = btn;
      break;
    }
  }

  if (!messageBtn) {
    throw new Error('Кнопка "Message" не найдена');
  }

  await messageBtn.click();

  console.log('Кнопка "Message" нажата!');

  // Далее можно добавить отправку сообщения и т.п.

  // await browser.close();
})();
