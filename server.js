const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all files inside the public folder
app.use(express.static(path.join(__dirname, "public")));

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Customer tracking page
app.get("/track", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "track.html"));
});

// Admin page
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "American Eagle Freight" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`American Eagle Freight running on port ${PORT}`);
});
