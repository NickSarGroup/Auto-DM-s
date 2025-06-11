const express = require('express');
const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Очередь задач
const queue = [];

async function processQueue() {
  if (queue.length === 0) return setTimeout(processQueue, 1000);

  const task = queue.shift();
  try {
    console.log(`Sending to ${task.username}`);
    await sendDM(task.username, task.message);
    console.log(`Sent to ${task.username}`);
  } catch (err) {
    console.error(`Error sending to ${task.username}:`, err);
  }

  setTimeout(processQueue, 1000);
}

// Отправка сообщения
async function sendDM(username, message) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath || '/usr/bin/chromium-browser',
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  // Тут логика логина и отправки в Instagram — пока просто заглушка:
  console.log(`Pretending to send message to @${username}: ${message}`);
  await new Promise(res => setTimeout(res, 2000));

  await browser.close();
}

// POST endpoint
app.post('/send-message', (req, res) => {
  const { username, message } = req.body;
  if (!username || !message) {
    return res.status(400).json({ error: 'username and message required' });
  }

  queue.push({ username, message });
  console.log(`Queued message for ${username}`);
  res.json({ status: 'queued' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  processQueue();
});
