const express = require('express');
const app = express();

// Route for /service
app.get('/service', (req, res) => {
  res.send('Welcome to the Service Root Endpoint');
});

// Route for /service/:id
app.get('/service/:id', (req, res) => {
  const serviceId = req.params.id;
  res.send(`Requested Service ID: ${serviceId}`);
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
