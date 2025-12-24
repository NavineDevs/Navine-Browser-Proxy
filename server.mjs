import express from "express";
import pkg from "@titaniumnetwork-dev/ultraviolet";

const { Ultraviolet } = pkg;

const app = express();

// Create Ultraviolet instance (NO codec config)
const uv = new Ultraviolet({
  prefix: "/uv/",
  bare: "/bare/"
});

// Mount Ultraviolet middleware
app.use("/uv/", uv.middleware);

// Serve static frontend
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ultraviolet running on port ${PORT}`);
});
