const puppeteer = require('puppeteer');
const fs = require('fs');

const username = process.argv[2];
const message = process.argv[3];

if (!username || !message) {
  console.log('❌ Укажи юзернейм и сообщение:');
  console.log('Пример: node send.js nick_smartposter "Привет!"');
  process.exit();
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './profile', // сохраняет сессию, чтобы не логиниться каждый раз
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  // Переход на Instagram
  await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

  // Проверка, авторизован ли пользователь
  const isLoggedIn = await page.evaluate(() => {
    return document.cookie.includes('ds_user_id');
  });

  if (!isLoggedIn) {
    console.log('👀 Авторизуйся вручную в открывшемся окне, затем закрой его и запусти снова');
    await page.waitForTimeout(30000);
    await browser.close();
    return;
  }

  console.log('✅ Вход выполнен, продолжаем');

  // Переход на страницу пользователя
  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });

  // Нажимаем кнопку "Написать"
  await page.waitForSelector('button', { visible: true });
  await page.$$eval('button', (buttons) => {
    const messageButton = buttons.find(btn => btn.textContent.includes('Message') || btn.textContent.includes('Написать'));
    if (messageButton) messageButton.click();
  });

  // Ждём textarea
  await page.waitForSelector('textarea', { visible: true, timeout: 30000 });

  // Вводим сообщение
  await page.type('textarea', message);
  await page.keyboard.press('Enter');

  console.log(`✅ Сообщение отправлено: ${username} — "${message}"`);
  await browser.close();
})();
