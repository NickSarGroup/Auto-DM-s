const puppeteer = require('puppeteer');
const fs = require('fs');
const express = require('express');
const app = express();
app.use(express.json());

const COOKIES_PATH = './cookies.json';

async function sendDM(username, message) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Загружаем куки
  if (fs.existsSync(COOKIES_PATH)) {
    const cookiesString = fs.readFileSync(COOKIES_PATH);
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log('[INFO] Cookies загружены');
  }

  // Открываем профиль пользователя
  const profileUrl = `https://www.instagram.com/${username}/`;
  await page.goto(profileUrl, { waitUntil: 'networkidle2' });
  console.log('[INFO] Страница пользователя загружена');

  // Лог всех кнопок на странице
  const buttons = await page.$$eval('button, a', elements =>
    elements.map(el => {
      return {
        text: el.innerText?.trim().toLowerCase(),
        ariaLabel: el.getAttribute('aria-label')?.toLowerCase(),
        title: el.getAttribute('title')?.toLowerCase()
      };
    })
  );

  for (const btn of buttons) {
    console.log(`[DEBUG] Кнопка: ${btn.text} aria-label: ${btn.ariaLabel ?? ''} title: ${btn.title ?? ''}`);
  }

  // Нажимаем на три точки (Options / More)
  const optionsHandle = await page.$x("//button[contains(., 'Options') or contains(., 'More')]");
  if (optionsHandle.length > 0) {
    console.log('[INFO] Пробуем нажать на три точки (Options / More)');
    await optionsHandle[0].click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  } else {
    throw new Error('Кнопка "Options" не найдена.');
  }

  // Ищем кнопку "Send message"
  const sendMessageButton = await page.$x("//button[contains(., 'Send message') or contains(., 'Message')]");
  if (sendMessageButton.length > 0) {
    console.log('[INFO] Кнопка "Send message" найдена, кликаем по ней');
    await sendMessageButton[0].click();
  } else {
    throw new Error('Кнопка "Message" или "Send message" не найдена после открытия меню.');
  }

  // Ждём появления поля ввода
  await page.waitForSelector('textarea', { timeout: 5000 }).catch(() => {
    throw new Error('Поле ввода сообщения не появилось.');
  });

  // Вводим сообщение и отправляем
  await page.type('textarea', message);
  await page.keyboard.press('Enter');

  console.log('[INFO] Сообщение отправлено!');
  await new Promise(resolve => setTimeout(resolve, 2000));
  await browser.close();
}

app.post('/send', async (req, res) => {
  const { username, message } = req.body;
  if (!username || !message) {
    return res.status(400).send('Username и message обязательны.');
  }

  try {
    console.log(`[INFO] Получен запрос: username=${username}, message=${message}`);
    await sendDM(username, message);
    res.status(200).send('Сообщение успешно отправлено!');
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    res.status(500).send(`Ошибка: ${error.message}`);
  }
});

const PORT = 10000;
app.listen(PORT, () => {
  console.log(`[SERVER] Сервер запущен на порту ${PORT}`);
});
