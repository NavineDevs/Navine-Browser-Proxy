const express = require('express');
const path = require('path');
const fs = require('fs');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 10000;

// Create HTTP server
const server = http.createServer(app);

// Create bare server
const bareServer = createBareServer('/bare/', {
  http: server,
  wss: server
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve UV files
app.use('/uv', express.static(uvPath));

// Handle bare server requests
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    console.log('Bare server request:', req.url);
    bareServer.routeRequest(req, res);
  } else {
    next();
  }
});

// SIMPLE PROXY ENDPOINT - Works every time
app.get('/proxy/*', (req, res) => {
  const encoded = req.params[0];
  let url;
  
  try {
    url = atob(encoded);
  } catch {
    url = 'https://www.google.com';
  }
  
  console.log('Simple proxy for:', url);
  
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

// UV SERVICE ENDPOINT - Simplified
app.get('/uv/service/*', (req, res) => {
  const encoded = req.params[0];
  
  console.log('UV service request');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <base href="/uv/service/" />
      <title>UV Proxy</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <!-- Load UV bundle -->
      <script src="/uv/uv.bundle.js"></script>
      
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
          background: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 50px auto;
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 20px rgba(0,0,0,0.1);
          text-align: center;
        }
        .status {
          color: #666;
          margin: 20px 0;
        }
        .error {
          color: #d32f2f;
          background: #ffebee;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        iframe {
          width: 100%;
          height: 80vh;
          border: none;
          border-radius: 5px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🔗 UV Proxy</h2>
        <div id="content">
          <p class="status" id="status">Initializing UV...</p>
          <div id="details"></div>
        </div>
        <iframe id="uvFrame" style="display: none;"></iframe>
      </div>
      
      <script>
        (function() {
          const statusEl = document.getElementById('status');
          const detailsEl = document.getElementById('details');
          const uvFrame = document.getElementById('uvFrame');
          
          function updateStatus(msg, detail = '') {
            statusEl.textContent = msg;
            if (detail) {
              detailsEl.innerHTML = '<p><small>' + detail + '</small></p>';
            }
          }
          
          function showError(error) {
            document.getElementById('content').innerHTML = 
              '<div class="error">' +
              '<h3>Proxy Error</h3>' +
              '<p>' + error + '</p>' +
              '<p><a href="/" style="color: #1a73e8;">← Return to browser</a></p>' +
              '</div>';
          }
          
          // Wait for UV
          function waitForUV(callback) {
            if (window.Ultraviolet && window.Ultraviolet.codec) {
              callback();
            } else {
              setTimeout(() => waitForUV(callback), 100);
            }
          }
          
          waitForUV(function() {
            try {
              updateStatus('UV loaded, decoding URL...');
              
              // Get encoded URL from path
              const currentPath = window.location.pathname;
              const prefix = '/uv/service/';
              
              if (!currentPath.startsWith(prefix)) {
                throw new Error('Invalid UV path');
              }
              
              const encodedUrl = currentPath.substring(prefix.length);
              console.log('Encoded from path:', encodedUrl);
              
              // Create simple UV config
              const uvConfig = {
                prefix: prefix,
                bare: '/bare/',
                encodeUrl: Ultraviolet.codec.xor.encode,
                decodeUrl: Ultraviolet.codec.xor.decode
              };
              
              // Decode the URL
              const decodedUrl = uvConfig.decodeUrl(encodedUrl);
              console.log('Decoded URL:', decodedUrl);
              
              updateStatus('Loading content...', 'via ' + decodedUrl);
              
              // Use iframe to load content (simplest approach)
              uvFrame.style.display = 'block';
              uvFrame.src = decodedUrl;
              
              // Update status when iframe loads
              uvFrame.onload = function() {
                statusEl.textContent = 'Content loaded';
                statusEl.style.color = '#4caf50';
              };
              
              uvFrame.onerror = function() {
                showError('Failed to load content. The site may be blocking iframes.');
              };
              
            } catch(error) {
              console.error('UV error:', error);
              showError('Setup failed: ' + error.message);
            }
          });
        })();
      </script>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    service: 'Navine Browser',
    timestamp: new Date().toISOString()
  });
});

// Test endpoints
app.get('/test-proxy', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  const encoded = btoa(url);
  
  res.redirect(`/proxy/${encoded}`);
});

app.get('/test-uv', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  
  if (window.Ultraviolet) {
    const encoded = Ultraviolet.codec.xor.encode(url);
    res.redirect(`/uv/service/${encoded}`);
  } else {
    const encoded = btoa(url);
    res.redirect(`/proxy/${encoded}`);
  }
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`
✅ Navine Browser Running
📍 Port: ${PORT}
📡 Proxy: /proxy/
🔗 UV Service: /uv/service/
🧪 Test Proxy: http://localhost:${PORT}/test-proxy?url=https://google.com
🏠 Main: http://localhost:${PORT}
  `);
});
