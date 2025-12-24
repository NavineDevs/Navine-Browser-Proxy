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

// UV SERVICE ENDPOINT - Fixed loading order
app.get('/uv/service/*', (req, res) => {
  const encoded = req.params[0];
  
  console.log('UV service for:', encoded.substring(0, 30));
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <base href="/uv/service/" />
    <title>UV Proxy</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    
    <!-- Load UV scripts HERE, after the page structure -->
    <script>
      // Load UV scripts in correct order
      function loadUVScripts() {
        return new Promise((resolve, reject) => {
          const scripts = [
            '/uv/uv.bundle.js',
            '/uv/uv.config.js',
            '/uv/uv.client.js'
          ];
          
          let loaded = 0;
          
          scripts.forEach((src, index) => {
            const script = document.createElement('script');
            script.src = src;
            
            script.onload = () => {
              loaded++;
              console.log('Loaded:', src);
              
              if (loaded === scripts.length) {
                // Set UV config after all scripts are loaded
                if (window.Ultraviolet) {
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
                  resolve();
                } else {
                  reject(new Error('Ultraviolet not found after loading scripts'));
                }
              }
            };
            
            script.onerror = () => {
              reject(new Error('Failed to load: ' + src));
            };
            
            // Load scripts sequentially
            if (index === 0) {
              document.head.appendChild(script);
            } else {
              // Wait for previous script to load
              scripts[index - 1].onload = () => {
                document.head.appendChild(script);
              };
            }
          });
        });
      }
      
      // Main initialization
      async function initUV() {
        const statusEl = document.getElementById('status');
        const errorEl = document.getElementById('error');
        
        function updateStatus(msg) {
          statusEl.textContent = msg;
          console.log('Status:', msg);
        }
        
        function showError(msg, details) {
          errorEl.style.display = 'block';
          errorEl.innerHTML = \`
            <h3>⚠️ Error</h3>
            <p>\${msg}</p>
            <p><small>\${details}</small></p>
            <p><a href="/">← Return to Browser</a></p>
          \`;
          statusEl.style.display = 'none';
          document.querySelector('.loader').style.display = 'none';
        }
        
        try {
          updateStatus('Loading UV scripts...');
          
          // Load UV scripts
          await loadUVScripts();
          
          updateStatus('UV loaded, processing...');
          
          // Get encoded URL from path
          const currentPath = window.location.pathname;
          const prefix = '/uv/service/';
          
          if (!currentPath.startsWith(prefix)) {
            throw new Error('Invalid UV path');
          }
          
          const encodedUrl = currentPath.substring(prefix.length);
          console.log('Encoded URL from path:', encodedUrl);
          
          // Decode the URL
          const decodedUrl = __uv$config.decodeUrl(encodedUrl);
          console.log('Decoded URL:', decodedUrl);
          
          updateStatus('Loading: ' + decodedUrl);
          
          // Create UV instance
          const uv = new UVServiceWorker();
          
          // Register service worker
          if ('serviceWorker' in navigator) {
            try {
              await navigator.serviceWorker.register('/uv/uv.sw.js', {
                scope: __uv$config.prefix
              });
              console.log('Service Worker registered');
            } catch (swError) {
              console.warn('Service Worker failed:', swError);
              // Continue without service worker
            }
          }
          
          // Mount UV
          await uv.mount(__uv$config);
          updateStatus('Fetching content...');
          
          // Fetch through UV
          const response = await uv.fetch(decodedUrl);
          
          if (!response.ok) {
            throw new Error('HTTP ' + response.status);
          }
          
          const html = await response.text();
          updateStatus('Rewriting content...');
          
          // Rewrite HTML
          const rewritten = uv.rewriteHtml(html);
          
          // Apply to page
          document.open();
          document.write(rewritten);
          document.close();
          
        } catch (error) {
          console.error('UV Error:', error);
          showError(
            'Failed to load through UV proxy',
            error.message + '\\n' +
            'Check if all UV files are available.'
          );
        }
      }
      
      // Start initialization
      document.addEventListener('DOMContentLoaded', initUV);
    </script>
  </body>
  </html>
  `;
  
  res.send(html);
});

// SIMPLE TEST ENDPOINT
app.get('/test-uv', (req, res) => {
  const url = 'https://www.google.com';
  
  // Simple test that loads UV properly
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>UV Test</title>
    <script>
      // Load UV
      const bundle = document.createElement('script');
      bundle.src = '/uv/uv.bundle.js';
      bundle.onload = () => {
        const config = document.createElement('script');
        config.src = '/uv/uv.config.js';
        config.onload = () => {
          if (window.Ultraviolet) {
            const encoded = Ultraviolet.codec.xor.encode('${url}');
            window.location.href = '/uv/service/' + encoded;
          }
        };
        document.head.appendChild(config);
      };
      document.head.appendChild(bundle);
    </script>
  </head>
  <body>
    Loading UV test...
  </body>
  </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    uv: true,
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
========================================
✅ UV Proxy Server
📍 Port: ${PORT}
🔗 UV Service: /uv/service/
🧪 Test: http://localhost:${PORT}/test-uv
🏠 Browser: http://localhost:${PORT}
========================================
  `);
});
