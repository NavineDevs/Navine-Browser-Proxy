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

// Handle bare server
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// UV SERVICE ENDPOINT - Simple and reliable
app.get('/uv/service/*', (req, res) => {
  const encoded = req.params[0];
  
  console.log('UV service request for:', encoded.substring(0, 50));
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <base href="/uv/service/" />
      <title>UV Proxy</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <!-- Load UV bundle FIRST -->
      <script src="/uv/uv.bundle.js"></script>
      
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          text-align: center;
        }
        .container {
          max-width: 600px;
          margin: 50px auto;
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 20px rgba(0,0,0,0.1);
        }
        .loading {
          color: #666;
        }
        .error {
          color: #d32f2f;
          background: #ffebee;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div id="content">
          <h2>🔗 UV Proxy</h2>
          <p class="loading" id="status">Initializing...</p>
          <div id="details"></div>
        </div>
      </div>
      
      <script>
        (function() {
          const statusEl = document.getElementById('status');
          const detailsEl = document.getElementById('details');
          
          function updateStatus(msg, detail = '') {
            statusEl.textContent = msg;
            if (detail) {
              detailsEl.innerHTML = '<p><small>' + detail + '</small></p>';
            }
            console.log('UV Status:', msg);
          }
          
          function showError(error) {
            document.getElementById('content').innerHTML = 
              '<div class="error">' +
              '<h3>Proxy Error</h3>' +
              '<p>' + error + '</p>' +
              '<p><a href="/" style="color: #1a73e8;">← Return to browser</a></p>' +
              '</div>';
          }
          
          // Wait for Ultraviolet to be available
          function waitForUV(callback) {
            if (window.Ultraviolet && window.Ultraviolet.codec) {
              callback();
            } else {
              setTimeout(() => waitForUV(callback), 100);
            }
          }
          
          waitForUV(function() {
            try {
              updateStatus('UV loaded, processing URL...');
              
              // Get current path
              const currentPath = window.location.pathname;
              const prefix = '/uv/service/';
              
              if (!currentPath.startsWith(prefix)) {
                throw new Error('Invalid UV service path');
              }
              
              const encodedUrl = currentPath.substring(prefix.length);
              console.log('Encoded from path:', encodedUrl);
              
              // Create UV configuration
              const uvConfig = {
                prefix: prefix,
                bare: '/bare/',
                encodeUrl: Ultraviolet.codec.xor.encode,
                decodeUrl: Ultraviolet.codec.xor.decode,
                handler: '/uv/uv.handler.js',
                bundle: '/uv/uv.bundle.js',
                config: '/uv/uv.config.js',
                client: '/uv/uv.client.js'
              };
              
              // Decode the URL
              const decodedUrl = uvConfig.decodeUrl(encodedUrl);
              console.log('Decoded URL:', decodedUrl);
              
              updateStatus('Loading: ' + decodedUrl, 'via UV proxy');
              
              // Create UV instance
              const uv = new Ultraviolet(uvConfig);
              
              // Load the page through bare server
              const bareRequest = new Request(decodedUrl, {
                method: 'GET',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
              });
              
              // Use fetch with the bare server
              fetch('/bare/' + btoa(decodedUrl))
                .then(response => {
                  if (!response.ok) throw new Error('HTTP ' + response.status);
                  return response.text();
                })
                .then(html => {
                  // Rewrite HTML using UV
                  const rewritten = uv.rewriteHtml(html, {
                    document: window.document,
                    url: decodedUrl
                  });
                  
                  document.open();
                  document.write(rewritten);
                  document.close();
                })
                .catch(error => {
                  showError('Failed to load: ' + error.message);
                });
                
            } catch(error) {
              console.error('UV setup error:', error);
              showError('Setup failed: ' + error.message);
            }
          });
        })();
      </script>
    </body>
    </html>
  `);
});

// DIRECT BARE PROXY - Simple and works
app.get('/bare-proxy/*', (req, res) => {
  const encoded = req.params[0];
  let url;
  
  try {
    url = atob(encoded);
  } catch {
    url = 'https://www.google.com';
  }
  
  console.log('Bare proxy for:', url);
  
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
        src="${url}"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        allow="fullscreen"
        referrerpolicy="no-referrer">
      </iframe>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Navine Browser' });
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
✅ Navine Browser Running
📍 Port: ${PORT}
📡 UV: /uv/service/
🔌 Bare: /bare/
🏠 Main: http://localhost:${PORT}
  `);
});
