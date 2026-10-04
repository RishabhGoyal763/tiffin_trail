const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../data/db");
const { optionalAuth } = require("../middleware/auth");
const { computeTotals } = require("../utils/pricing");
const { getOwnerId } = require("../utils/owner");

const router = express.Router();
router.use(optionalAuth);

const VALID_STATUSES = ["placed", "preparing", "out_for_delivery", "delivered", "cancelled"];

// POST /api/orders  { name, phone, address, paymentMethod }
router.post("/", async (req, res, next) => {
  try {
    const { name, phone, address, paymentMethod = "cash_on_delivery" } = req.body || {};
    if (!name || !phone || !address) {
      return res.status(400).json({ error: "name, phone and address are required to place an order." });
    }

    const owner = getOwnerId(req);

    // Read current cart lines from MySQL
    const cartLines = await db.query(
      `SELECT cl.menu_item_id AS menuItemId, cl.qty, m.name, m.price
       FROM cart_lines cl
       JOIN menu_items m ON cl.menu_item_id = m.id
       WHERE cl.owner_id = ?`,
      [owner]
    );

    if (cartLines.length === 0) {
      return res.status(400).json({ error: "Your cart is empty — add a dish before checking out." });
    }

    const menuById = new Map(cartLines.map((m) => [m.menuItemId, { price: m.price }]));
    const totals = computeTotals(cartLines, menuById);

    const orderId = uuidv4();
    const userId = req.user ? req.user.id : null;
    const now = new Date();

    // Insert order header into MySQL
    await db.query(
      `INSERT INTO orders 
        (id, owner_id, user_id, customer_name, customer_phone, delivery_address, status, subtotal, delivery_fee, tax, total, payment_method, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        owner,
        userId,
        name.trim(),
        phone.trim(),
        address.trim(),
        "placed",
        totals.subtotal,
        totals.delivery,
        totals.tax,
        totals.total,
        paymentMethod,
        now
      ]
    );

    // Insert order line items into MySQL
    const orderItems = [];
    for (const line of cartLines) {
      const lineTotal = line.price * line.qty;
      const itemId = uuidv4();
      await db.query(
        `INSERT INTO order_items (id, order_id, menu_item_id, name, price, qty, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, orderId, line.menuItemId, line.name, line.price, line.qty, lineTotal]
      );
      orderItems.push({
        menuItemId: line.menuItemId,
        name: line.name,
        price: line.price,
        qty: line.qty,
        lineTotal
      });
    }

    // Insert payment record into MySQL (Core Transaction Ledger)
    const paymentId = uuidv4();
    const transactionRef = "TXN-" + orderId.slice(0, 8).toUpperCase();
    await db.query(
      `INSERT INTO payments (id, order_id, user_id, amount, payment_method, status, transaction_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, orderId, userId, totals.total, paymentMethod, "completed", transactionRef, now]
    );

    // Clear cart in MySQL
    await db.query("DELETE FROM cart_lines WHERE owner_id = ?", [owner]);

    // Asynchronously log checkout event to MongoDB
    const { logActivity } = require("../data/mongo");
    logActivity({
      userId,
      eventType: "CHECKOUT_ORDER",
      req,
      metadata: { orderId, total: totals.total, paymentMethod, transactionRef }
    });

    const order = {
      id: orderId,
      ownerId: owner,
      userId,
      items: orderItems,
      subtotal: totals.subtotal,
      delivery: totals.delivery,
      tax: totals.tax,
      total: totals.total,
      status: "placed",
      payment: {
        id: paymentId,
        amount: totals.total,
        method: paymentMethod,
        status: "completed",
        transactionRef
      },
      customer: { name: name.trim(), phone: phone.trim(), address: address.trim() },
      paymentMethod,
      createdAt: now.toISOString()
    };

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders  — order history from MySQL
router.get("/", async (req, res, next) => {
  try {
    const owner = getOwnerId(req);
    const userId = req.user ? req.user.id : null;

    let ordersQuery = "SELECT * FROM orders WHERE owner_id = ?";
    const params = [owner];

    if (userId) {
      ordersQuery = "SELECT * FROM orders WHERE owner_id = ? OR user_id = ? ORDER BY created_at DESC";
      params.push(userId);
    } else {
      ordersQuery += " ORDER BY created_at DESC";
    }

    const orderRows = await db.query(ordersQuery, params);

    const orders = [];
    for (const o of orderRows) {
      const itemRows = await db.query(
        "SELECT menu_item_id AS menuItemId, name, price, qty, line_total AS lineTotal FROM order_items WHERE order_id = ?",
        [o.id]
      );

      orders.push({
        id: o.id,
        ownerId: o.owner_id,
        userId: o.user_id,
        items: itemRows,
        subtotal: o.subtotal,
        delivery: o.delivery_fee,
        tax: o.tax,
        total: o.total,
        status: o.status,
        customer: {
          name: o.customer_name,
          phone: o.customer_phone,
          address: o.delivery_address
        },
        paymentMethod: o.payment_method,
        createdAt: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString()
      });
    }

    res.json({ count: orders.length, orders });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res, next) => {
  try {
    const owner = getOwnerId(req);
    const userId = req.user ? req.user.id : null;
    let rows;
    if (userId) {
      rows = await db.query(
        "SELECT * FROM orders WHERE id = ? AND (owner_id = ? OR user_id = ?) LIMIT 1",
        [req.params.id, owner, userId]
      );
    } else {
      rows = await db.query(
        "SELECT * FROM orders WHERE id = ? AND owner_id = ? LIMIT 1",
        [req.params.id, owner]
      );
    }
    if (rows.length === 0) return res.status(404).json({ error: "Order not found." });

    const o = rows[0];
    const items = await db.query(
      "SELECT menu_item_id AS menuItemId, name, price, qty, line_total AS lineTotal FROM order_items WHERE order_id = ?",
      [o.id]
    );

    res.json({
      id: o.id,
      ownerId: o.owner_id,
      userId: o.user_id,
      items,
      subtotal: o.subtotal,
      delivery: o.delivery_fee,
      tax: o.tax,
      total: o.total,
      status: o.status,
      customer: {
        name: o.customer_name,
        phone: o.customer_phone,
        address: o.delivery_address
      },
      paymentMethod: o.payment_method,
      createdAt: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/status  { status }
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const owner = getOwnerId(req);
    const [order] = await db.query("SELECT * FROM orders WHERE id = ? AND owner_id = ? LIMIT 1", [
      req.params.id,
      owner
    ]);
    if (!order) return res.status(404).json({ error: "Order not found." });

    await db.query("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
      status,
      req.params.id
    ]);

    order.status = status;
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
