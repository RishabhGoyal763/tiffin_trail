const express = require("express");
const { getDb } = require("../data/mongo");
const { INITIAL_RESTAURANTS, INITIAL_MENU } = require("../data/fixtures");

const router = express.Router();

// GET /api/restaurants?cuisine=&search=
router.get("/", async (req, res, next) => {
  try {
    const { cuisine, search } = req.query;
    const mongo = getDb();

    if (!mongo) {
      let list = [...INITIAL_RESTAURANTS];
      if (cuisine && cuisine !== "all") {
        list = list.filter((r) => r.cuisine.toLowerCase() === cuisine.toLowerCase());
      }
      if (search) {
        const q = String(search).trim().toLowerCase();
        list = list.filter((r) => r.name.toLowerCase().includes(q));
      }
      return res.json({ count: list.length, source: "fixtures", restaurants: list });
    }

    const filter = {};

    if (cuisine && cuisine !== "all") {
      filter.cuisine = { $regex: new RegExp(`^${cuisine}$`, "i") };
    }
    if (search) {
      filter.name = { $regex: new RegExp(String(search).trim(), "i") };
    }

    const restaurants = await mongo.collection("restaurants").find(filter).toArray();
    res.json({ count: restaurants.length, source: "mongodb", restaurants });
  } catch (err) {
    next(err);
  }
});

// GET /api/restaurants/:id
router.get("/:id", async (req, res, next) => {
  try {
    const mongo = getDb();
    if (!mongo) {
      const restaurant = INITIAL_RESTAURANTS.find((r) => r.id === req.params.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found." });
      }
      const menuItems = INITIAL_MENU.filter((m) => m.restaurantId === restaurant.id);
      return res.json({ ...restaurant, menu: menuItems, source: "fixtures" });
    }

    const restaurant = await mongo.collection("restaurants").findOne({ id: req.params.id });
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found." });
    }

    const menuItems = await mongo
      .collection("menu_items")
      .find({ restaurantId: restaurant.id })
      .toArray();

    res.json({ ...restaurant, menu: menuItems, source: "mongodb" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
