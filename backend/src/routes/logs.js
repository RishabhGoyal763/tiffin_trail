const express = require("express");
const { getDb, isMongoConnected, logActivity } = require("../data/mongo");
const { optionalAuth, requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(optionalAuth);

// GET /api/logs — All recent user activity logs (MongoDB)
router.get("/", async (req, res, next) => {
  try {
    if (!isMongoConnected()) {
      return res.json({ connected: false, message: "MongoDB is not connected", logs: [] });
    }

    const db = getDb();
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const logs = await db
      .collection("user_activity_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({
      connected: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/logs/me — Current user's activity logs (MongoDB)
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!isMongoConnected()) {
      return res.json({ connected: false, message: "MongoDB is not connected", logs: [] });
    }

    const db = getDb();
    const logs = await db
      .collection("user_activity_logs")
      .find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    res.json({
      connected: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/logs — Record client-side event into MongoDB
router.post("/", async (req, res, next) => {
  try {
    const { eventType, metadata = {} } = req.body || {};
    if (!eventType) return res.status(400).json({ error: "eventType is required." });

    await logActivity({
      userId: req.user ? req.user.id : null,
      eventType,
      req,
      metadata
    });

    res.status(201).json({ status: "logged", eventType });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
