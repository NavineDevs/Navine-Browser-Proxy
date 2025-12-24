const express = require("express");
const { Ultraviolet } = require("@titaniumnetwork-dev/ultraviolet");

const app = express();

// Ultraviolet IS a constructor in CommonJS
const uv = new Ultraviolet({
  prefix: "/uv/",
  bare: "/bare/"
});

// Mount Ultraviolet
app.use("/uv/", uv.middleware);

// Serve frontend
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Ultraviolet running on port " + PORT);
});
