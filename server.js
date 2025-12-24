const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'public' directory
app.use(express.static('public'));

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

// Handle all other routes with 404
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
