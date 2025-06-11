const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Очередь задач
const queue = [];

// Обработка очереди
async function processQueue() {
  if (queue.length === 0) {
    setTimeout(processQueue, 1000);
    return;
  }

  const task = queue.shift();
  try {
    console.log(`Sending to ${task.username}`);
    await sendDM(task.username, task.message);
    console.log(`Message sent to ${task.username}`);
  } catch (err) {
    console.error(`Error sending to ${task.username}:`, err);
  }

  setTimeout(processQueue, 1000);
}

// Отправка DM
async function sendDM(username, message) {
  const browser = await puppeteer.launch({
    executablePath: puppeteer.executablePath(), // критично для Render
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Здесь будет реальная логика авторизации и отправки DM в Instagram
  console.log(`Pretending to send message to ${username}: ${message}`);
  await new Promise(res => setTimeout(res, 2000));

  await browser.close();
}

// API endpoint
app.post('/send-message', (req, res) => {
  const { username, message } = req.body;
  if (!username || !message) {
    return res.status(400).json({ error: 'username and message required' });
  }

  queue.push({ username, message });
  console.log(`Queued message for ${username}`);

  res.json({ status: 'queued' });
});

// Запуск
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  processQueue();
});
