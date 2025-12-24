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

// SIMPLE WORKING PROXY - This will work immediately
app.get('/p/*', (req, res) => {
  const encoded = req.params[0];
  
  // Try to decode if it's base64, otherwise use as-is
  let url;
  try {
    url = atob(encoded);
  } catch {
    url = 'https://www.google.com/search?q=' + encodeURIComponent(encoded);
  }
  
  console.log('Proxy request for:', url);
  
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
    src="${url}" 
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
    allow="fullscreen"
    referrerpolicy="no-referrer">
  </iframe>
</body>
</html>
  `);
});

// QUICK NAVIGATION - Instant redirect
app.get('/q', (req, res) => {
  const url = req.query.url || 'https://www.google.com';
  
  // Encode for URL safety
  const encoded = btoa(url);
  
  // Redirect to the simple proxy
  res.redirect(`/p/${encoded}`);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Navine Browser is running'
  });
});

// Test if UV is working
app.get('/check-uv', (req, res) => {
  const uvFiles = [
    'uv.bundle.js',
    'uv.config.js',
    'uv.client.js',
    'uv.handler.js',
    'uv.sw.js'
  ];
  
  const results = uvFiles.map(file => ({
    file,
    exists: fs.existsSync(path.join(uvPath, file)),
    path: path.join(uvPath, file)
  }));
  
  res.json({
    uvPath,
    files: results,
    working: results.every(r => r.exists)
  });
});

// Main page - Serve the browser interface
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
✅ Navine Browser - READY
📍 Port: ${PORT}
⚡ Fast Proxy: http://localhost:${PORT}/q?url=https://google.com
🔍 Check UV: http://localhost:${PORT}/check-uv
❤️  Health: http://localhost:${PORT}/health
🏠 Browser: http://localhost:${PORT}
========================================
  `);
});
