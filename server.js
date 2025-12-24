const express = require('express');
const path = require('path');
const fs = require('fs');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');

const app = express();
const PORT = process.env.PORT || 10000;

// Create Bare server
const bareServer = createBareServer('/bare/');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Serve Ultraviolet files
app.use('/uv', express.static(uvPath));

// Bare server middleware
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// Health check endpoint (CRITICAL for Render)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Simple test route
app.get('/test', (req, res) => {
  res.send('Server is working!');
});

// Main route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Service routes
app.get('/service', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'service.html'));
});

app.get('/service/:id', (req, res) => {
  res.send(`Service ID: ${req.params.id}`);
});

// Catch-all for SPA (serve index.html for any other route)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Server Error');
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Test route: http://localhost:${PORT}/test`);
  console.log(`🚀 Main app: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
