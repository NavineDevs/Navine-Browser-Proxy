const express = require("express");
const { Ultraviolet } = require("@titaniumnetwork-dev/ultraviolet");
const { createBareServer } = require("@tomphttp/bare-server-node");

const app = express();

// Bare server setup
const bare = createBareServer("/bare/");

// Initialize Ultraviolet with 'new' since it's a class
const uv = new Ultraviolet({
  prefix: "/uv/",
  bare: "/bare/"
});

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

// Static frontend files
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Ultraviolet + Bare running on port " + PORT);
});
