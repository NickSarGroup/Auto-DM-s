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

    // Проверка: авторизован ли пользователь
    try {
      await page.waitForSelector('svg[aria-label="Direct"]', { timeout: 10000 });
    } catch (e) {
      console.log('🔑 Не авторизован. Войдите вручную в появившемся окне и не закрывайте его.');
      await page.waitForSelector('svg[aria-label="Direct"]', { timeout: 120000 });
    }

    // Переход в директ
    await page.goto(`https://www.instagram.com/direct/inbox/`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(5000);

    // Кнопка "Написать сообщение"
    await page.click('svg[aria-label="New message"]');
    await page.waitForTimeout(3000);

    // Ввод юзернейма
    await page.type('input[name="queryBox"]', username, { delay: 100 });
    await page.waitForTimeout(3000);

    // Клик по имени
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Кнопка "Далее"
    await page.click('div[role="dialog"] button[type="button"]:not([disabled])');
    await page.waitForTimeout(3000);

    // Ввод текста сообщения
    await page.type('textarea', message, { delay: 50 });
    await page.keyboard.press('Enter');

    console.log(`✅ Сообщение "${message}" отправлено пользователю @${username}`);
    await browser.close();
  } catch (err) {
    console.error('❌ Произошла ошибка:', err);
  }
};

// Получение аргументов из командной строки
const [, , username, ...msgParts] = process.argv;
const message = msgParts.join(' ');

if (!username || !message) {
  console.log('❌ Использование: node send.js <username> "<message>"');
  process.exit(1);
}

sendMessage(username, message);
