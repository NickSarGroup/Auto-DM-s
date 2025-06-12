const puppeteer = require('puppeteer');

const sendMessage = async (username, message) => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './profile',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 👇 Отлавливаем все ошибки в консоли браузера и в окне страницы
  page.on('error', err => {
    console.error('🔥 Page crashed:', err);
  });

  page.on('pageerror', pageErr => {
    console.error('🔥 Page error:', pageErr);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('🔥 Console error:', msg.text());
    }
  });

  try {
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

    try {
      await page.waitForSelector('svg[aria-label="Direct"]', { timeout: 10000 });
    } catch {
      console.log('🔑 Не авторизован. Войдите вручную.');
      await page.waitForSelector('svg[aria-label="Direct"]', { timeout: 120000 });
    }

    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);

    await page.click('svg[aria-label="New message"]');
    await page.waitForTimeout(2000);

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
    console.error('❌ Основная ошибка:', err);
    await browser.close();
  }
};

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason) => {
  console.error('🧨 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

// Чтение аргументов
const [, , username, ...msgParts] = process.argv;
const message = msgParts.join(' ');

if (!username || !message) {
  console.log('❌ Использование: node send.js <username> "<сообщение>"');
  process.exit(1);
}

sendMessage(username, message);
