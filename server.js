const express = require("express");
const ultraviolet = require("@titaniumnetwork-dev/ultraviolet");
const { createBareServer } = require("@tomphttp/bare-server-node");

// Log the export of ultraviolet to determine how to import it correctly
console.log(require("@titaniumnetwork-dev/ultraviolet"));

const app = express();

const bare = createBareServer("/bare/");

// Initialize Ultraviolet
// (Update this part after seeing the console output)
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
