/**
 * Mirrors the pricing logic from the frontend's renderCart():
 * free delivery over ₹399, otherwise ₹40 flat fee; 5% tax, rounded.
 */
function computeTotals(lines, menuById) {
  const subtotal = lines.reduce((sum, line) => {
    const item = menuById.get(line.menuItemId);
    if (!item) return sum;
    return sum + item.price * line.qty;
  }, 0);

  const delivery = lines.length === 0 ? 0 : subtotal >= 399 ? 0 : 40;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + delivery + tax;

  return { subtotal, delivery, tax, total };
}

module.exports = { computeTotals };
