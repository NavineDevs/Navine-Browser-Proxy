const express = require('express');
const path = require('path');
const fs = require('fs');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const app = express();

const PORT = process.env.PORT || 10000;
const bareServer = createBareServer('/bare/');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve Ultraviolet files
app.use('/uv', express.static(uvPath));

// UV proxy handler - THIS IS CRITICAL
app.use('/service', (req, res, next) => {
  if (req.query.url) {
    // Handle UV proxy requests
    const targetUrl = req.query.url;
    console.log('Proxy request for:', targetUrl);
    
    // Return a page that will use UV to load the content
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Navine Proxy</title>
        <script src="/uv/uv.bundle.js"></script>
        <script src="/uv/uv.config.js"></script>
        <script>
          window.addEventListener('load', () => {
            const config = window.__uv$config;
            const encoded = config.encodeUrl('${targetUrl}');
            window.location.href = config.prefix + encoded;
          });
        </script>
      </head>
      <body>
        <p>Redirecting to ${targetUrl}...</p>
      </body>
      </html>
    `);
  } else {
    next();
  }
});

// Bare server handler
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// UV config endpoint (important for client-side)
app.get('/uv-config', (req, res) => {
  res.json({
    prefix: '/service/',
    bare: '/bare/',
    encodeUrl: 'xor',
    decodeUrl: 'xor'
  });
});

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// UV proxy route
app.get('/go', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Navine Browser - ${url}</title>
      <script src="/uv/uv.bundle.js"></script>
      <script src="/uv/uv.config.js"></script>
      <script>
        window.addEventListener('load', () => {
          const config = window.__uv$config;
          const encoded = config.encodeUrl('${url}');
          const iframe = document.createElement('iframe');
          iframe.src = config.prefix + encoded;
          iframe.style = 'width: 100%; height: 100vh; border: none;';
          document.body.appendChild(iframe);
        });
      </script>
    </head>
    <body style="margin: 0; padding: 0;">
      <p>Loading ${url}...</p>
    </body>
    </html>
  `);
});

// Static file routes
app.get('/service', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'service.html'));
});

// Catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Navine Browser running on port ${PORT}`);
  console.log(`📡 UV Proxy: http://localhost:${PORT}/uv`);
  console.log(`🔌 Bare Server: http://localhost:${PORT}/bare`);
  console.log(`🌐 Test: http://localhost:${PORT}/go?url=https://www.google.com`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
});
