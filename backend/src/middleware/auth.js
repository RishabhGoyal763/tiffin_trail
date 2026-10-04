const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === "production"
    ? (() => { throw new Error("CRITICAL: JWT_SECRET environment variable must be set in production."); })()
    : "dev-secret-change-me"
);

function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme === "Bearer" && token) return token;
  return null;
}

/** Requires a valid JWT. Rejects with 401 otherwise. */
function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

/**
 * Optional auth: if a valid token is present, attaches req.user.
 * Otherwise falls through, relying on a guest session id (x-guest-id header)
 * so carts still work for anonymous users, matching the original
 * frontend's no-login cart behaviour.
 */
function optionalAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // ignore invalid token for optional auth — fall back to guest
    }
  }
  if (!req.user) {
    const guestId = req.headers["x-guest-id"];
    if (guestId) {
      req.guestId = guestId;
    }
  }
  next();
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

module.exports = { requireAuth, optionalAuth, signToken, JWT_SECRET };
