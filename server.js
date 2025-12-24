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

// UV service endpoint - Proper implementation
app.get('/service/*', (req, res) => {
  // Get the encoded part
  const encoded = req.params[0];
  
  console.log('UV Service request for:', encoded);
  
  // Serve a page that will use UV to decode and load
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <base href="/service/" />
      <script src="/uv/uv.bundle.js"></script>
      <script src="/uv/uv.config.js"></script>
      <link rel="stylesheet" href="/uv/uv.css">
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
          background: #f5f5f5;
        }
        .loading {
          text-align: center;
          padding: 40px;
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
      <div id="app">
        <div class="loading">
          <h2>Loading via UV Proxy...</h2>
          <p>Please wait while we connect to the destination.</p>
        </div>
      </div>
      
      <script>
        (function() {
          try {
            // Check if UV is loaded
            if (!window.__uv$config) {
              throw new Error('UV configuration not loaded');
            }
            
            // Get the encoded URL from the path
            const path = window.location.pathname;
            const prefix = '/service/';
            const encodedUrl = path.substring(prefix.length);
            
            console.log('Encoded URL:', encodedUrl);
            
            // Decode the URL
            const decodedUrl = __uv$config.decodeUrl(encodedUrl);
            console.log('Decoded URL:', decodedUrl);
            
            // Use UV's built-in navigation
            // This will automatically handle the proxying
            const uv = new Ultraviolet(__uv$config);
            
            // Create a script that loads the UV handler
            const script = document.createElement('script');
            script.src = __uv$config.handler;
            script.onload = function() {
              // UV handler is loaded, now navigate
              window.navigate(decodedUrl);
            };
            script.onerror = function() {
              throw new Error('Failed to load UV handler');
            };
            document.head.appendChild(script);
            
          } catch(error) {
            console.error('UV Error:', error);
            document.getElementById('app').innerHTML = 
              '<div class="error"><h3>Proxy Error</h3><p>' + error.message + '</p>' +
              '<p>Try <a href="/">returning to the homepage</a> or refreshing.</p></div>';
          }
        })();
      </script>
    </body>
    </html>
  `);
});

// Simple direct proxy test
app.get('/test-proxy', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Proxy Test</title>
      <script src="/uv/uv.bundle.js"></script>
      <script src="/uv/uv.config.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          try {
            if (window.__uv$config && window.Ultraviolet) {
              const encoded = Ultraviolet.codec.xor.encode('${url}');
              // Create iframe that loads the UV proxy
              const iframe = document.createElement('iframe');
              iframe.style = 'width: 100%; height: 100vh; border: none;';
              iframe.src = '/service/' + encoded;
              document.body.appendChild(iframe);
            } else {
              document.body.innerHTML = '<h1>UV Not Loaded</h1>';
            }
          } catch(error) {
            document.body.innerHTML = '<h1>Error</h1><p>' + error.message + '</p>';
          }
        });
      </script>
    </head>
    <body>
      Testing proxy for ${url}...
    </body>
    </html>
  `);
});

// Working proxy using iframe with proper sandbox
app.get('/proxy', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  
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
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uv: fs.existsSync(path.join(uvPath, 'uv.bundle.js'))
  });
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
========================================
🚀 Navine Browser Proxy
📍 Port: ${PORT}
📡 UV Status: ${fs.existsSync(path.join(uvPath, 'uv.bundle.js')) ? '✅' : '❌'}
🔗 Health: http://localhost:${PORT}/health
🧪 Proxy Test: http://localhost:${PORT}/test-proxy
🌐 Direct Proxy: http://localhost:${PORT}/proxy?url=https://google.com
🏠 Main App: http://localhost:${PORT}
========================================
  `);
});
