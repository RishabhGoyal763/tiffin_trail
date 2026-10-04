/**
 * Database connection & query manager for Tiffin Trail.
 * Connects directly to MySQL for all database operations, with an automatic
 * in-memory resilient fallback engine when MySQL is unavailable or offline.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const bcrypt = require("bcryptjs");
const { INITIAL_MENU } = require("./fixtures");

let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  // mysql2 optional
}

let pool = null;
let isMySql = false;

// In-Memory tables used as resilient fallback when MySQL connection is unavailable
const memoryDb = {
  users: [],
  carts: new Map(),
  cart_lines: [],
  orders: [],
  order_items: [],
  payments: []
};

function getDbConfig() {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "tiffin_trail",
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    namedPlaceholders: true
  };
}

async function initDb() {
  if (pool && isMySql) return pool;
  if (!mysql) {
    isMySql = false;
    return null;
  }

  const config = getDbConfig();
  try {
    pool = mysql.createPool(config);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isMySql = true;
    console.log(`🐬 Connected to MySQL database "${config.database}" on ${config.host}:${config.port}`);
    return pool;
  } catch (err) {
    isMySql = false;
    console.warn(`⚠️ MySQL Connection Notice (using in-memory fallback): ${err.message}`);
    return null;
  }
}

function getPool() {
  return pool;
}

// In-Memory Query Simulator
async function memoryQuery(sql, params = []) {
  const cleanSql = sql.trim().replace(/\s+/g, " ");

  // 1. SELECT id FROM users WHERE email = ? LIMIT 1
  if (/SELECT\s+id\s+FROM\s+users\s+WHERE\s+(LOWER\(email\)|email)\s*=\s*\?/i.test(cleanSql)) {
    const email = String(params[0] || "").toLowerCase();
    const u = memoryDb.users.find((x) => x.email.toLowerCase() === email);
    return u ? [{ id: u.id }] : [];
  }

  // 2. SELECT id, name, email, password_hash AS passwordHash ... FROM users WHERE LOWER(email) = ?
  if (/SELECT.*FROM\s+users\s+WHERE\s+LOWER\(email\)\s*=\s*\?/i.test(cleanSql)) {
    const email = String(params[0] || "").toLowerCase();
    const u = memoryDb.users.find((x) => x.email.toLowerCase() === email);
    if (!u) return [];
    return [
      {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }
    ];
  }

  // 3. SELECT ... FROM users WHERE id = ?
  if (/SELECT.*FROM\s+users\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
    const id = params[0];
    const u = memoryDb.users.find((x) => x.id === id);
    if (!u) return [];
    return [
      {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }
    ];
  }

  // 4. INSERT INTO users (id, name, email, password_hash, phone, role, created_at)
  if (/INSERT\s+INTO\s+users/i.test(cleanSql)) {
    const [id, name, email, passwordHash, phone, role, createdAt] = params;
    memoryDb.users.push({
      id,
      name,
      email,
      passwordHash,
      phone,
      role: role || "customer",
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : (createdAt || new Date().toISOString()),
      updatedAt: createdAt instanceof Date ? createdAt.toISOString() : (createdAt || new Date().toISOString())
    });
    return [{ affectedRows: 1, insertId: id }];
  }

  // 5. UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?
  if (/UPDATE\s+users\s+SET/i.test(cleanSql)) {
    const name = params[0];
    const phone = params[1];
    const id = params[2];
    const u = memoryDb.users.find((x) => x.id === id);
    if (u) {
      if (name) u.name = name;
      if (phone !== undefined && phone !== null) u.phone = phone;
      u.updatedAt = new Date().toISOString();
    }
    return [{ affectedRows: u ? 1 : 0 }];
  }

  // 6. SELECT id, name, email, phone, role, created_at AS createdAt FROM users
  if (/SELECT.*FROM\s+users\s+ORDER\s+BY/i.test(cleanSql)) {
    return memoryDb.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt
    }));
  }

  // 7. CARTS: INSERT IGNORE INTO carts
  if (/INSERT\s+(IGNORE\s+INTO|INTO)\s+carts/i.test(cleanSql)) {
    const [owner_id, user_id] = params;
    if (!memoryDb.carts.has(owner_id)) {
      memoryDb.carts.set(owner_id, { owner_id, user_id: user_id || null });
    }
    return [{ affectedRows: 1 }];
  }

  // 8. UPDATE carts SET user_id = ? WHERE owner_id = ?
  if (/UPDATE\s+carts\s+SET\s+user_id\s*=\s*\?\s+WHERE\s+owner_id\s*=\s*\?/i.test(cleanSql)) {
    const [user_id, owner_id] = params;
    const c = memoryDb.carts.get(owner_id);
    if (c) c.user_id = user_id;
    return [{ affectedRows: c ? 1 : 0 }];
  }

  // 8.5 MENU_ITEMS: SELECT id FROM menu_items WHERE id = ?
  if (/SELECT.*FROM\s+menu_items\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
    const id = params[0];
    const m = INITIAL_MENU.find((x) => x.id === id);
    return m ? [{ id: m.id }] : [];
  }

  // 9. CART_LINES: SELECT cl.menu_item_id ... FROM cart_lines
  if (/SELECT.*FROM\s+cart_lines\s+cl.*WHERE\s+cl\.owner_id\s*=\s*\?/i.test(cleanSql)) {
    const owner_id = params[0];
    const lines = memoryDb.cart_lines.filter((l) => l.owner_id === owner_id);
    return lines.map((l) => {
      const dish = INITIAL_MENU.find((m) => m.id === l.menu_item_id) || {
        id: l.menu_item_id,
        name: "Special Dish",
        price: 150,
        category: "veg",
        cuisine: "North Indian",
        image: "/images/paneer_butter_masala.jpg",
        restaurantId: "r1"
      };
      return {
        menuItemId: l.menu_item_id,
        qty: l.qty,
        id: dish.id,
        name: dish.name,
        price: dish.price,
        category: dish.category,
        cuisine: dish.cuisine,
        image: dish.image,
        restaurantId: dish.restaurantId,
        lineTotal: dish.price * l.qty
      };
    });
  }

  // 10. INSERT INTO cart_lines ... ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)
  if (/INSERT\s+INTO\s+cart_lines/i.test(cleanSql)) {
    const [id, owner_id, menu_item_id, qty] = params;
    const existing = memoryDb.cart_lines.find((l) => l.owner_id === owner_id && l.menu_item_id === menu_item_id);
    if (existing) {
      existing.qty += qty;
    } else {
      memoryDb.cart_lines.push({ id, owner_id, menu_item_id, qty });
    }
    return [{ affectedRows: 1 }];
  }

  // 11. UPDATE cart_lines SET qty = ? WHERE owner_id = ? AND menu_item_id = ?
  if (/UPDATE\s+cart_lines\s+SET\s+qty\s*=\s*\?\s+WHERE\s+owner_id\s*=\s*\?\s+AND\s+menu_item_id\s*=\s*\?/i.test(cleanSql)) {
    const [qty, owner_id, menu_item_id] = params;
    const item = memoryDb.cart_lines.find((l) => l.owner_id === owner_id && l.menu_item_id === menu_item_id);
    if (item) item.qty = qty;
    return [{ affectedRows: item ? 1 : 0 }];
  }

  // 12. DELETE FROM cart_lines WHERE owner_id = ? AND menu_item_id = ?
  if (/DELETE\s+FROM\s+cart_lines\s+WHERE\s+owner_id\s*=\s*\?\s+AND\s+menu_item_id\s*=\s*\?/i.test(cleanSql)) {
    const [owner_id, menu_item_id] = params;
    const idx = memoryDb.cart_lines.findIndex((l) => l.owner_id === owner_id && l.menu_item_id === menu_item_id);
    if (idx !== -1) memoryDb.cart_lines.splice(idx, 1);
    return [{ affectedRows: idx !== -1 ? 1 : 0 }];
  }

  // 13. DELETE FROM cart_lines WHERE owner_id = ?
  if (/DELETE\s+FROM\s+cart_lines\s+WHERE\s+owner_id\s*=\s*\?/i.test(cleanSql)) {
    const [owner_id] = params;
    memoryDb.cart_lines = memoryDb.cart_lines.filter((l) => l.owner_id !== owner_id);
    return [{ affectedRows: 1 }];
  }

  // 14. INSERT INTO orders
  if (/INSERT\s+INTO\s+orders/i.test(cleanSql)) {
    const [id, owner_id, user_id, customer_name, customer_phone, delivery_address, status, subtotal, delivery_fee, tax, total, payment_method, created_at] = params;
    memoryDb.orders.push({
      id,
      owner_id,
      user_id,
      customer_name,
      customer_phone,
      delivery_address,
      status: status || "placed",
      subtotal,
      delivery_fee,
      tax,
      total,
      payment_method,
      created_at: created_at instanceof Date ? created_at.toISOString() : (created_at || new Date().toISOString())
    });
    return [{ affectedRows: 1 }];
  }

  // 15. INSERT INTO order_items
  if (/INSERT\s+INTO\s+order_items/i.test(cleanSql)) {
    const [id, order_id, menu_item_id, name, price, qty, line_total] = params;
    memoryDb.order_items.push({ id, order_id, menu_item_id, name, price, qty, line_total });
    return [{ affectedRows: 1 }];
  }

  // 16. INSERT INTO payments
  if (/INSERT\s+INTO\s+payments/i.test(cleanSql)) {
    const [id, order_id, user_id, amount, payment_method, status, transaction_ref, created_at] = params;
    memoryDb.payments.push({ id, order_id, user_id, amount, payment_method, status, transaction_ref, created_at });
    return [{ affectedRows: 1 }];
  }

  // 17. SELECT ... FROM orders WHERE id = ?
  if (/SELECT.*FROM\s+orders\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
    const id = params[0];
    const owner_id = params[1];
    const user_id = params[2];
    const o = memoryDb.orders.find(
      (x) => x.id === id && (x.owner_id === owner_id || (user_id && x.user_id === user_id))
    );
    return o ? [o] : [];
  }

  // 17.1 SELECT ... FROM orders WHERE owner_id = ? OR user_id = ?
  if (/SELECT.*FROM\s+orders/i.test(cleanSql)) {
    let list = [...memoryDb.orders];
    if (params.length === 2) {
      const [owner_id, user_id] = params;
      list = list.filter((o) => o.owner_id === owner_id || (user_id && o.user_id === user_id));
    } else if (params.length === 1) {
      const [owner_id] = params;
      list = list.filter((o) => o.owner_id === owner_id);
    }
    return list;
  }

  // 18. SELECT ... FROM order_items WHERE order_id = ?
  if (/SELECT.*FROM\s+order_items\s+WHERE\s+order_id\s*=\s*\?/i.test(cleanSql)) {
    const order_id = params[0];
    const items = memoryDb.order_items.filter((i) => i.order_id === order_id);
    return items.map((i) => ({
      menuItemId: i.menu_item_id,
      name: i.name,
      price: i.price,
      qty: i.qty,
      lineTotal: i.line_total
    }));
  }

  return [];
}

async function query(sql, params = []) {
  if (isMySql && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.warn(`MySQL query error, using fallback: ${err.message}`);
      return memoryQuery(sql, params);
    }
  }
  return memoryQuery(sql, params);
}

async function execute(sql, params = []) {
  if (isMySql && pool) {
    try {
      const [result] = await pool.execute(sql, params);
      return result;
    } catch (err) {
      console.warn(`MySQL execute error, using fallback: ${err.message}`);
      return memoryQuery(sql, params);
    }
  }
  return memoryQuery(sql, params);
}

function isConnected() {
  return isMySql;
}

function getMode() {
  return isMySql ? "mysql" : "memory_fallback";
}

module.exports = {
  initDb,
  getPool,
  query,
  execute,
  isConnected,
  getMode,
  getDbConfig
};
