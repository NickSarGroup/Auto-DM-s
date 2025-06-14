const express = require('express');
const puppeteer = require('puppeteer-core');
const fs = require('fs/promises');
const path = require('path');

const app = express();
app.use(express.json());

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; // Укажи актуальный путь к Chrome
const COOKIES_PATH = './cookies.json';

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/send', async (req, res) => {
    const { username, message } = req.body;
    console.log(`[INFO] Получен запрос: username=${username}, message=${message}`);

    const antibanDelay = 5000 + Math.random() * 3000;
    console.log(`[ANTIBAN] Задержка перед отправкой: ${(antibanDelay / 1000).toFixed(3)} секунд`);
    await delay(antibanDelay);

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: CHROME_PATH,
        args: ['--no-sandbox'],
    });

    const page = await browser.newPage();

    try {
        const cookiesString = await fs.readFile(COOKIES_PATH);
        const cookies = JSON.parse(cookiesString);
        await page.setCookie(...cookies);
        console.log('[INFO] Cookies загружены');

        const profileUrl = `https://www.instagram.com/${username}/`;
        await page.goto(profileUrl, { waitUntil: 'networkidle2' });
        console.log('[INFO] Страница пользователя загружена');

        await page.waitForSelector('div[role="button"]', { timeout: 10000 });

        console.log("[DEBUG] Ищем кнопку 'Message'");
        const messageButton = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
            return buttons.find(btn => btn.innerText.trim().toLowerCase() === 'message');
        });

        if (!messageButton) {
            console.error('[ERROR] Кнопка "Message" не найдена');
            await browser.close();
            return res.status(500).send('Message button not found');
        }

        console.log('[INFO] Кнопка "Message" найдена, кликаем по ней');
        await messageButton.click();

        await page.waitForSelector('textarea', { timeout: 10000 });
        await page.type('textarea', message, { delay: 100 });

        await page.keyboard.press('Enter');
        console.log('[INFO] Сообщение отправлено');

        await delay(3000); // Пауза перед закрытием

        await browser.close();
        res.send('Сообщение отправлено!');
    } catch (error) {
        console.error('[FATAL ERROR]', error);
        await browser.close();
        res.status(500).send('Ошибка отправки');
    }
});

app.listen(10000, () => {
    console.log('Сервер запущен на порту 10000');
});
