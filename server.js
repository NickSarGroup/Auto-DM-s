const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

app.post('/send-dm', async (req, res) => {
  const { username, message } = req.body;
  console.log(`[INFO] Получен запрос: username=${username}, message=${message}`);

  if (!username || !message) {
    return res.status(400).json({ error: 'username и message обязательны' });
  }

  const cookiesPath = './cookies.json';
  if (!fs.existsSync(cookiesPath)) {
    console.error('[ERROR] cookies.json не найден');
    return res.status(500).json({ error: 'Файл cookies.json не найден' });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null
    });

    const page = await browser.newPage();

    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);

    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });

    await page.waitForTimeout?.(3000) || new Promise(r => setTimeout(r, 3000)); // ожидание 3 сек

    // Логируем кнопки
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      console.log('[DEBUG] Кнопка:', text);
    }

    // Ищем кнопку "Message" по тексту
    let messageButtonFound = false;
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Message') || text.includes('Сообщение')) {
        await button.click();
        messageButtonFound = true;
        break;
      }
    }

    // Альтернатива: поиск по иконке
    if (!messageButtonFound) {
      const icon = await page.$('svg[aria-label="Message"]');
      if (icon) {
        const parentBtn = await icon.evaluateHandle(el => el.closest('button'));
        if (parentBtn) {
          await parentBtn.click();
          messageButtonFound = true;
        }
      }
    }

    if (!messageButtonFound) {
      throw new Error('Кнопка "Сообщение" не найдена.');
    }

    // Вводим сообщение
    await page.waitForSelector('textarea', { visible: true, timeout: 10000 });
    await page.type('textarea', message, { delay: 50 });
    await page.keyboard.press('Enter');

    res.json({ status: 'ok', message: 'Сообщение успешно отправлено' });
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = 10000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
