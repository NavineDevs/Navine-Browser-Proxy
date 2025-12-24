const express = require('express');
const path = require('path');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const app = express();

const PORT = process.env.PORT || 10000;
const bareServer = createBareServer('/bare/');

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Serve static files from 'public' directory
app.use(express.static('public'));

// Serve Ultraviolet static files
app.use('/uv', express.static(uvPath));

// Handle Bare Server requests
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    console.log(`Bare server request: ${req.url}`);
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Route for /service
app.get('/service', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'service.html'));
});

// Route for /service/:id
app.get('/service/:id', (req, res) => {
  const serviceId = req.params.id;
  res.send(`Requested Service ID: ${serviceId}`);
});

// Serve index.html for root route
app.get('/', (req, res) => {
  console.log('Serving index.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  console.log(`Catch-all route for: ${req.url}`);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle server errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Navine Browser running on port ${PORT}`);
  console.log(`Ultraviolet proxy available at /uv`);
  console.log(`Bare server available at /bare/`);
  console.log(`Health check at /health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Keep-alive timeout
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
