/**
 * Input validators for user registration, authentication, contact messages, etc.
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone) {
  if (!phone) return true; // Optional phone
  const cleaned = String(phone).replace(/[\s\-\(\)\+]/g, "");
  return /^\d{10,12}$/.test(cleaned);
}

module.exports = {
  isValidEmail,
  isValidPhone
};
