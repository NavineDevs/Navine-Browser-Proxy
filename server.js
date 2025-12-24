const express = require('express');
const path = require('path');
const app = express();

// Import ultraviolet
const { Ultraviolet } = require('ultraviolet');
const UV = new Ultraviolet();

// Middleware to handle UV proxying
app.use((req, res, next) => {
  // You can add UV proxy logic here
  // Example: Check if request should be proxied
  if (req.url.startsWith('/uv/')) {
    // Handle UV proxy requests
    return UV.middleware(req, res, next);
  }
  next();
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Serve UV static files
app.use('/uv', express.static(path.join(__dirname, 'node_modules', 'ultraviolet', 'dist')));

// Route for /service (serves a webpage or message)
app.get('/service', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'service.html'));
});

// Route for /service/:id
app.get('/service/:id', (req, res) => {
  const serviceId = req.params.id;
  res.sendFile(path.join(__dirname, 'views', 'service_id.html'));
  
  // Or send a dynamic message:
  // res.send(`Requested Service ID: ${serviceId}`);
});

// UV proxy endpoint (example)
app.get('/proxy/*', (req, res) => {
  const url = req.params[0];
  // Use UV to fetch and rewrite the requested URL
  // This is a simplified example - actual implementation would be more complex
  res.send(`Proxying request for: ${url}`);
});

// Handle all other routes with 404
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Ultraviolet proxy available at /uv`);
});
