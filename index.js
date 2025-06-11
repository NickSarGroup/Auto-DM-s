const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Очередь задач
const queue = [];

// Фейковая функция отправки (заглушка вместо Puppeteer)
async function sendDM(username, message) {
  console.log(`Pretending to send message to ${username}: ${message}`);
  await new Promise(res => setTimeout(res, 1000));
}

async function processQueue() {
  if (queue.length === 0) {
    setTimeout(processQueue, 1000);
    return;
  }

  const task = queue.shift();
  try {
    console.log(`Sending to ${task.username}`);
    await sendDM(task.username, task.message);
    console.log(`Done with ${task.username}`);
  } catch (err) {
    console.error('Error sending to', task.username, err);
  }

  setTimeout(processQueue, 1000);
}

app.post('/send-message', (req, res) => {
  const { username, message } = req.body;
  if (!username || !message) {
    return res.status(400).json({ error: 'username and message required' });
  }

  queue.push({ username, message });
  console.log(`Queued: ${username}`);
  res.json({ status: 'queued' });
});

app.get('/', (req, res) => {
  res.send('DM API is running.');
});

app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
  processQueue();
});
