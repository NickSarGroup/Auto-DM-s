const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const cookiesPath = './cookies/nicksmartposter.json'; // путь до сохранённых куков
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
    });
    const page = await browser.newPage();

    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      await page.setCookie(...cookies);
      console.log('✅ Cookies загружены.');
    } else {
      console.log('❌ Файл cookies не найден.');
    }

    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    console.log('✅ Instagram открыт с куками');

    // НЕ закрываем браузер, чтобы ты видел результат
  } catch (err) {
    console.error('❌ Ошибка запуска:', err);
  }
})();
