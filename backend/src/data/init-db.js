/**
 * Database Initialization & Seed Script for MySQL.
 * Reads schema.sql, executes table creation, and seeds default records directly into MySQL.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { INITIAL_RESTAURANTS, INITIAL_MENU, INITIAL_OFFERS } = require("./fixtures");

async function run() {
  let mysql;
  try {
    mysql = require("mysql2/promise");
  } catch (err) {
    console.error("❌ 'mysql2' package is not installed. Run 'npm install mysql2' first.");
    process.exit(1);
  }

  const host = process.env.DB_HOST || "127.0.0.1";
  const port = parseInt(process.env.DB_PORT || "3306", 10);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "tiffin_trail";

  console.log(`Connecting to MySQL server at ${host}:${port}...`);
  let connection;
  try {
    connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
    console.log("Connected to MySQL server.");
  } catch (err) {
    console.error(`❌ Could not connect to MySQL server: ${err.message}`);
    process.exit(1);
  }

  try {
    const schemaPath = path.join(__dirname, "../../schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");
    console.log("Applying database schema...");
    await connection.query(sql);
    console.log(`✅ Schema applied successfully. Database '${database}' is ready.`);

    await connection.changeUser({ database });

    // Seed restaurants
    for (const r of INITIAL_RESTAURANTS) {
      await connection.query(
        "INSERT INTO restaurants (id, name, cuisine, rating, time_eta, tags) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)",
        [r.id, r.name, r.cuisine, r.rating, r.time, JSON.stringify(r.tags || [])]
      );
    }
    console.log(`🍱 Seeded ${INITIAL_RESTAURANTS.length} restaurants into MySQL.`);

    // Seed menu items
    for (const m of INITIAL_MENU) {
      await connection.query(
        "INSERT INTO menu_items (id, restaurant_id, name, category, cuisine, price, image, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price)",
        [m.id, m.restaurantId, m.name, m.category || "veg", m.cuisine, m.price, m.image, m.desc]
      );
    }
    console.log(`🍛 Seeded ${INITIAL_MENU.length} menu items into MySQL.`);

    // Seed offers
    for (const o of INITIAL_OFFERS) {
      await connection.query(
        "INSERT INTO offers (id, code, title, description, theme, icon, is_active) VALUES (?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE title=VALUES(title)",
        [o.id, o.code, o.title, o.description, o.theme, o.icon]
      );
    }
    console.log(`🏷️ Seeded ${INITIAL_OFFERS.length} offers into MySQL.`);

    console.log("🎉 MySQL Database initialization completed successfully!");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
