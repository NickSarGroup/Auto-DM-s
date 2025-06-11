const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Очередь задач
const queue = [];

// Функция обработки очереди
async function processQueue() {
  if (queue.length === 0) {
    setTimeout(processQueue, 1000);
    return;
  }

  const task = queue.shift();
  try {
    console.log(`Start sending to ${task.username}`);
    await sendDM(task.username, task.message);
    console.log(`Message sent to ${task.username}`);
  } catch (err) {
    console.error(`Error sending to ${task.username}:`, err);
  }

  setTimeout(processQueue, 1000);
}

// Функция "отправки" сообщения (заглушка)
async function sendDM(username, message) {
  console.log(`Pretending to send message to ${username}: ${message}`);
  await new Promise(res => setTimeout(res, 2000));
}

app.post('/send-message', (req, res) => {
  const { username, message } = req.body;
  if (!username || !message) {
    return res.status(400).json({ error: 'username and message required' });
  }

  queue.push({ username, message });
  console.log(`Queued message for ${username}`);

  res.status(200).json({ status: 'queued' });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  processQueue();
});
