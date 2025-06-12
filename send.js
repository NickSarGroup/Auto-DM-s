const puppeteer = require('puppeteer');
const fs = require('fs');

const USERNAME = 'nicksmartposter';
const cookiesPath = `cookies/${USERNAME}.json`;

async function sendDM(targetUsername, message) {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  const cookies = JSON.parse(fs.readFileSync(cookiesPath));
  await page.setCookie(...cookies);

  await page.goto(`https://www.instagram.com/direct/t/${targetUsername}/`, { waitUntil: 'networkidle2' });

  await page.waitForSelector('textarea', { timeout: 15000 });
  await page.type('textarea', message, { delay: 100 });
  await page.keyboard.press('Enter');

  console.log(`✅ Сообщение "${message}" отправлено @${targetUsername}`);
  await browser.close();
}

// Аргументы командной строки: node send.js target message
const [,, target, ...msgParts] = process.argv;
const message = msgParts.join(' ');

if (!target || !message) {
  console.error('❌ Использование: node send.js <username> <message>');
  process.exit(1);
}

sendDM(target, message);
