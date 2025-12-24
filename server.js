const express = require("express");
const ultravioletModule = require("@titaniumnetwork-dev/ultraviolet");
const { createBareServer } = require("@tomphttp/bare-server-node");

// Debug: log the module to see its structure
console.log("Ultraviolet module export:", ultravioletModule);

// Assuming the module has a method 'createUltraviolet' or similar
// You need to adjust this based on the actual exported structure
// First, check if there's a method
const createUltraviolet = ultravioletModule.createUltraviolet || ultravioletModule.default || ultravioletModule;

// Initialize ultraviolet
const uv = createUltraviolet({
  prefix: "/uv/",
  bare: "/bare/"
});

const app = express();

const bare = createBareServer("/bare/");

// Route Bare traffic
app.use((req, res, next) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    next();
  }
});

// Use Ultraviolet middleware
app.use("/uv/", uv.middleware);

// Static files
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Ultraviolet + Bare running on port " + PORT);
});
