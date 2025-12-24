const express = require('express');
const path = require('path');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const app = express();

const PORT = process.env.PORT || 3000;
const bareServer = createBareServer('/bare/');

// Serve static files from 'public' directory
app.use(express.static('public'));

// Serve Ultraviolet static files
app.use('/uv', express.static(uvPath));

// Handle Bare Server requests
app.use((req, res, next) => {
  if (req.url.startsWith('/bare/')) {
    bareServer.handleRequest(req, res);
  } else {
    next();
  }
});

// Route for /service
app.get('/service', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'service.html'));
});

// Route for /service/:id
app.get('/service/:id', (req, res) => {
  const serviceId = req.params.id;
  res.send(`Requested Service ID: ${serviceId}`);
});

// Serve index.html for all other routes (SPA behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Navine Browser running on port ${PORT}`);
  console.log(`Ultraviolet proxy available at /uv`);
  console.log(`Bare server available at /bare/`);
});
