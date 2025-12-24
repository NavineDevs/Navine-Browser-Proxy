const express = require('express');
const path = require('path');
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

// Handle bare server requests
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// UV SERVICE ENDPOINT - This is the main UV proxy
app.get('/uv/service/*', (req, res) => {
  // Decode the URL parameter once
  const encoded = decodeURIComponent(req.params[0]);
  
  console.log('UV service for encoded:', encoded.substring(0, 50));
  
  // Serve UV client page
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <base href="/uv/service/" />
    <title>UV Proxy</title>
    <meta charset="UTF-8">
    
    <!-- UV Configuration -->
    <script>
      // Set UV config BEFORE loading UV scripts
      window.__uv$config = {
        prefix: '/uv/service/',
        bare: '/bare/',
        encodeUrl: Ultraviolet.codec.xor.encode,
        decodeUrl: Ultraviolet.codec.xor.decode,
        handler: '/uv/uv.handler.js',
        bundle: '/uv/uv.bundle.js',
        config: '/uv/uv.config.js',
        client: '/uv/uv.client.js',
        sw: '/uv/uv.sw.js'
      };
    </script>
    
    <!-- Load UV scripts -->
    <script src="/uv/uv.bundle.js"></script>
    <script src="/uv/uv.config.js"></script>
    <script src="/uv/uv.client.js"></script>
    
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family: Arial, sans-serif;
        background: #1a1a1a;
        color: white;
        height: 100vh;
        overflow: hidden;
      }
      #uv-error {
        background: #ff4444;
        color: white;
        padding: 20px;
        margin: 20px;
        border-radius: 5px;
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="uv-error"></div>
    <div id="content">Loading UV proxy...</div>
    
    <script>
      (async function() {
        try {
          // Wait for UV to load
          while (!window.__uv$config || !window.Ultraviolet) {
            await new Promise(r => setTimeout(r, 100));
          }
          
          // Get encoded URL from path
          const path = window.location.pathname;
          const prefix = '/uv/service/';
          const encodedUrl = path.substring(prefix.length);
          
          console.log('Encoded URL:', encodedUrl);
          
          // Decode URL
          const decodedUrl = __uv$config.decodeUrl(encodedUrl);
          console.log('Decoded URL:', decodedUrl);
          
          // Create UV instance
          const uv = new UVServiceWorker();
          
          // Register service worker
          if ('serviceWorker' in navigator) {
            try {
              await navigator.serviceWorker.register('/uv/uv.sw.js', {
                scope: __uv$config.prefix
              });
              console.log('Service Worker registered');
            } catch (e) {
              console.warn('Service Worker registration failed:', e);
            }
          }
          
          // Mount UV
          await uv.mount();
          
          // Navigate to the URL
          const result = await uv.fetch(decodedUrl);
          
          if (result.ok) {
            const html = await result.text();
            const rewritten = uv.rewriteHtml(html);
            document.open();
            document.write(rewritten);
            document.close();
          } else {
            throw new Error('Failed to fetch: ' + result.status);
          }
          
        } catch (error) {
          console.error('UV Error:', error);
          document.getElementById('uv-error').style.display = 'block';
          document.getElementById('uv-error').innerHTML = 
            '<h3>UV Proxy Error</h3>' +
            '<p>' + error.message + '</p>' +
            '<p><a href="/" style="color: white; text-decoration: underline;">Return to browser</a></p>';
          document.getElementById('content').innerHTML = '';
        }
      })();
    </script>
  </body>
  </html>
  `;
  
  res.send(html);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    service: 'UV Proxy',
    timestamp: new Date().toISOString()
  });
});

// Test UV directly
app.get('/test-uv', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Test UV</title>
    <script>
      // Load UV
      const uvScript = document.createElement('script');
      uvScript.src = '/uv/uv.bundle.js';
      uvScript.onload = function() {
        const configScript = document.createElement('script');
        configScript.src = '/uv/uv.config.js';
        configScript.onload = function() {
          if (window.Ultraviolet && window.Ultraviolet.codec) {
            const encoded = Ultraviolet.codec.xor.encode('${url}');
            window.location.href = '/uv/service/' + encoded;
          }
        };
        document.head.appendChild(configScript);
      };
      document.head.appendChild(uvScript);
    </script>
  </head>
  <body>
    Testing UV redirect to ${url}...
  </body>
  </html>
  `;
  
  res.send(html);
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
========================================
🚀 UV Proxy Server
📍 Port: ${PORT}
🔗 UV Service: /uv/service/
🧪 Test: http://localhost:${PORT}/test-uv?url=https://google.com
🏠 Browser: http://localhost:${PORT}
========================================
  `);
});
