const puppeteer = require('puppeteer');

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('🔥 [uncaughtException]', err);
});

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
    console.log('🔐 Войди в Instagram вручную и нажми ENTER...');
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));

    // Переход к нужному пользователю
    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });

    // Нажимаем "Message"
    await page.waitForSelector('text/Message', { timeout: 10000 });
    await page.click('text/Message');

    // Вводим сообщение
    await page.waitForSelector('textarea');
    await page.type('textarea', message);
    await page.keyboard.press('Enter');

    console.log(`✅ Сообщение отправлено пользователю @${username}`);
    await browser.close();
  } catch (err) {
    console.error('🚨 Ошибка внутри try/catch:', err);
  }
})();
