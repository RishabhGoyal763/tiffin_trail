const express = require("express");
const { getDb } = require("../data/mongo");
const { INITIAL_OFFERS } = require("../data/fixtures");

const router = express.Router();

// GET /api/offers
router.get("/", async (req, res, next) => {
  try {
    const mongo = getDb();
    if (!mongo) {
      return res.json({ offers: INITIAL_OFFERS, source: "fixtures" });
    }
    const offers = await mongo.collection("offers").find({}).toArray();
    res.json({ offers, source: "mongodb" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
