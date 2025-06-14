const app = express();Add commentMore actions
app.use(express.json());

const randomDelay = (min, max) =>
  new Promise(resolve =>
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
  );
// Быстрая случайная задержка, минимальная, чтобы не быть "роботом"
const randomDelay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

app.post('/send-dm', async (req, res) => {
  const { username, message } = req.body;
@@ -32,6 +30,8 @@ app.post('/send-dm', async (req, res) => {
    });

    const page = await browser.newPage();

    // Меняем user-agent, чтобы быть менее подозрительным
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    const cookiesPath = './cookies.json';
@@ -49,70 +49,90 @@ app.post('/send-dm', async (req, res) => {

    await randomDelay(500, 1000);

    // Функция для фильтрации кнопок по нужным текстам без "messages" в названии
    const isValidMessageButton = (text, aria) => {
      const t = text.toLowerCase();
      const a = aria.toLowerCase();
      // только ровно "message" или "send message"
      return (t === 'message' || t === 'send message' || a === 'message' || a === 'send message');
    };
    // Ищем кнопки с ролью button на странице профиля
    const buttons = await page.$$('div[role="button"], button');

    const buttons = await page.$$('div[role="button"]');
    let messageButton = null;

    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent.trim(), btn);
      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label') || '', btn);
      // Получаем текст, aria-label и title для каждого элемента
      const [text, ariaLabel, title] = await Promise.all([
        page.evaluate(el => el.textContent.trim(), btn).catch(() => ''),
        page.evaluate(el => el.getAttribute('aria-label') || '', btn).catch(() => ''),
        page.evaluate(el => el.getAttribute('title') || '', btn).catch(() => ''),
      ]);

      const textLower = text.toLowerCase();
      const ariaLower = ariaLabel.toLowerCase();
      const titleLower = title.toLowerCase();

      console.log('[DEBUG] Кнопка:', text, 'aria-label:', ariaLabel);
      console.log('[DEBUG] Кнопка:', text, 'aria-label:', ariaLabel, 'title:', title);

      if (isValidMessageButton(text, ariaLabel)) {
      // Ищем кнопку Message или Options / More для открытия меню
      if (textLower === 'message' || ariaLower === 'message' || titleLower === 'message') {
        messageButton = btn;
        break;
      }
    }

    if (!messageButton) {
      console.log('[INFO] Пробуем нажать на три точки (Options / More)');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent.trim().toLowerCase(), btn);
        if (text === 'options' || text === 'more') {
          await btn.click();
          await randomDelay(500, 1000);

          // Меню может иметь разную структуру, пробуем разные селекторы
          const menuItems = await page.$$('div[role="dialog"] [role="button"], div[role="menuitem"]');
          for (const item of menuItems) {
            const itemText = await page.evaluate(el => el.textContent.trim().toLowerCase(), item);
            console.log('[DEBUG] Пункт меню:', itemText);
            if (itemText === 'send message') {
              messageButton = item;
              break;
            }
      if (textLower === 'options' || textLower === 'more' || ariaLower === 'options' || ariaLower === 'more' || titleLower === 'options' || titleLower === 'more') {
        console.log('[INFO] Пробуем нажать на три точки (Options / More)');
        await btn.click();
        await page.waitForTimeout(1000);

        // Попытка найти меню с ролем dialog или menu
        const menuSelector = 'div[role="dialog"], div[role="menu"]';
        await page.waitForSelector(menuSelector, { timeout: 3000 }).catch(() => {});

        // Получаем кнопки внутри меню
        const menuButtons = await page.$$(menuSelector + ' [role="button"], ' + menuSelector + ' button, ' + menuSelector + ' div[role="menuitem"]');

        let foundInMenu = null;
        for (const item of menuButtons) {
          const [itemText, itemAria, itemTitle] = await Promise.all([
            page.evaluate(el => el.textContent.trim().toLowerCase(), item).catch(() => ''),
            page.evaluate(el => el.getAttribute('aria-label') || '', item).catch(() => ''),
            page.evaluate(el => el.getAttribute('title') || '', item).catch(() => ''),
          ]);

          console.log('[DEBUG] Пункт меню:', itemText, 'aria-label:', itemAria, 'title:', itemTitle);

          if (itemText === 'send message' || itemAria.toLowerCase() === 'send message' || itemTitle.toLowerCase() === 'send message') {
            foundInMenu = item;
            break;
          }
          if (messageButton) break;
        }

        if (foundInMenu) {
          messageButton = foundInMenu;
          break;
        }

        // Если не нашли — закрываем меню (нажатием Escape)
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    if (!messageButton) {
      throw new Error('Кнопка "Message" или "Send message" не найдена.');
    }

    console.log('[INFO] Кликаем по кнопке для отправки сообщения');
    console.log('[INFO] Кнопка "Message" найдена, кликаем по ней');
    await messageButton.click();

    // Ждём появления поля ввода, либо textarea, либо contenteditable div
    // Ждем появления поля ввода сообщения
    let inputSelector;
    try {
      await page.waitForSelector('textarea, div[contenteditable="true"]', { visible: true, timeout: 8000 });
      await page.waitForSelector('textarea', { visible: true, timeout: 8000 });
      inputSelector = 'textarea';
    } catch {
      throw new Error('Поле ввода сообщения не появилось после клика по кнопке.');
      await page.waitForSelector('div[contenteditable="true"]', { visible: true, timeout: 8000 });
      inputSelector = 'div[contenteditable="true"]';
    }

    const inputSelector = (await page.$('textarea')) ? 'textarea' : 'div[contenteditable="true"]';
    await page.focus(inputSelector);

    // Вставляем сообщение через clipboard API
    // Вставляем сообщение через clipboard API + Ctrl+V
    await page.evaluate(async (msg) => {
      await navigator.clipboard.writeText(msg);
    }, message);
@@ -127,7 +147,7 @@ app.post('/send-dm', async (req, res) => {

    await page.keyboard.press('Enter');

    console.log('[INFO] Сообщение успешно отправлено');
    console.log('[INFO] Сообщение отправлено');

    res.json({ status: 'ok', message: 'Сообщение успешно отправлено' });
  } catch (error) {
