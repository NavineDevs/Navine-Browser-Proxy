import express from "express";
import pkg from "@titaniumnetwork-dev/ultraviolet";

const { createServer } = pkg;

const app = express();

// Create Ultraviolet middleware
const uv = createServer({
  prefix: "/uv/",
  bare: "/bare/"
});

// Mount Ultraviolet
app.use("/uv/", uv);

// Serve static files
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Ultraviolet running on port " + PORT);
});
