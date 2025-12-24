import express from "express";
import { Ultraviolet } from "@titaniumnetwork-dev/ultraviolet";

const app = express();

// Create Ultraviolet instance
const uv = new Ultraviolet({
  prefix: "/uv/",
  bare: "/bare/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode
});

// Mount Ultraviolet
app.use("/uv/", uv.middleware);

// Serve frontend
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Ultraviolet running on port " + PORT);
});
