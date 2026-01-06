const express = require('express');
const path = require('path');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Setup Bare server
const bareServer = createBareServer('/bare/');

// 2. Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// 3. Serve Ultraviolet core files from /uv
app.use('/uv', express.static(uvPath));

// 4. Serve Bare requests
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// 5. Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uv: true, timestamp: new Date().toISOString() });
});

// 6. Default route - send main browser UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 7. Start server
app.listen(PORT, () => {
  console.log(`
=======================================
✅ Navine Browser Proxy running
🌐 http://localhost:${PORT}
📦 Static: /public
🧪 Bare: /bare/
🧠 UV: /uv/
🔁 Service Worker: /uv/service/uv.sw.js
=======================================
`);
});
