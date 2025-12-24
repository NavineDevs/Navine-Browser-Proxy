// Import the express module
const express = require('express');

// Create an instance of express
const app = express();

// Define route for /service/ (the root of service)
app.get('/service/', (req, res) => {
  res.send('Welcome to the Service Root Endpoint');
});

// Define route for /service/:id (dynamic service ID)
app.get('/service/:id', (req, res) => {
  const serviceId = req.params.id;
  res.send(`Requested Service ID: ${serviceId}`);
});

// Optional: catch-all route for unmatched paths
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
