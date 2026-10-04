/**
 * User Repository: Data access layer saving users directly in MySQL.
 */
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

async function findByEmail(email) {
  if (!email) return null;
  const normalizedEmail = String(email).trim().toLowerCase();
  const rows = await db.query(
    "SELECT id, name, email, password_hash AS passwordHash, phone, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE LOWER(email) = ? LIMIT 1",
    [normalizedEmail]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function findById(id) {
  if (!id) return null;
  const rows = await db.query(
    "SELECT id, name, email, password_hash AS passwordHash, phone, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function create({ name, email, passwordHash, phone, role = "customer" }) {
  const user = {
    id: uuidv4(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    phone: phone ? String(phone).trim() : null,
    role: role || "customer",
    createdAt: new Date()
  };

  await db.query(
    "INSERT INTO users (id, name, email, password_hash, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [user.id, user.name, user.email, user.passwordHash, user.phone, user.role, user.createdAt]
  );

  return {
    ...user,
    createdAt: user.createdAt.toISOString()
  };
}

async function updateProfile(id, { name, phone }) {
  await db.query(
    "UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [name ? name.trim() : null, phone !== undefined ? (phone ? String(phone).trim() : null) : null, id]
  );

  return findById(id);
}

async function getAll() {
  const rows = await db.query(
    "SELECT id, name, email, phone, role, created_at AS createdAt FROM users ORDER BY created_at DESC"
  );
  return rows;
}

module.exports = {
  findByEmail,
  findById,
  create,
  updateProfile,
  getAll
};
