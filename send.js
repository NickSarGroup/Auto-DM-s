const puppeteer = require('puppeteer');

const sendMessage = async (username, message) => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './profile',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 🔥 Ловим ВСЕ возможные ошибки
  page.on('error', err => console.error('[Page crash]', err));
  page.on('pageerror', err => console.error('[Page error]', err));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[Console error]', msg.text());
    }
  });
  browser.on('disconnected', () => {
    console.error('[Browser disconnected]');
  });

  try {
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

    try {
      await page.waitForSelector('svg[aria-label="Direct"]', { timeout: 10000 });
    } catch {
      console.log('🔐 Вход не выполнен. Войдите вручную и дождитесь иконки Direct.');
      await page.waitForSelector('svg[aria-label="Direct"]', { timeout: 120000 });
    }

    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    await page.click('svg[aria-label="New message"]');
    await page.waitForTimeout(1000);

    await page.type('input[name="queryBox"]', username, { delay: 100 });
    await page.waitForTimeout(2000);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.click('div[role="dialog"] button[type="button"]:not([disabled])');
    await page.waitForTimeout(2000);

    await page.type('textarea', message, { delay: 50 });
    await page.keyboard.press('Enter');

    console.log(`✅ Сообщение отправлено @${username}`);
    await browser.close();
  } catch (err) {
    console.error('❌ Ошибка в процессе:', err);
    await browser.close();
  }
};

// 👇 Ловим ВСЕ необработанные ошибки (включая WebSocket и Chromium low-level)
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

// Аргументы
const [, , username, ...msgParts] = process.argv;
const message = msgParts.join(' ');

if (!username || !message) {
  console.log('❌ Использование: node send.js <username> "<сообщение>"');
  process.exit(1);
}

sendMessage(username, message);
