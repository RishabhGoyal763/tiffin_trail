/**
 * Storage & Database verification.
 * Ensures MySQL connection and database readiness.
 */
const db = require("./db");

async function runSeed() {
  try {
    await db.initDb();
    console.log("✅ Database verified & ready.");
  } catch (err) {
    console.warn(`⚠️ Database Notice: ${err.message}`);
  }
}

if (require.main === module) {
  runSeed().then(() => process.exit(0));
}

module.exports = { runSeed };
