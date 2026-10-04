/**
 * MongoDB connection and event logger.
 * Stores and serves flexible content catalogs (menu_items, restaurants, offers)
 * and user activity event logs.
 */
const { MongoClient } = require("mongodb");
const { INITIAL_RESTAURANTS, INITIAL_MENU, INITIAL_OFFERS } = require("./fixtures");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tiffin_trail";
const DB_NAME = process.env.MONGODB_DB || "tiffin_trail";

let client = null;
let db = null;
let isConnected = false;

async function initMongo() {
  if (db && isConnected) return db;

  try {
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    await client.connect();
    db = client.db(DB_NAME);
    isConnected = true;
    console.log(`🍃 Connected to MongoDB at ${MONGODB_URI}`);

    // Create indexes for efficient querying
    await db.collection("menu_items").createIndex({ restaurantId: 1 });
    await db.collection("menu_items").createIndex({ category: 1 });
    await db.collection("menu_items").createIndex({ price: 1 });
    await db.collection("restaurants").createIndex({ cuisine: 1 });
    await db.collection("offers").createIndex({ code: 1 }, { unique: true, sparse: true });
    await db.collection("user_activity_logs").createIndex({ userId: 1, timestamp: -1 });
    await db.collection("user_activity_logs").createIndex({ eventType: 1 });

    await seedMongoContent();
    return db;
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️ MongoDB connection notice: ${err.message}`);
    return null;
  }
}

function getDb() {
  return db;
}

function isMongoConnected() {
  return isConnected;
}

/**
 * Log user actions, journeys, and system interactions to MongoDB user_activity_logs
 */
async function logActivity({ userId = null, eventType, req = null, metadata = {} }) {
  if (!db || !isConnected) return;
  try {
    const ipAddress = req ? (req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1") : "127.0.0.1";
    const userAgent = req ? (req.headers["user-agent"] || "unknown") : "system";

    const logEntry = {
      userId: userId || (req?.user ? req.user.id : null),
      eventType,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
      metadata: metadata || {},
      timestamp: new Date()
    };

    await db.collection("user_activity_logs").insertOne(logEntry);
  } catch (err) {
    console.warn("Failed to write activity log to MongoDB:", err.message);
  }
}

async function seedMongoContent() {
  if (!db) return;
  try {
    const restCount = await db.collection("restaurants").countDocuments();
    if (restCount === 0) {
      await db.collection("restaurants").insertMany(INITIAL_RESTAURANTS);
      console.log(`🍃 Seeded ${INITIAL_RESTAURANTS.length} restaurants into MongoDB.`);
    }

    const menuCount = await db.collection("menu_items").countDocuments();
    if (menuCount === 0) {
      await db.collection("menu_items").insertMany(INITIAL_MENU);
      console.log(`🍃 Seeded ${INITIAL_MENU.length} flexible menu items into MongoDB.`);
    }

    const offersCount = await db.collection("offers").countDocuments();
    if (offersCount === 0) {
      await db.collection("offers").insertMany(INITIAL_OFFERS);
      console.log(`🍃 Seeded ${INITIAL_OFFERS.length} offers into MongoDB.`);
    }
  } catch (err) {
    console.warn("MongoDB seed notice:", err.message);
  }
}

module.exports = {
  initMongo,
  getDb,
  isMongoConnected,
  logActivity
};
