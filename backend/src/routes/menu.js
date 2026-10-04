const express = require("express");
const { getDb, logActivity } = require("../data/mongo");
const { INITIAL_MENU, INITIAL_RESTAURANTS } = require("../data/fixtures");

const router = express.Router();

function getEnrichedFixtures() {
  const restMap = new Map(INITIAL_RESTAURANTS.map((r) => [r.id, r.name]));
  return INITIAL_MENU.map((item) => ({
    ...item,
    restaurant: restMap.get(item.restaurantId) || ""
  }));
}

// GET /api/menu?diet=veg|nonveg|all&cuisine=&maxPrice=&search=&restaurantId=
router.get("/", async (req, res, next) => {
  try {
    const { diet = "all", cuisine = "all", maxPrice, search, restaurantId } = req.query;

    if (search) {
      logActivity({
        eventType: "SEARCH_MENU",
        req,
        metadata: { search, diet, cuisine, maxPrice }
      });
    }

    const mongo = getDb();
    if (!mongo) {
      let items = getEnrichedFixtures();
      if (diet && diet !== "all") {
        items = items.filter((m) => m.category === diet);
      }
      if (cuisine && cuisine !== "all") {
        items = items.filter((m) => m.cuisine.toLowerCase() === cuisine.toLowerCase());
      }
      if (maxPrice) {
        const max = Number(maxPrice);
        if (!Number.isNaN(max)) items = items.filter((m) => m.price <= max);
      }
      if (restaurantId) {
        items = items.filter((m) => m.restaurantId === restaurantId);
      }
      if (search) {
        const q = String(search).trim().toLowerCase();
        items = items.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.desc.toLowerCase().includes(q) ||
            m.cuisine.toLowerCase().includes(q)
        );
      }
      items.sort((a, b) => a.price - b.price);
      return res.json({ count: items.length, source: "fixtures", items });
    }

    const filter = {};

    if (diet && diet !== "all") {
      filter.category = diet;
    }
    if (cuisine && cuisine !== "all") {
      filter.cuisine = { $regex: new RegExp(`^${cuisine}$`, "i") };
    }
    if (maxPrice) {
      const max = Number(maxPrice);
      if (!Number.isNaN(max)) filter.price = { $lte: max };
    }
    if (restaurantId) {
      filter.restaurantId = restaurantId;
    }
    if (search) {
      const reg = new RegExp(String(search).trim(), "i");
      filter.$or = [{ name: reg }, { desc: reg }, { cuisine: reg }];
    }

    const items = await mongo
      .collection("menu_items")
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "restaurants",
            localField: "restaurantId",
            foreignField: "id",
            as: "restaurantDoc"
          }
        },
        {
          $addFields: {
            restaurant: { $arrayElemAt: ["$restaurantDoc.name", 0] }
          }
        },
        {
          $project: {
            restaurantDoc: 0
          }
        },
        { $sort: { price: 1 } }
      ])
      .toArray();

    res.json({ count: items.length, source: "mongodb", items });
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/cuisines — distinct cuisine list
router.get("/cuisines", async (req, res, next) => {
  try {
    const mongo = getDb();
    if (!mongo) {
      const set = new Set(INITIAL_MENU.map((m) => m.cuisine));
      return res.json({ cuisines: Array.from(set).sort(), source: "fixtures" });
    }
    const cuisines = await mongo.collection("menu_items").distinct("cuisine");
    res.json({ cuisines: cuisines.sort(), source: "mongodb" });
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/:id
router.get("/:id", async (req, res, next) => {
  try {
    const mongo = getDb();
    if (!mongo) {
      const item = getEnrichedFixtures().find((m) => m.id === req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Menu item not found." });
      }
      return res.json(item);
    }
    const item = await mongo.collection("menu_items").findOne({ id: req.params.id });
    if (!item) {
      return res.status(404).json({ error: "Menu item not found." });
    }

    logActivity({
      eventType: "VIEW_MENU_ITEM",
      req,
      metadata: { itemId: item.id, itemName: item.name }
    });

    res.json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
