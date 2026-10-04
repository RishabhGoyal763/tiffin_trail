const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { runSeed } = require("./data/seed");
const { initDb } = require("./data/db");
const restaurantsRouter = require("./routes/restaurants");
const menuRouter = require("./routes/menu");
const offersRouter = require("./routes/offers");
const authRouter = require("./routes/auth");
const cartRouter = require("./routes/cart");
const ordersRouter = require("./routes/orders");
const contactRouter = require("./routes/contact");
const logsRouter = require("./routes/logs");
const { initMongo, isMongoConnected } = require("./data/mongo");

// Verify storage and seed initial demo user
runSeed().catch((err) => {
  console.warn(`⚠️ MySQL Seed Notice: ${err.message}`);
});
// Attempt MongoDB connection
initMongo().catch((err) => {
  console.warn(`⚠️ MongoDB Init Notice: ${err.message}`);
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve backend public assets (e.g. item images)
app.use(express.static(path.join(__dirname, "public")));
// Also serve frontend directory so entire full-stack app can run from one port
app.use(express.static(path.join(__dirname, "../../frontend")));

// Basic protection against brute-force / abuse on write-heavy routes.
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  const { getMode, isConnected } = require("./data/db");
  res.json({
    status: "ok",
    service: "tiffin-trail-backend",
    database: {
      mode: getMode(),
      mySqlConnected: isConnected(),
      mongoConnected: isMongoConnected()
    },
    polyglotArchitecture: {
      mySql: "Core transactional data (users, orders, payments, carts)",
      mongoDb: "Flexible content & logs (menus, restaurants, offers, user_activity_logs)"
    },
    time: new Date().toISOString()
  });
});

app.use("/api/restaurants", restaurantsRouter);
app.use("/api/menu", menuRouter);
app.use("/api/offers", offersRouter);
app.use("/api/auth", authRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/contact", contactRouter);
app.use("/api/logs", logsRouter);

// 404 handler for API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🍱 Tiffin Trail backend listening on http://localhost:${PORT}`);
    console.log(`🌐 Frontend accessible at http://localhost:${PORT}/index.html`);
  });
}

module.exports = app;
