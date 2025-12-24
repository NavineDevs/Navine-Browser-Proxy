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

// FIXED UV SERVICE - Single script loading
app.get('/uv/service/*', (req, res) => {
  const encoded = decodeURIComponent(req.params[0]); // FIX: Single decode
  
  console.log('UV service for (decoded):', encoded);
  
  // Serve page that loads UV scripts ONCE
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <base href="/uv/service/" />
      <title>UV Proxy</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background: #f1f3f4;
        }
        .container {
          padding: 20px;
          text-align: center;
        }
        .status {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 500px;
          margin: 50px auto;
        }
      </style>
      
      <!-- Load UV scripts ONCE -->
      <script>
        // Prevent multiple loading
        if (!window.__uv$config) {
          const uvBundle = document.createElement('script');
          uvBundle.src = '/uv/uv.bundle.js';
          uvBundle.async = false;
          document.head.appendChild(uvBundle);
          
          const uvConfig = document.createElement('script');
          uvConfig.src = '/uv/uv.config.js';
          uvConfig.async = false;
          document.head.appendChild(uvConfig);
        }
      </script>
    </head>
    <body>
      <div class="container">
        <div class="status" id="status">
          <h2>🔗 UV Proxy</h2>
          <p id="message">Initializing Ultraviolet...</p>
        </div>
      </div>
      
      <script>
        (function() {
          const statusEl = document.getElementById('status');
          const messageEl = document.getElementById('message');
          
          function updateStatus(msg) {
            messageEl.textContent = msg;
            console.log('Status:', msg);
          }
          
          function showError(error) {
            statusEl.innerHTML = 
              '<h3 style="color: #d32f2f;">Proxy Error</h3>' +
              '<p>' + error + '</p>' +
              '<a href="/" style="color: #1a73e8; text-decoration: none;">← Return to browser</a>';
          }
          
          // Wait for UV to load
          function waitForUV(callback) {
            if (window.__uv$config && window.Ultraviolet) {
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
                throw new Error('Invalid path');
              }
              
              const encodedUrl = currentPath.substring(prefix.length);
              console.log('Raw encoded:', encodedUrl);
              
              // Decode URL (already decoded by Express)
              const decodedUrl = __uv$config.decodeUrl(encodedUrl);
              console.log('Decoded URL:', decodedUrl);
              
              updateStatus('Loading: ' + decodedUrl);
              
              // Use fetch to get the page
              fetch(decodedUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              })
              .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
              })
              .then(html => {
                // Create UV instance
                const uv = new Ultraviolet({
                  prefix: prefix,
                  bare: '/bare/',
                  encodeUrl: Ultraviolet.codec.xor.encode,
                  decodeUrl: Ultraviolet.codec.xor.decode,
                  handler: '/uv/uv.handler.js',
                  bundle: '/uv/uv.bundle.js',
                  config: '/uv/uv.config.js'
                });
                
                // Rewrite HTML
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
              console.error('Setup error:', error);
              showError('Setup failed: ' + error.message);
            }
          });
        })();
      </script>
    </body>
    </html>
  `);
});

// SIMPLE REDIRECT - For testing
app.get('/uv-redirect', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  
  // Encode ONCE
  if (url.startsWith('http')) {
    // Simple base64 for testing
    const encoded = Buffer.from(url).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    res.redirect(`/uv/service/${encoded}?t=base64`);
  } else {
    res.send('Invalid URL');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Navine Browser UV Proxy
📍 Port: ${PORT}
🔗 Test: http://localhost:${PORT}/uv-redirect?url=https://google.com
🏠 Main: http://localhost:${PORT}
  `);
});
