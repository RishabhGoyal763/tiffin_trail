/**
 * Storage & Database verification.
 * Ensures MySQL connection and default demo records exist.
 */
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

async function runSeed() {
  try {
    await db.initDb();
    const rows = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", ["aman@example.com"]);
    if (rows.length === 0) {
      const demoHash = await bcrypt.hash("password123", 10);
      await db.query(
        "INSERT INTO users (id, name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?, ?)",
        [uuidv4(), "Aman Sharma", "aman@example.com", demoHash, "9876543210", "customer"]
      );
      console.log("👤 Seeded demo user into MySQL: aman@example.com (password: password123)");
    }
    console.log("✅ MySQL Database verified & ready.");
  } catch (err) {
    console.warn(`⚠️ MySQL Seed Notice: ${err.message}`);
  }
}

if (require.main === module) {
  runSeed().then(() => process.exit(0));
}

module.exports = { runSeed };
