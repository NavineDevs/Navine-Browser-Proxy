import express from "express";
import { Ultraviolet } from "@titaniumnetwork-dev/ultraviolet";

const app = express();

const uv = new Ultraviolet({
  prefix: "/uv/",
  bare: "/bare/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode
});

// Ultraviolet middleware
app.use("/uv/", uv.middleware);

// Static files
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ultraviolet running on port ${PORT}`);
});
