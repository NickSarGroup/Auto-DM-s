const puppeteer = require('puppeteer');

const sendMessage = async (username, message) => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      userDataDir: './profile',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

    try {
      await page.waitForSelector('svg[aria-label="Direct"]', { timeout: 10000 });
    } catch (e) {
      console.log('🔑 Не авторизован. Войдите вручную в открывшемся окне.');
      await page.waitForSelector('svg[aria-label="Direct"]', { timeout: 120000 });
    }

    await page.goto(`https://www.instagram.com/direct/inbox/`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(5000);

    await page.click('svg[aria-label="New message"]');
    await page.waitForTimeout(3000);

    await page.type('input[name="queryBox"]', username, { delay: 100 });
    await page.waitForTimeout(3000);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.click('div[role="dialog"] button[type="button"]:not([disabled])');
    await page.waitForTimeout(3000);

    await page.type('textarea', message, { delay: 50 });
    await page.keyboard.press('Enter');

    console.log(`✅ Сообщение отправлено @${username}`);
    await browser.close();
  } catch (err) {
    console.error('❌ Произошла ошибка:', err);
  }
};

// Аргументы из CLI
const [, , username, ...msgParts] = process.argv;
const message = msgParts.join(' ');

if (!username || !message) {
  console.log('❌ Использование: node send.js <username> "<message>"');
  process.exit(1);
}

// Глобальные ловушки
process.on('unhandledRejection', (reason, promise) => {
  console.error('🛑 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🛑 Uncaught Exception:', err);
});

sendMessage(username, message);
