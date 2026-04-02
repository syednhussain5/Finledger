require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { initDB } = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// Serve minimal UI
app.use(express.static(path.join(__dirname, "../ui")));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/users"));
app.use("/records", require("./routes/records"));
app.use("/dashboard", require("./routes/dashboard"));

// Health check
app.get("/health", (_, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// 404
app.use((_, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

initDB()
  .then(() => app.listen(PORT, () => console.log(`✓ FinLedger running on http://localhost:${PORT}`)))
  .catch((e) => { console.error("Failed to start:", e); process.exit(1); });
