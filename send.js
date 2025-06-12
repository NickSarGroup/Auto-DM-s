const puppeteer = require('puppeteer');

(async () => {
  try {
    const usernameToDM = process.argv[2];
    const message = process.argv[3];

    if (!usernameToDM || !message) {
      console.error("❌ Usage: node send.js <username> \"<message>\"");
      process.exit(1);
    }

    // Вставь сюда свои данные для входа
    const IG_LOGIN = 'nicksmartposter';
    const IG_PASSWORD = '0RrjZIx1q4';

    const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    console.log("🟡 Открываю Instagram и пытаюсь залогиниться...");
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

    // Ждем загрузки полей логина
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    // Вводим логин и пароль
    await page.type('input[name="username"]', IG_LOGIN, { delay: 100 });
    await page.type('input[name="password"]', IG_PASSWORD, { delay: 100 });

    // Жмем кнопку входа
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    // Игнорируем "Сохранить логин?" и "Включить уведомления" если появляются
    try {
      await page.waitForSelector('button.sqdOP.yWX7d.y3zKF', { timeout: 5000 });
      await page.click('button.sqdOP.yWX7d.y3zKF'); // "Не сейчас"
    } catch {}

    try {
      await page.waitForSelector('button.aOOlW.HoLwm', { timeout: 5000 });
      await page.click('button.aOOlW.HoLwm'); // "Не сейчас"
    } catch {}

    // Переходим в директ по адресу пользователя
    const dmUrl = `https://www.instagram.com/direct/new/?username=${usernameToDM}`;
    console.log(`🟡 Переходим в директ пользователя ${usernameToDM}...`);
    await page.goto(dmUrl, { waitUntil: 'networkidle2' });

    // Ждем текстовое поле для ввода сообщения
    await page.waitForSelector('textarea[placeholder="Сообщение..."], textarea[placeholder="Message..."]', { timeout: 10000 });

    // Вводим сообщение
    await page.type('textarea[placeholder="Сообщение..."], textarea[placeholder="Message..."]', message, { delay: 50 });

    // Жмем отправить (кнопка "Отправить" — type=submit в форме)
    await page.click('button[type="submit"]');

    console.log(`✅ Сообщение отправлено пользователю ${usernameToDM}`);

    // Оставляем браузер открытым, чтобы можно было видеть результат
    // await browser.close();

  } catch (err) {
    console.error("❌ Ошибка при выполнении:", err);
    process.exit(1);
  }
})();
