const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
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

// Handle bare server
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// UV SERVICE ENDPOINT - Proper UV client page
app.get('/uv/service/*', (req, res) => {
  const encoded = req.params[0];
  
  console.log('UV service endpoint called');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <base href="/uv/service/" />
      <title>UV Proxy</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <!-- UV Scripts - Loaded once -->
      <script>
        // Load UV scripts if not already loaded
        function loadUVScripts() {
          return new Promise((resolve) => {
            if (window.__uv$config && window.Ultraviolet) {
              resolve();
              return;
            }
            
            const scripts = [
              '/uv/uv.bundle.js',
              '/uv/uv.config.js',
              '/uv/uv.client.js'
            ];
            
            let loaded = 0;
            
            scripts.forEach(src => {
              const script = document.createElement('script');
              script.src = src;
              script.onload = () => {
                loaded++;
                if (loaded === scripts.length) {
                  // Update config for our setup
                  if (window.__uv$config) {
                    window.__uv$config.prefix = '/uv/service/';
                    window.__uv$config.bare = '/bare/';
                    window.__uv$config.encodeUrl = Ultraviolet.codec.xor.encode;
                    window.__uv$config.decodeUrl = Ultraviolet.codec.xor.decode;
                    window.__uv$config.handler = '/uv/uv.handler.js';
                    window.__uv$config.bundle = '/uv/uv.bundle.js';
                    window.__uv$config.config = '/uv/uv.config.js';
                  }
                  resolve();
                }
              };
              script.onerror = () => {
                console.error('Failed to load:', src);
                loaded++;
                if (loaded === scripts.length) resolve();
              };
              document.head.appendChild(script);
            });
          });
        }
        
        // Start loading UV
        loadUVScripts();
      </script>
      
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .loading {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 20px rgba(0,0,0,0.1);
          max-width: 500px;
        }
        .error {
          color: #d32f2f;
          background: #ffebee;
          padding: 20px;
          border-radius: 5px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="loading" id="loading">
        <h2>🔗 UV Proxy</h2>
        <p id="status">Loading Ultraviolet...</p>
        <div id="progress"></div>
      </div>
      
      <script>
        (async function() {
          try {
            // Wait for UV to load
            while (!window.__uv$config || !window.Ultraviolet) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            document.getElementById('status').textContent = 'UV loaded, processing...';
            
            // Get encoded URL from path
            const currentPath = window.location.pathname;
            const prefix = '/uv/service/';
            
            if (!currentPath.startsWith(prefix)) {
              throw new Error('Invalid UV path');
            }
            
            const encodedUrl = currentPath.substring(prefix.length);
            console.log('Encoded URL:', encodedUrl);
            
            // Decode URL
            const decodedUrl = __uv$config.decodeUrl(encodedUrl);
            console.log('Decoded URL:', decodedUrl);
            
            document.getElementById('status').textContent = 'Loading: ' + decodedUrl;
            
            // Initialize UV
            const uv = new Ultraviolet(__uv$config);
            
            // Create a fetch that uses UV's proxy system
            // This bypasses CORS by going through the bare server
            const response = await uv.fetch(decodedUrl, {
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br'
              }
            });
            
            if (!response.ok) {
              throw new Error('HTTP ' + response.status);
            }
            
            const html = await response.text();
            
            // Rewrite the HTML
            const rewritten = uv.rewriteHtml(html, {
              document: window.document,
              url: decodedUrl
            });
            
            // Apply to page
            document.open();
            document.write(rewritten);
            document.close();
            
          } catch(error) {
            console.error('UV Proxy Error:', error);
            document.getElementById('loading').innerHTML = 
              '<div class="error">' +
              '<h3>Proxy Error</h3>' +
              '<p>' + error.message + '</p>' +
              '<p>Try <a href="/">returning to the browser</a></p>' +
              '</div>';
          }
        })();
      </script>
    </body>
    </html>
  `);
});

// SIMPLE PROXY - Works with CORS
app.get('/proxy/*', (req, res) => {
  const encoded = req.params[0];
  let url;
  
  try {
    url = atob(encoded);
  } catch {
    url = 'https://www.google.com/search?q=' + encodeURIComponent(encoded);
  }
  
  console.log('Simple proxy for:', url);
  
  // Forward through bare server to avoid CORS
  const bareUrl = `/bare/${Buffer.from(url).toString('base64')}`;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${new URL(url).hostname}</title>
      <style>
        body, html { margin: 0; padding: 0; overflow: hidden; height: 100%; }
        iframe { width: 100%; height: 100%; border: none; }
      </style>
    </head>
    <body>
      <iframe 
        src="${bareUrl}"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        allow="fullscreen"
        referrerpolicy="no-referrer">
      </iframe>
    </body>
    </html>
  `);
});

// BARE PROXY ENDPOINT
app.get('/bare/*', (req, res) => {
  const encoded = req.params[0];
  let url;
  
  try {
    url = atob(encoded);
  } catch {
    url = 'https://www.google.com';
  }
  
  // Proxy through bare server
  bareServer.handleRequest(req, res);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    service: 'Navine Browser',
    uv: true,
    bare: true
  });
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
========================================
🚀 Navine Browser - Fixed CORS
📍 Port: ${PORT}
📡 UV Service: /uv/service/
🔌 Bare Server: /bare/
⚡ Simple Proxy: /proxy/
🏠 Browser: http://localhost:${PORT}
========================================
  `);
});
