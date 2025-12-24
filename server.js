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

// Serve UV files - IMPORTANT: Use proper MIME types
app.use('/uv', express.static(uvPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// Handle bare server
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// FIXED UV SERVICE ENDPOINT - No service worker registration
app.get('/uv/service/*', (req, res) => {
  const encoded = req.params[0];
  
  console.log('UV service for encoded:', encoded.substring(0, 50) + '...');
  
  // Direct UV client page without service worker issues
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <base href="/uv/service/" />
      <title>UV Proxy</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .loading {
          text-align: center;
          padding: 40px 20px;
        }
        .error {
          background: #ffebee;
          color: #c62828;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div id="content" class="loading">
          <h2>🔗 UV Proxy</h2>
          <p>Connecting through Ultraviolet...</p>
          <div id="progress"></div>
        </div>
      </div>
      
      <!-- Load UV scripts FIRST -->
      <script src="/uv/uv.bundle.js"></script>
      <script src="/uv/uv.config.js"></script>
      
      <script>
        (function() {
          try {
            // Check if UV loaded
            if (!window.__uv$config || !window.Ultraviolet) {
              throw new Error('Ultraviolet libraries not loaded');
            }
            
            // Get encoded URL from path
            const currentPath = window.location.pathname;
            const prefix = '/uv/service/';
            
            if (!currentPath.startsWith(prefix)) {
              throw new Error('Invalid UV service path');
            }
            
            const encodedUrl = currentPath.substring(prefix.length);
            console.log('Encoded URL from path:', encodedUrl);
            
            // Decode the URL
            const decodedUrl = __uv$config.decodeUrl(encodedUrl);
            console.log('Decoded URL:', decodedUrl);
            
            // Update status
            document.getElementById('progress').innerHTML = 
              '<p>Loading: <strong>' + decodedUrl + '</strong></p>';
            
            // Create UV instance WITHOUT service worker
            const uv = new Ultraviolet({
              prefix: prefix,
              bare: '/bare/',
              encodeUrl: Ultraviolet.codec.xor.encode,
              decodeUrl: Ultraviolet.codec.xor.decode,
              handler: '/uv/uv.handler.js',
              bundle: '/uv/uv.bundle.js',
              config: '/uv/uv.config.js',
              client: '/uv/uv.client.js'
            });
            
            // Load UV handler
            const handlerScript = document.createElement('script');
            handlerScript.src = '/uv/uv.handler.js';
            handlerScript.onload = function() {
              // Use UV to fetch and rewrite the page
              fetch(decodedUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
              })
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
                document.getElementById('content').innerHTML = 
                  '<div class="error"><h3>Proxy Error</h3><p>' + error.message + 
                  '</p><p>URL: ' + decodedUrl + '</p>' +
                  '<p><a href="/">Return to browser</a></p></div>';
              });
            };
            
            handlerScript.onerror = function() {
              throw new Error('Failed to load UV handler');
            };
            
            document.head.appendChild(handlerScript);
            
          } catch(error) {
            console.error('UV Error:', error);
            document.getElementById('content').innerHTML = 
              '<div class="error"><h3>UV Setup Error</h3><p>' + error.message + 
              '</p><p>Check the browser console for details.</p>' +
              '<p><a href="/" style="color: #1a73e8;">← Return to browser</a></p></div>';
          }
        })();
      </script>
    </body>
    </html>
  `);
});

// SIMPLE WORKING UV TEST
app.get('/uv-go', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>UV Go - ${url}</title>
      <script src="/uv/uv.bundle.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          try {
            if (window.Ultraviolet && window.Ultraviolet.codec) {
              const encoded = Ultraviolet.codec.xor.encode('${url}');
              // Create iframe to load UV service
              const iframe = document.createElement('iframe');
              iframe.style = 'width: 100%; height: 100vh; border: none; position: fixed; top: 0; left: 0;';
              iframe.src = '/uv/service/' + encodeURIComponent(encoded);
              document.body.appendChild(iframe);
            } else {
              document.body.innerHTML = '<h1>UV Not Loaded</h1><p>Try <a href="/">the main browser</a></p>';
            }
          } catch(e) {
            document.body.innerHTML = '<h1>Error</h1><p>' + e.message + '</p>';
          }
        });
      </script>
    </head>
    <body>
      Loading ${url} via UV...
    </body>
    </html>
  `);
});

// ALTERNATIVE: Simple proxy without UV
app.get('/go/*', (req, res) => {
  const encoded = req.params[0];
  let url;
  
  try {
    url = atob(encoded);
  } catch {
    url = 'https://www.google.com/search?q=' + encodeURIComponent(encoded);
  }
  
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
    service: 'Navine Browser',
    uv: true,
    timestamp: new Date().toISOString(),
    endpoints: {
      main: '/',
      uvService: '/uv/service/',
      uvGo: '/uv-go?url=https://google.com',
      simpleProxy: '/go/' + btoa('https://google.com')
    }
  });
});

// Debug endpoint
app.get('/debug-uv', (req, res) => {
  const uvFiles = ['uv.bundle.js', 'uv.config.js', 'uv.handler.js', 'uv.client.js', 'uv.sw.js'];
  const results = uvFiles.map(file => ({
    file,
    exists: fs.existsSync(path.join(uvPath, file)),
    size: fs.existsSync(path.join(uvPath, file)) ? 
          fs.statSync(path.join(uvPath, file)).size + ' bytes' : 'missing'
  }));
  
  res.json({
    uvPath,
    files: results,
    nodeModules: fs.existsSync(path.join(__dirname, 'node_modules')),
    bareExists: fs.existsSync(path.join(__dirname, 'node_modules', '@tomphttp/bare-server-node'))
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
🚀 Navine Browser - UV Fixed
📍 Port: ${PORT}
📡 UV Service: /uv/service/
⚡ UV Test: http://localhost:${PORT}/uv-go?url=https://google.com
🔧 Debug: http://localhost:${PORT}/debug-uv
🏠 Browser: http://localhost:${PORT}
========================================
  `);
});
