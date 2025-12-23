import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createBareServer } from "@tomphttp/bare-server-node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const bare = createBareServer("/bare/");
const PORT = 8080;

// Serve ALL static files (index.html, app.js, uv files, etc.)
app.use(express.static(path.join(__dirname, "public")));

const server = app.listen(PORT, () => {
  console.log(`✅ Navine UV Proxy running at http://localhost:${PORT}`);
});

// Bare HTTP routing
server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  }
});

// Bare WebSocket routing
server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  }
});
