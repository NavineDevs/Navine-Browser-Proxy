import express from "express";
import pkg from "@titaniumnetwork-dev/ultraviolet";

// Destructure from CommonJS default export
const { Ultraviolet } = pkg;

const app = express();

const uv = new Ultraviolet({
  prefix: "/uv/",
  bare: "/bare/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode
});

// Mount Ultraviolet
app.use("/uv/", uv.middleware);

// Serve static frontend
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ultraviolet running on port ${PORT}`);
});
