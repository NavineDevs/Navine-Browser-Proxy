import express from "express";
import { createBareServer } from "@tomphttp/bare-server-node";

const app = express();
const bare = createBareServer("/bare/");
const PORT = 8080;

app.use(express.static("public"));

const server = app.listen(PORT, () => {
  console.log("Server running on http://localhost:8080");
});

server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) bare.routeRequest(req, res);
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) bare.routeUpgrade(req, socket, head);
});
