const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../data/db");
const { isValidEmail } = require("../utils/validation");

const router = express.Router();

// POST /api/contact  { name, email, message }
router.post("/", async (req, res, next) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: "name, email and message are required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    const id = uuidv4();
    await db.query(
      "INSERT INTO contact_messages (id, name, email, message, created_at) VALUES (?, ?, ?, ?, ?)",
      [id, name.trim(), email.trim(), message.trim(), new Date()]
    );

    res.status(201).json({ message: "Message sent — we'll reply soon.", id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
