const express = require('express');
const path = require('path');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const app = express();

const PORT = process.env.PORT || 10000;
const bareServer = createBareServer('/bare/');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve Ultraviolet files
app.use('/uv', express.static(uvPath));

// Bare server handler
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// UV PROXY ROUTE - This is the key fix!
app.get('/service/*', (req, res) => {
  // Get the encoded URL from the path
  const encodedPath = req.params[0];
  
  // Serve the UV client page that will decode and load the URL
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ultraviolet Proxy</title>
      <script src="/uv/uv.bundle.js"></script>
      <script src="/uv/uv.config.js"></script>
      <script>
        // This script runs in the iframe to proxy the site
        document.addEventListener('DOMContentLoaded', function() {
          try {
            const config = window.__uv$config;
            const url = config.decodeUrl(location.pathname.replace(config.prefix, ''));
            
            // Create a script that will fetch and rewrite the page
            const script = document.createElement('script');
            script.src = '/uv/uv.handler.js';
            script.onload = function() {
              window.navigate?.(url);
            };
            document.head.appendChild(script);
            
          } catch(err) {
            console.error('UV Error:', err);
            document.body.innerHTML = '<h1>Proxy Error</h1><p>' + err.message + '</p>';
          }
        });
      </script>
    </head>
    <body>
      <div style="padding: 20px; text-align: center;">
        <h2>Loading proxied content...</h2>
        <p>If this takes too long, check the console for errors.</p>
      </div>
    </body>
    </html>
  `);
});

// Simple proxy test route
app.get('/proxy-test', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Proxy Test - ${url}</title>
      <script src="/uv/uv.bundle.js"></script>
      <script src="/uv/uv.config.js"></script>
    </head>
    <body>
      <h1>Direct Proxy Test</h1>
      <p>Testing proxy for: ${url}</p>
      <script>
        if (window.__uv$config) {
          const encoded = __uv$config.encodeUrl('${url}');
          window.location.href = __uv$config.prefix + encoded;
        } else {
          document.body.innerHTML += '<p style="color: red;">UV not loaded!</p>';
        }
      </script>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', time: new Date().toISOString() });
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// All other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Server Error: ' + err.message);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 UV: http://localhost:${PORT}/uv`);
  console.log(`🔌 Bare: http://localhost:${PORT}/bare`);
  console.log(`🌐 Home: http://localhost:${PORT}`);
  console.log(`🧪 Test: http://localhost:${PORT}/proxy-test?url=https://www.google.com`);
});
