const crypto = require("crypto");

const BOOKING_TRANSITIONS = Object.freeze({
  Pending: Object.freeze(["Confirmed", "Declined", "Cancelled"]),
  Confirmed: Object.freeze(["Checked-in", "Cancelled"]),
  "Checked-in": Object.freeze(["Checked-out"]),
});

function canTransitionBooking(from, to) {
  return (BOOKING_TRANSITIONS[from] || []).includes(to);
}

function verifyHmacSignature(payload, receivedSignature, secret) {
  if (!secret || !receivedSignature) return false;
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload));
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(String(receivedSignature), "utf8");
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function getWebhookEventId(payload, headerEventId) {
  if (headerEventId) return String(headerEventId);
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload));
  return crypto.createHash("sha256").update(body).digest("hex");
}

function availableDepartureSeats(totalSeats, bookedSeats) {
  return Math.max(0, Number(totalSeats || 0) - Number(bookedSeats || 0));
}

function tripPaymentBreakdown(total, paymentMethod) {
  const bookingTotal = Math.max(0, Math.round(Number(total || 0)));
  const amountPaid = paymentMethod === "pay_later"
    ? Math.min(bookingTotal, Math.max(1, Math.round(bookingTotal * 0.1)))
    : bookingTotal;
  return { amountPaid, balanceDue: bookingTotal - amountPaid };
}

module.exports = { BOOKING_TRANSITIONS, canTransitionBooking, verifyHmacSignature, getWebhookEventId, availableDepartureSeats, tripPaymentBreakdown };
