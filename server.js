const express = require('express');
const path = require('path');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const app = express();

const PORT = process.env.PORT || 10000;
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

// UV SERVICE ROUTE - Handle encoded URLs
app.get('/service/:encodedUrl(*)', (req, res) => {
  const encodedUrl = req.params.encodedUrl;
  
  console.log('Service request for encoded URL:', encodedUrl);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <base href="/service/" />
      <script src="/uv/uv.bundle.js"></script>
      <script src="/uv/uv.config.js"></script>
      <script>
        // Custom UV config
        window.__uv$config = {
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
        
        document.addEventListener('DOMContentLoaded', function() {
          try {
            // Get the encoded URL
            const path = window.location.pathname;
            const prefix = '/service/';
            const encoded = path.substring(prefix.length);
            
            console.log('Encoded from path:', encoded);
            
            // Decode using UV
            const decoded = __uv$config.decodeUrl(encoded);
            console.log('Decoded URL:', decoded);
            
            // Use UV to fetch and rewrite
            const uv = new Ultraviolet(__uv$config);
            
            fetch(decoded)
              .then(response => response.text())
              .then(html => {
                const rewritten = uv.rewriteHtml(html, {
                  document: window.document,
                  url: decoded
                });
                
                document.open();
                document.write(rewritten);
                document.close();
              })
              .catch(err => {
                document.body.innerHTML = '<h1>Proxy Error</h1><p>' + err.message + '</p>';
              });
              
          } catch(err) {
            console.error('Error:', err);
            document.body.innerHTML = '<h1>Error</h1><p>' + err.message + '</p>';
          }
        });
      </script>
    </head>
    <body>
      Loading proxied content...
    </body>
    </html>
  `);
});

// SIMPLE PROXY - Works every time
app.get('/go', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  
  // Encode URL for UV (simple base64)
  const encoded = Buffer.from(url).toString('base64');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Proxy: ${url}</title>
      <script>
        // Simple proxy that always works
        const originalUrl = atob('${encoded}');
        
        // Create an iframe that loads the content
        document.addEventListener('DOMContentLoaded', function() {
          const iframe = document.createElement('iframe');
          iframe.style = 'width: 100%; height: 100vh; border: none; position: fixed; top: 0; left: 0;';
          iframe.src = 'https://corsproxy.io/?' + encodeURIComponent(originalUrl);
          document.body.appendChild(iframe);
        });
      </script>
    </head>
    <body>
      Loading ${url}...
    </body>
    </html>
  `);
});

// ALTERNATIVE PROXY - Using iframe directly
app.get('/frame', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${url}</title>
      <style>
        body, html { margin: 0; padding: 0; overflow: hidden; height: 100%; }
        iframe { width: 100%; height: 100%; border: none; }
      </style>
    </head>
    <body>
      <iframe 
        src="https://corsproxy.io/?${encodeURIComponent(url)}" 
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        allowfullscreen>
      </iframe>
    </body>
    </html>
  `);
});

// SIMPLE WORKING BROWSER - No UV
app.get('/simple', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Simple Browser</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; height: 100vh; display: flex; flex-direction: column; }
        
        .navbar {
          display: flex;
          padding: 10px;
          background: #1a73e8;
        }
        
        #urlInput {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 4px 0 0 4px;
        }
        
        #goBtn {
          padding: 8px 16px;
          background: white;
          border: none;
          border-radius: 0 4px 4px 0;
          cursor: pointer;
        }
        
        iframe {
          flex: 1;
          width: 100%;
          border: none;
        }
      </style>
    </head>
    <body>
      <div class="navbar">
        <input type="text" id="urlInput" placeholder="Enter URL (e.g., https://www.google.com)" value="https://www.google.com">
        <button id="goBtn">Go</button>
      </div>
      <iframe id="browserFrame"></iframe>
      
      <script>
        const urlInput = document.getElementById('urlInput');
        const goBtn = document.getElementById('goBtn');
        const browserFrame = document.getElementById('browserFrame');
        
        function navigate() {
          let url = urlInput.value.trim();
          
          if (!url) return;
          
          // Add https:// if missing
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }
          
          // Use corsproxy.io to bypass CORS
          browserFrame.src = 'https://corsproxy.io/?' + encodeURIComponent(url);
        }
        
        goBtn.addEventListener('click', navigate);
        urlInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') navigate();
        });
        
        // Load initial page
        setTimeout(navigate, 100);
      </script>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
🌐 Simple browser: http://localhost:${PORT}/simple
📡 Frame proxy: http://localhost:${PORT}/frame?url=https://www.google.com
🔗 Go proxy: http://localhost:${PORT}/go?url=https://www.google.com
🏠 Main browser: http://localhost:${PORT}
  `);
});
