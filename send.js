const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const cookiesPath = './cookies.json';

(async () => {
  try {
    const usernameToDM = process.argv[2];
    const message = process.argv[3];

    if (!usernameToDM || !message) {
      console.error("❌ Usage: node send.js <username> \"<message>\"");
      process.exit(1);
    }

    const IG_LOGIN = 'nicksmartposter';  // Твой логин
    const IG_PASSWORD = '0RrjZIx1q4';    // Твой пароль

    const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    // Попытка загрузить куки
    try {
      const cookiesString = await fs.readFile(cookiesPath);
      const cookies = JSON.parse(cookiesString);
      await page.setCookie(...cookies);
      console.log("✅ Загружены куки из файла");
    } catch {
      console.log("⚠️ Файл куки не найден, будет выполнен логин");
    }

    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

    // Проверяем, залогинен ли уже пользователь (например, есть кнопка "Профиль")
    const loggedIn = await page.evaluate(() => {
      return !!document.querySelector('svg[aria-label="Профиль"]');
    });

    if (!loggedIn) {
      console.log("🟡 Логинюсь в Instagram...");
      await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[name="username"]', { timeout: 10000 });
      await page.type('input[name="username"]', IG_LOGIN, { delay: 100 });
      await page.type('input[name="password"]', IG_PASSWORD, { delay: 100 });
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);

      // Сохраняем куки в файл
      const cookies = await page.cookies();
      await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
      console.log("✅ Куки сохранены в файл");
      
      // Игнорируем "Сохранить логин?" и "Включить уведомления"
      try {
        await page.waitForSelector('button.sqdOP.yWX7d.y3zKF', { timeout: 5000 });
        await page.click('button.sqdOP.yWX7d.y3zKF');
      } catch {}
      try {
        await page.waitForSelector('button.aOOlW.HoLwm', { timeout: 5000 });
        await page.click('button.aOOlW.HoLwm');
      } catch {}
    } else {
      console.log("✅ Уже залогинен, продолжаем...");
    }

    const dmUrl = `https://www.instagram.com/direct/new/?username=${usernameToDM}`;
    console.log(`🟡 Переходим в директ пользователя ${usernameToDM}...`);
    await page.goto(dmUrl, { waitUntil: 'networkidle2' });

    await page.waitForSelector('textarea[placeholder="Сообщение..."], textarea[placeholder="Message..."]', { timeout: 10000 });
    await page.type('textarea[placeholder="Сообщение..."], textarea[placeholder="Message..."]', message, { delay: 50 });
    await page.click('button[type="submit"]');

    console.log(`✅ Сообщение отправлено пользователю ${usernameToDM}`);

    await browser.close();

  } catch (err) {
    console.error("❌ Ошибка при выполнении:", err);
    process.exit(1);
  }
})();
