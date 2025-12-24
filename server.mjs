import express from "express";
import ultraviolet from "@titaniumnetwork-dev/ultraviolet";

const app = express();

// Create UV server using the factory
const uv = ultraviolet.createServer({
  prefix: "/uv/",
  bare: "/bare/"
});

// Mount Ultraviolet
app.use("/uv/", uv);

// Static frontend
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Ultraviolet running on port " + PORT);
});
