const express = require('express');
const path = require('path');
const fs = require('fs');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');

const app = express();
const PORT = process.env.PORT || 10000;

// Create bare server
const bareServer = createBareServer('/bare/');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve UV files
app.use('/uv', express.static(uvPath));

// Handle bare requests
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// UV CONFIG ENDPOINT - Provide config to frontend
app.get('/uv-config.json', (req, res) => {
  res.json({
    prefix: '/service/',
    bare: '/bare/',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: '/uv/uv.handler.js',
    client: '/uv/uv.client.js',
    bundle: '/uv/uv.bundle.js',
    config: '/uv/uv.config.js',
    sw: '/uv/uv.sw.js'
  });
});

// UV PROXY ENDPOINT - This handles actual proxying
app.get('/service/*', async (req, res) => {
  try {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <base href="/service/" />
      <script src="/uv/uv.bundle.js"></script>
      <script>
        // Initialize UV
        const uv = new UVServiceWorker();
        uv.mount();
      </script>
    </head>
    <body>
      <div id="uv-error" style="display: none; padding: 20px; background: #fee; color: #900;">
        <h3>Proxy Error</h3>
        <p id="error-message"></p>
      </div>
      <script>
        try {
          // Get the encoded URL from the path
          const path = window.location.pathname;
          const prefix = '/service/';
          const encoded = path.substring(prefix.length);
          
          // Decode and navigate
          const url = Ultraviolet.codec.xor.decode(encoded);
          console.log('Proxying to:', url);
          
          // Use UV to fetch and rewrite the page
          fetch(url)
            .then(response => response.text())
            .then(html => {
              // UV should handle the rewriting automatically
              document.open();
              document.write(html);
              document.close();
            })
            .catch(err => {
              document.getElementById('error-message').textContent = err.message;
              document.getElementById('uv-error').style.display = 'block';
            });
        } catch(err) {
          document.getElementById('error-message').textContent = err.message;
          document.getElementById('uv-error').style.display = 'block';
        }
      </script>
    </body>
    </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).send(`Proxy Error: ${error.message}`);
  }
});

// SIMPLE PROXY - Alternative method
app.get('/go', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loading ${url}</title>
      <script src="/uv/uv.bundle.js"></script>
      <script src="/uv/uv.config.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          if (window.__uv$config && Ultraviolet) {
            try {
              const encoded = Ultraviolet.codec.xor.encode('${url}');
              window.location.href = __uv$config.prefix + encoded;
            } catch(e) {
              document.body.innerHTML = '<h1>Error</h1><p>' + e.message + '</p>';
            }
          } else {
            document.body.innerHTML = '<h1>UV not loaded</h1>';
          }
        });
      </script>
    </head>
    <body>
      Loading ${url}...
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test if UV files exist
app.get('/test-uv', (req, res) => {
  const files = [
    '/uv/uv.bundle.js',
    '/uv/uv.config.js',
    '/uv/uv.client.js',
    '/uv/uv.handler.js',
    '/uv/uv.sw.js'
  ];
  
  const results = files.map(file => {
    const fullPath = path.join(uvPath, file.replace('/uv/', ''));
    return {
      file,
      exists: fs.existsSync(fullPath),
      path: fullPath
    };
  });
  
  res.json(results);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Test UV: http://localhost:${PORT}/test-uv`);
  console.log(`🌐 Direct test: http://localhost:${PORT}/go?url=https://www.google.com`);
  console.log(`🏠 Main page: http://localhost:${PORT}`);
});
