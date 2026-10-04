/**
 * Helper to extract consistent owner key for carts and orders.
 * Returns 'user:<id>' for authenticated users or 'guest:<guestId>' for guest sessions.
 */
function getOwnerId(req) {
  if (req.user && req.user.id) return `user:${req.user.id}`;
  if (req.guestId) return `guest:${req.guestId}`;
  return null;
}

module.exports = { getOwnerId };
