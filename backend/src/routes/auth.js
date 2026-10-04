const express = require("express");
const bcrypt = require("bcryptjs");
const userRepository = require("../data/userRepository");
const { signToken, requireAuth } = require("../middleware/auth");
const { logActivity } = require("../data/mongo");
const { isValidEmail, isValidPhone } = require("../utils/validation");

const router = express.Router();

// POST /api/auth/register  { name, email, password, phone? }
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body || {};

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Please enter a valid name (at least 2 characters)." });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: "Please provide a valid 10-digit phone number." });
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email address already exists. Please sign in instead." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      name,
      email,
      passwordHash,
      phone: phone || null,
      role: "customer"
    });

    const token = signToken({ id: user.id, email: user.email });

    // Asynchronously log registration activity to MongoDB
    logActivity({
      userId: user.id,
      eventType: "USER_REGISTER",
      req,
      metadata: { name: user.name, email: user.email }
    });

    res.status(201).json({
      message: "Registration successful! Welcome to Tiffin Trail.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password. Please check your credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password. Please check your credentials." });
    }

    const token = signToken({ id: user.id, email: user.email });

    // Asynchronously log login activity to MongoDB
    logActivity({
      userId: user.id,
      eventType: "USER_LOGIN",
      req,
      metadata: { email: user.email }
    });

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  (current authenticated user)
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile  (update name and phone)
router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const { name, phone } = req.body || {};
    if (name && (typeof name !== "string" || name.trim().length < 2)) {
      return res.status(400).json({ error: "Name must be at least 2 characters." });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: "Please enter a valid phone number." });
    }

    const updated = await userRepository.updateProfile(req.user.id, { name, phone });
    if (!updated) {
      return res.status(404).json({ error: "User not found." });
    }

    // Asynchronously log profile update activity to MongoDB
    logActivity({
      userId: req.user.id,
      eventType: "USER_PROFILE_UPDATE",
      req,
      metadata: { name: updated.name, phone: updated.phone }
    });

    res.json({
      message: "Profile updated successfully.",
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
