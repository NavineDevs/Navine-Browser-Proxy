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

// Serve UV files - THIS IS CRITICAL
app.use('/uv', express.static(uvPath));

// Handle bare server
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// UV SERVICE ENDPOINT - Must match UV config
app.get('/uv/service/*', (req, res) => {
  // Get everything after /uv/service/
  const encoded = req.params[0];
  
  console.log('UV service request for encoded:', encoded);
  
  // Serve UV client page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <base href="/uv/service/" />
      <script src="/uv/uv.bundle.js"></script>
      <script src="/uv/uv.config.js"></script>
      <link rel="stylesheet" href="/uv/uv.css">
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background: #f5f5f5;
        }
        #status {
          padding: 20px;
          text-align: center;
          color: #666;
        }
        .error {
          color: #d32f2f;
          background: #ffebee;
          padding: 20px;
          margin: 20px;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div id="status">
        <h2>UV Proxy Loading...</h2>
        <p>Please wait</p>
      </div>
      
      <script>
        (async function() {
          try {
            // Check UV is loaded
            if (!window.__uv$config) {
              throw new Error('UV config not loaded. Check console.');
            }
            
            // Get current path and extract encoded URL
            const currentPath = window.location.pathname;
            const prefix = '/uv/service/';
            
            if (!currentPath.startsWith(prefix)) {
              throw new Error('Invalid UV path');
            }
            
            const encodedUrl = currentPath.substring(prefix.length);
            console.log('Encoded from path:', encodedUrl);
            
            // Decode using UV
            const decodedUrl = __uv$config.decodeUrl(encodedUrl);
            console.log('Decoded URL:', decodedUrl);
            
            // Register service worker
            if ('serviceWorker' in navigator) {
              try {
                await navigator.serviceWorker.register('/uv/uv.sw.js', {
                  scope: __uv$config.prefix
                });
                console.log('UV Service Worker registered');
              } catch (swError) {
                console.warn('Service Worker registration failed:', swError);
              }
            }
            
            // Load UV client
            const clientScript = document.createElement('script');
            clientScript.src = '/uv/uv.client.js';
            clientScript.onload = function() {
              // UV client should handle the rest
              console.log('UV client loaded');
              document.getElementById('status').innerHTML = 
                '<h3>Connected</h3><p>Loading content...</p>';
            };
            document.head.appendChild(clientScript);
            
          } catch(error) {
            console.error('UV setup error:', error);
            document.body.innerHTML = 
              '<div class="error"><h3>UV Proxy Error</h3><p>' + error.message + 
              '</p><p><a href="/">Return to browser</a></p></div>';
          }
        })();
      </script>
    </body>
    </html>
  `);
});

// SIMPLE TEST - Direct UV navigation
app.get('/uv-test', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>UV Test</title>
      <script src="/uv/uv.bundle.js"></script>
      <script src="/uv/uv.config.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          if (window.__uv$config && window.Ultraviolet) {
            try {
              const encoded = Ultraviolet.codec.xor.encode('${url}');
              window.location.href = __uv$config.prefix + encoded;
            } catch(e) {
              document.body.innerHTML = '<h1>Encoding Error</h1><p>' + e.message + '</p>';
            }
          } else {
            document.body.innerHTML = '<h1>UV Not Loaded</h1><p>Check console</p>';
          }
        });
      </script>
    </head>
    <body>
      Testing UV redirect to ${url}...
    </body>
    </html>
  `);
});

// FALLBACK PROXY - Works when UV fails
app.get('/proxy/*', (req, res) => {
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
    service: 'Navine Browser UV Proxy',
    timestamp: new Date().toISOString(),
    endpoints: {
      uv: '/uv/service/',
      bare: '/bare/',
      proxy: '/proxy/',
      test: '/uv-test?url=https://google.com'
    }
  });
});

// Check UV installation
app.get('/check-uv', (req, res) => {
  const requiredFiles = [
    'uv.bundle.js',
    'uv.config.js', 
    'uv.client.js',
    'uv.handler.js',
    'uv.sw.js',
    'uv.css'
  ];
  
  const results = requiredFiles.map(file => ({
    file,
    exists: fs.existsSync(path.join(uvPath, file)),
    path: path.join(uvPath, file).replace(process.cwd(), '')
  }));
  
  const allExist = results.every(r => r.exists);
  
  res.json({
    uvPath: uvPath,
    files: results,
    status: allExist ? 'READY' : 'MISSING_FILES',
    message: allExist ? 'UV is properly installed' : 'Some UV files are missing'
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
🚀 Navine Browser - UV Mode
📍 Port: ${PORT}
📡 UV Path: ${uvPath}
🔗 UV Service: http://localhost:${PORT}/uv/service/
🧪 UV Test: http://localhost:${PORT}/uv-test
🔍 Check UV: http://localhost:${PORT}/check-uv
🏠 Browser: http://localhost:${PORT}
========================================
  `);
  
  // Verify UV files
  const uvBundle = path.join(uvPath, 'uv.bundle.js');
  if (fs.existsSync(uvBundle)) {
    console.log('✅ UV bundle found');
  } else {
    console.log('❌ UV bundle missing at:', uvBundle);
  }
});
