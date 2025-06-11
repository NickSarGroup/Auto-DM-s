const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Очередь задач (память)
const queue = [];

// Функция обработки очереди
async function processQueue() {
  if (queue.length === 0) {
    setTimeout(processQueue, 1000); // Проверяем очередь каждую секунду
    return;
  }
  
  const task = queue.shift();
  try {
    console.log(`Start sending to ${task.username}`);
    await sendDM(task.username, task.message);
    console.log(`Message sent to ${task.username}`);
  } catch (err) {
    console.error('Error sending message:', err);
  }
  
  // Следующая проверка
  setTimeout(processQueue, 1000);
}

// Puppeteer функция (упрощённая, без UI)
async function sendDM(username, message) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Здесь должен быть твой код входа в Инсту и отправки сообщения
  // Для прототипа просто логируем и ждём 2 секунды
  console.log(`Pretending to send message to ${username}: ${message}`);
  await new Promise(res => setTimeout(res, 2000));

  await browser.close();
}

app.post('/send-message', (req, res) => {
  const { username, message } = req.body;
  if (!username || !message) {
    return res.status(400).json({ error: 'username and message required' });
  }

  queue.push({ username, message });
  console.log(`Queued message for ${username}`);

  // Отвечаем сразу — задача в очереди
  res.json({ status: 'queued' });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  processQueue();
});
