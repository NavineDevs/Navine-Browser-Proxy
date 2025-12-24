const express = require("express");
// Require the main file inside the 'dist' folder
const ultraviolet = require("@titaniumnetwork-dev/ultraviolet/dist");
const { createBareServer } = require("@tomphttp/bare-server-node");

// Check what is exported
console.log("Ultraviolet import:", ultraviolet);

// Assuming the module exports an object with a method or class to create the instance
// If the module has a method or class, you should initialize it accordingly.

// For demonstration, if ultraviolet is already an instance or object with middleware:
const uv = ultraviolet; // Use directly if it has middleware property

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
// If ultraviolet has a 'middleware' property:
if (uv.middleware) {
  app.use("/uv/", uv.middleware);
} else {
  console.error("Ultraviolet does not have a middleware property");
}

// Static files
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Ultraviolet + Bare running on port " + PORT);
});
