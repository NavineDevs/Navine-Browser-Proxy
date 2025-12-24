const express = require("express");
const { Ultraviolet } = require("@titaniumnetwork-dev/ultraviolet");
const { createBareServer } = require("@tomphttp/bare-server-node");

const app = express();

// Create Bare server
const bare = createBareServer("/bare/");

// Create Ultraviolet
const uv = new Ultraviolet({
  prefix: "/uv/",
  bare: "/bare/"
});

// Route Bare requests
app.use((req, res, next) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    next();
  }
});

// Ultraviolet middleware
app.use("/uv/", uv.middleware);

// Static frontend
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Ultraviolet + Bare running on port " + PORT);
});
