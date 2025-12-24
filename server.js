const express = require("express");
const ultraviolet = require("@titaniumnetwork-dev/ultraviolet");
const { createBareServer } = require("@tomphttp/bare-server-node");

const app = express();

const bare = createBareServer("/bare/");

// Initialize Ultraviolet (assuming it's a function)
const uv = ultraviolet({
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

// Static files
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Ultraviolet + Bare running on port " + PORT);
});
