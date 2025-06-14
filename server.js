const puppeteer = require('puppeteer');

async function clickSendMessage(page) {
  // Селектор кнопки "Options" (три точки)
  const optionsSelector = 'button[aria-label="Options"], button[aria-label="More"]'; // подкорректируй под Instagram

  const optionsBtn = await page.$(optionsSelector);
  if (optionsBtn) {
    console.log('[INFO] Нажимаем на три точки (Options / More)');
    await optionsBtn.click();
    await page.waitForTimeout(1000); // ждем появления меню

    // Ищем кнопку "Send message" в меню
    const menuButtons = await page.$$('button');
    for (const btn of menuButtons) {
      const text = await page.evaluate(el => el.textContent.trim().toLowerCase(), btn);
      if (text === 'send message') {
        console.log('[INFO] Кнопка "Send message" найдена в меню, нажимаем');
        await btn.click();
        await page.waitForTimeout(1000);
        return;
      }
    }

    console.log('[INFO] Кнопка "Send message" в меню не найдена, закрываем меню');
    // Закрыть меню (клик вне меню)
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);
  } else {
    console.log('[INFO] Кнопка "Options" не найдена, пропускаем открытие меню');
  }

  // Ищем кнопку "Send message" на странице напрямую
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent.trim().toLowerCase(), btn);
    if (text === 'send message') {
      console.log('[INFO] Кнопка "Send message" найдена на странице, нажимаем');
      await btn.click();
      await page.waitForTimeout(1000);
      return;
    }
  }

  throw new Error('Кнопка "Send message" не найдена ни в меню, ни на странице');
}

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // для отладки
  const page = await browser.newPage();

  // Переходим на страницу пользователя (замени на нужную)
  const username = 'denebis.ai';
  const url = `https://www.instagram.com/${username}/`;
  console.log(`[INFO] Загружаем страницу: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Здесь можешь добавить загрузку cookies, если нужно

  // Ждем появления кнопок, например Follow или Options
  await page.waitForTimeout(2000);

  try {
    await clickSendMessage(page);
    console.log('[SUCCESS] Кнопка Send message нажата успешно!');
  } catch (err) {
    console.error('[ERROR]', err.message);
  }

  // Можно добавить дальнейшую логику, например отправку сообщения

  // await browser.close();
})();
