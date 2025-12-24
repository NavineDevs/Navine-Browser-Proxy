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

// Handle bare server requests
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// CRITICAL FIX: Handle UV service routes with wildcard
// This catches ALL /service/* requests including those with special characters
app.get('/service/*', (req, res) => {
  // Get the full path after /service/
  const fullPath = req.path;
  const encoded = fullPath.substring('/service/'.length);
  
  console.log('UV Service request:', { encoded, fullPath });
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <base href="/" />
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
        .error {
          color: #d32f2f;
          background: #ffebee;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div id="content">
        <h2>Loading via UV Proxy...</h2>
        <p>If this takes too long, there might be an error.</p>
      </div>
      
      <script>
        (async function() {
          try {
            // Wait for UV to load
            if (!window.Ultraviolet) {
              throw new Error('Ultraviolet not loaded');
            }
            
            // Get encoded URL from path
            const currentPath = window.location.pathname;
            const prefix = '/service/';
            const encodedUrl = currentPath.substring(prefix.length);
            
            console.log('Encoded URL from path:', encodedUrl);
            
            // Set up UV config
            const uvConfig = {
              prefix: '/service/',
              bare: '/bare/',
              encodeUrl: Ultraviolet.codec.xor.encode,
              decodeUrl: Ultraviolet.codec.xor.decode,
              handler: '/uv/uv.handler.js',
              bundle: '/uv/uv.bundle.js',
              config: '/uv/uv.config.js',
              client: '/uv/uv.client.js',
              sw: '/uv/uv.sw.js'
            };
            
            // Decode the URL
            const decodedUrl = uvConfig.decodeUrl(encodedUrl);
            console.log('Decoded URL:', decodedUrl);
            
            // Create UV instance
            const uv = new UVServiceWorker();
            uv.mount(uvConfig);
            
            // Try to navigate using UV
            await uv.fetch(decodedUrl)
              .then(response => response.text())
              .then(data => {
                // UV will handle rewriting automatically
                document.open();
                document.write(data);
                document.close();
              });
              
          } catch(error) {
            console.error('UV Proxy Error:', error);
            document.getElementById('content').innerHTML = 
              '<div class="error"><h3>Proxy Error</h3><p>' + error.message + '</p></div>';
          }
        })();
      </script>
    </body>
    </html>
  `);
});

// SIMPLE UV TEST - This should work
app.get('/uv-test', (req, res) => {
  const testUrl = 'https://www.google.com';
  
  // Manually encode with URL-safe base64
  const encoded = Buffer.from(testUrl).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>UV Test</title>
      <script src="/uv/uv.bundle.js"></script>
      <script>
        // Simple test that bypasses XOR encoding issues
        document.addEventListener('DOMContentLoaded', function() {
          const iframe = document.createElement('iframe');
          iframe.style = 'width: 100%; height: 100vh; border: none;';
          iframe.src = '/service/${encoded}?type=base64';
          document.body.appendChild(iframe);
        });
      </script>
    </head>
    <body>
      Testing UV proxy...
    </body>
    </html>
  `);
});

// Alternative: Use base64 encoding instead of XOR
app.get('/service-base64/*', (req, res) => {
  const encoded = req.params[0];
  
  try {
    // Decode from URL-safe base64
    const decoded = Buffer.from(
      encoded.replace(/-/g, '+').replace(/_/g, '/'), 
      'base64'
    ).toString();
    
    console.log('Base64 proxy request:', decoded);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="/uv/uv.bundle.js"></script>
        <script>
          // Use UV with this specific URL
          const uv = new UVServiceWorker();
          const config = {
            prefix: '/service/',
            bare: '/bare/',
            handler: '/uv/uv.handler.js'
          };
          uv.mount(config);
          
          // Navigate to the decoded URL
          window.location.href = config.prefix + Ultraviolet.codec.xor.encode('${decoded}');
        </script>
      </head>
      <body>
        Redirecting...
      </body>
      </html>
    `);
    
  } catch(error) {
    res.status(400).send('Invalid base64 encoding');
  }
});

// Health check for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Navine Browser',
    timestamp: new Date().toISOString(),
    uv: fs.existsSync(path.join(uvPath, 'uv.bundle.js'))
  });
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send(`
    <h1>Server Error</h1>
    <p>${err.message}</p>
    <a href="/">Return Home</a>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`
========================================
🚀 Navine Browser UV Proxy
📍 Port: ${PORT}
🔗 Health: http://localhost:${PORT}/health
🧪 UV Test: http://localhost:${PORT}/uv-test
🏠 Main: http://localhost:${PORT}
========================================
  `);
  
  // Check UV files
  const uvBundlePath = path.join(uvPath, 'uv.bundle.js');
  if (fs.existsSync(uvBundlePath)) {
    console.log('✅ UV files found at:', uvPath);
  } else {
    console.warn('⚠️  UV bundle not found at:', uvBundlePath);
  }
});
