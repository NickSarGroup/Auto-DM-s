app.post(['/send', '/send-dm'], async (req, res) => {
  const { username, message } = req.body;
  console.log(`[INFO] Получен запрос: username=${username}, message=${message}`);

  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Загрузка cookies
    const cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf-8'));
    await page.setCookie(...cookies);
    console.log('[INFO] Cookies загружены');

    // Переход на страницу пользователя
    await page.goto(`https://www.instagram.com/${username}`, { waitUntil: 'networkidle2' });
    console.log('[INFO] Страница пользователя загружена');

    // Поиск кнопки Message
    const buttons = await page.$$('button, a');

    let messageButton = null;

    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText, btn);
      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), btn);
      const title = await page.evaluate(el => el.getAttribute('title'), btn);

      console.log('[DEBUG] Кнопка:', { text, ariaLabel, title });

      if (
        text?.toLowerCase().includes('message') ||
        ariaLabel?.toLowerCase().includes('message') ||
        title?.toLowerCase().includes('message')
      ) {
        messageButton = btn;
        break;
      }
    }

    if (!messageButton) {
      throw new Error('Кнопка "Message" не найдена.');
    }

    await messageButton.click();
    console.log('[INFO] Кнопка "Message" нажата');

    await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 10000 });
    const textArea = await page.$('textarea, [contenteditable="true"]');

    if (!textArea) throw new Error('Поле ввода не найдено');

    await textArea.type(message, { delay: 100 });
    await textArea.press('Enter');

    console.log('[INFO] Сообщение отправлено');

    await page.waitForTimeout?.(2000); // с последними версиями puppeteer нужен check
    await browser.close();
    res.send({ success: true });
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    res.status(500).send({ error: error.message });
  }
});
