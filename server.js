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

// Handle bare server
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// UV SERVICE ENDPOINT - Fixed
app.get('/uv/service/*', (req, res) => {
  const encoded = req.params[0];
  
  console.log('UV service request received');
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <base href="/uv/service/" />
    <title>UV Proxy</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- UV Configuration -->
    <script>
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
    
    <!-- Load ALL UV scripts in correct order -->
    <script src="/uv/uv.bundle.js"></script>
    <script src="/uv/uv.config.js"></script>
    <script src="/uv/uv.client.js"></script>
    <script src="/uv/uv.handler.js"></script>
    
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
      }
      
      .container {
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        padding: 40px;
        max-width: 500px;
        width: 100%;
        text-align: center;
      }
      
      h1 {
        color: #333;
        margin-bottom: 20px;
        font-size: 28px;
      }
      
      .status {
        color: #666;
        font-size: 16px;
        margin: 20px 0;
        line-height: 1.6;
      }
      
      .loader {
        border: 5px solid #f3f3f3;
        border-top: 5px solid #667eea;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 30px auto;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .error {
        background: #ffebee;
        color: #c62828;
        padding: 20px;
        border-radius: 10px;
        margin-top: 20px;
        text-align: left;
      }
      
      .error h3 {
        margin-bottom: 10px;
      }
      
      .error a {
        color: #667eea;
        text-decoration: none;
        font-weight: 500;
      }
      
      .error a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🔗 UV Proxy</h1>
      <div class="loader"></div>
      <div class="status" id="status">Loading Ultraviolet...</div>
      <div id="error" class="error" style="display: none;"></div>
    </div>
    
    <script>
      (function() {
        const statusEl = document.getElementById('status');
        const errorEl = document.getElementById('error');
        
        function updateStatus(message) {
          statusEl.textContent = message;
          console.log('UV Status:', message);
        }
        
        function showError(message, details) {
          errorEl.style.display = 'block';
          errorEl.innerHTML = \`
            <h3>⚠️ UV Proxy Error</h3>
            <p>\${message}</p>
            <p><small>\${details}</small></p>
            <p><a href="/">← Return to Browser</a></p>
          \`;
          statusEl.style.display = 'none';
          document.querySelector('.loader').style.display = 'none';
        }
        
        // Wait for UV to fully load
        function waitForUV() {
          return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds
            
            function check() {
              attempts++;
              
              // Check if all required UV components are loaded
              if (window.Ultraviolet && 
                  window.Ultraviolet.codec && 
                  window.__uv$config &&
                  typeof UVServiceWorker !== 'undefined') {
                resolve();
                return;
              }
              
              if (attempts >= maxAttempts) {
                reject(new Error('UV failed to load after ' + maxAttempts + ' attempts'));
                return;
              }
              
              setTimeout(check, 100);
            }
            
            check();
          });
        }
        
        async function initUV() {
          try {
            updateStatus('Checking UV configuration...');
            
            // Wait for UV to load
            await waitForUV();
            updateStatus('UV loaded successfully!');
            
            // Get encoded URL from path
            const currentPath = window.location.pathname;
            const prefix = '/uv/service/';
            
            if (!currentPath.startsWith(prefix)) {
              throw new Error('Invalid UV service path');
            }
            
            const encodedUrl = currentPath.substring(prefix.length);
            updateStatus('Decoding URL...');
            
            // Decode the URL
            const decodedUrl = __uv$config.decodeUrl(encodedUrl);
            console.log('Decoded URL:', decodedUrl);
            
            updateStatus('Connecting to: ' + decodedUrl);
            
            // Create and mount UV service worker
            const uv = new UVServiceWorker();
            
            // Register service worker if supported
            if ('serviceWorker' in navigator) {
              try {
                const registration = await navigator.serviceWorker.register('/uv/uv.sw.js', {
                  scope: __uv$config.prefix
                });
                console.log('Service Worker registered:', registration);
              } catch (swError) {
                console.warn('Service Worker registration failed:', swError);
                // Continue anyway, UV might work without SW
              }
            }
            
            // Mount UV
            await uv.mount(__uv$config);
            updateStatus('Proxy ready, loading content...');
            
            // Fetch the page through UV
            const response = await uv.fetch(decodedUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (!response.ok) {
              throw new Error('Failed to fetch: HTTP ' + response.status);
            }
            
            const html = await response.text();
            updateStatus('Rewriting content...');
            
            // Rewrite HTML
            const rewritten = uv.rewriteHtml(html, {
              document: window.document,
              url: decodedUrl
            });
            
            // Apply to page
            document.open();
            document.write(rewritten);
            document.close();
            
          } catch (error) {
            console.error('UV Error:', error);
            showError(
              'Failed to load through UV proxy.',
              'Error: ' + error.message + '\\n' +
              'Check if UV scripts are properly loaded.'
            );
          }
        }
        
        // Start UV initialization
        setTimeout(initUV, 100);
        
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
    uv: true,
    bare: true,
    timestamp: new Date().toISOString()
  });
});

// UV redirect test
app.get('/uv-redirect', (req, res) => {
  const url = req.query.url || 'https://www.youtube.com';
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>UV Redirect</title>
    <script>
      // Load UV and redirect
      function loadAndRedirect() {
        const uvBundle = document.createElement('script');
        uvBundle.src = '/uv/uv.bundle.js';
        uvBundle.onload = function() {
          const uvConfig = document.createElement('script');
          uvConfig.src = '/uv/uv.config.js';
          uvConfig.onload = function() {
            if (window.Ultraviolet && window.Ultraviolet.codec) {
              try {
                const encoded = Ultraviolet.codec.xor.encode('${url}');
                window.location.href = '/uv/service/' + encoded;
              } catch(e) {
                document.body.innerHTML = '<h1>Encoding Error</h1><p>' + e.message + '</p>';
              }
            } else {
              document.body.innerHTML = '<h1>UV Not Loaded</h1>';
            }
          };
          document.head.appendChild(uvConfig);
        };
        document.head.appendChild(uvBundle);
      }
      
      document.addEventListener('DOMContentLoaded', loadAndRedirect);
    </script>
  </head>
  <body>
    <p>Redirecting to ${url} via UV...</p>
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
✅ UV Proxy Server Running
📍 Port: ${PORT}
🔗 UV Service: /uv/service/
🧪 Test: http://localhost:${PORT}/uv-redirect?url=https://youtube.com
🏠 Browser: http://localhost:${PORT}
========================================
  `);
});
