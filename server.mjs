import express from "express";
import ultraviolet from "@titaniumnetwork-dev/ultraviolet";

const app = express();

// Ultraviolet exposes a middleware factory, NOT a class
const uvMiddleware = ultraviolet({
  prefix: "/uv/",
  bare: "/bare/"
});

// Mount Ultraviolet
app.use("/uv/", uvMiddleware);

// Serve static files
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Ultraviolet running on port " + PORT);
});
