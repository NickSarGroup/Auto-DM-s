const puppeteer = require('puppeteer');

(async () => {
  const username = process.argv[2];
  const message = process.argv[3];

  if (!username || !message) {
    console.error('❌ Использование: node send.js <username> <message>');
    process.exit(1);
  }

  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
    });

    const page = await browser.newPage();

    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

    // Ждём авторизации вручную
    console.log('🔐 Войди в аккаунт Instagram вручную и нажми ENTER...');
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));

    // Переход в профиль пользователя
    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });

    // Нажимаем "Message"
    await page.waitForSelector('text/Message', { timeout: 10000 });
    await page.click('text/Message');

    // Ждём поле ввода и вводим сообщение
    await page.waitForSelector('textarea');
    await page.type('textarea', message);
    await page.keyboard.press('Enter');

    console.log(`✅ Сообщение отправлено пользователю @${username}`);

    await browser.close();
  } catch (err) {
    console.error('🚨 Произошла ошибка:', err);
  }
})();
