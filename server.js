const express = require("express");
const ultraviolet = require("@titaniumnetwork-dev/ultraviolet");

console.log("Ultraviolet export:", ultraviolet);

const app = express();

// Use ultraviolet as middleware
if (typeof ultraviolet === "function") {
    app.use("/uv", ultraviolet);
} else if (ultraviolet && typeof ultraviolet.middleware === "function") {
    app.use("/uv", ultraviolet.middleware);
} else {
    console.error("Unexpected ultraviolet export. Please check the documentation.");
}

// Serve static files from 'public' directory
app.use(express.static("public"));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
