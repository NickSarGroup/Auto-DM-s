const puppeteer = require('puppeteer');
const fs = require('fs').promises;

(async () => {
  const browser = await puppeteer.launch({ headless: true }); // можно поставить false для визуализации
  const page = await browser.newPage();

  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

  // Вводим логин и пароль
  await page.type('input[name="username"]', 'nicksmartposter', { delay: 100 });
  await page.type('input[name="password"]', '0RrjZIx1q4', { delay: 100 });

  // Нажимаем кнопку логина и ждем загрузки
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ]);

  // Опционально: можно добавить ожидание, чтобы убедиться, что загрузилась главная страница
  // await page.waitForSelector('nav'); 

  // Сохраняем куки в файл
  const cookies = await page.cookies();
  await fs.writeFile('cookies.json', JSON.stringify(cookies, null, 2));

  console.log('Куки сохранены в cookies.json');

  await browser.close();
})();
