const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../data/db");
const { optionalAuth } = require("../middleware/auth");
const { computeTotals } = require("../utils/pricing");
const { logActivity } = require("../data/mongo");
const { getOwnerId } = require("../utils/owner");

const router = express.Router();
router.use(optionalAuth);

async function ensureCart(ownerKey, userId) {
  await db.query(
    "INSERT IGNORE INTO carts (owner_id, user_id) VALUES (?, ?)",
    [ownerKey, userId || null]
  );
}

async function getSerializedCart(ownerKey) {
  const lines = await db.query(
    `SELECT cl.menu_item_id AS menuItemId, cl.qty,
            m.id, m.name, m.price, m.category, m.cuisine, m.image, m.restaurant_id AS restaurantId,
            (cl.qty * m.price) AS lineTotal
     FROM cart_lines cl
     JOIN menu_items m ON cl.menu_item_id = m.id
     WHERE cl.owner_id = ?`,
    [ownerKey]
  );

  const formattedLines = lines.map((l) => ({
    menuItemId: l.menuItemId,
    qty: l.qty,
    item: {
      id: l.id,
      name: l.name,
      price: l.price,
      category: l.category,
      cuisine: l.cuisine,
      image: l.image,
      restaurantId: l.restaurantId
    },
    lineTotal: l.lineTotal
  }));

  const menuById = new Map(lines.map((l) => [l.menuItemId, { price: l.price }]));
  const totals = computeTotals(formattedLines, menuById);

  return { lines: formattedLines, ...totals };
}

// GET /api/cart
router.get("/", async (req, res, next) => {
  try {
    const owner = getOwnerId(req);
    await ensureCart(owner, req.user ? req.user.id : null);
    const cart = await getSerializedCart(owner);
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// POST /api/cart/items  { menuItemId, qty }
router.post("/items", async (req, res, next) => {
  try {
    const { menuItemId, qty = 1 } = req.body || {};
    if (!menuItemId) return res.status(400).json({ error: "menuItemId is required." });

    const [item] = await db.query("SELECT id FROM menu_items WHERE id = ? LIMIT 1", [menuItemId]);
    if (!item) return res.status(404).json({ error: "Menu item not found." });

    const owner = getOwnerId(req);
    await ensureCart(owner, req.user ? req.user.id : null);

    const quantity = Math.max(1, Math.min(20, Number(qty) || 1));
    await db.query(
      `INSERT INTO cart_lines (id, owner_id, menu_item_id, qty)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)`,
      [uuidv4(), owner, menuItemId, quantity]
    );

    const cart = await getSerializedCart(owner);

    logActivity({
      userId: req.user ? req.user.id : null,
      eventType: "ADD_TO_CART",
      req,
      metadata: { menuItemId, qty: quantity }
    });

    res.status(201).json(cart);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/cart/items/:menuItemId  { qty }  — set an absolute quantity
router.patch("/items/:menuItemId", async (req, res, next) => {
  try {
    const { qty } = req.body || {};
    if (qty === undefined) return res.status(400).json({ error: "qty is required." });

    const owner = getOwnerId(req);
    const quantity = Number(qty);

    if (quantity <= 0) {
      await db.query("DELETE FROM cart_lines WHERE owner_id = ? AND menu_item_id = ?", [
        owner,
        req.params.menuItemId
      ]);
      logActivity({
        userId: req.user ? req.user.id : null,
        eventType: "REMOVE_FROM_CART",
        req,
        metadata: { menuItemId: req.params.menuItemId }
      });
    } else {
      await db.query(
        "UPDATE cart_lines SET qty = ? WHERE owner_id = ? AND menu_item_id = ?",
        [quantity, owner, req.params.menuItemId]
      );
      logActivity({
        userId: req.user ? req.user.id : null,
        eventType: "UPDATE_CART_QTY",
        req,
        metadata: { menuItemId: req.params.menuItemId, qty: quantity }
      });
    }

    const cart = await getSerializedCart(owner);
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/items/:menuItemId
router.delete("/items/:menuItemId", async (req, res, next) => {
  try {
    const owner = getOwnerId(req);
    await db.query("DELETE FROM cart_lines WHERE owner_id = ? AND menu_item_id = ?", [
      owner,
      req.params.menuItemId
    ]);

    logActivity({
      userId: req.user ? req.user.id : null,
      eventType: "REMOVE_FROM_CART",
      req,
      metadata: { menuItemId: req.params.menuItemId }
    });

    const cart = await getSerializedCart(owner);
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart  — clear the cart
router.delete("/", async (req, res, next) => {
  try {
    const owner = getOwnerId(req);
    await db.query("DELETE FROM cart_lines WHERE owner_id = ?", [owner]);
    const cart = await getSerializedCart(owner);
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
