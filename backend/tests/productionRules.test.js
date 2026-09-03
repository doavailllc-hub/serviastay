const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  canTransitionBooking,
  verifyHmacSignature,
  getWebhookEventId,
  availableDepartureSeats,
  tripPaymentBreakdown,
} = require("../utils/productionRules");

test("booking lifecycle permits only forward production transitions", () => {
  assert.equal(canTransitionBooking("Pending", "Confirmed"), true);
  assert.equal(canTransitionBooking("Confirmed", "Checked-in"), true);
  assert.equal(canTransitionBooking("Checked-in", "Checked-out"), true);
  assert.equal(canTransitionBooking("Checked-out", "Confirmed"), false);
  assert.equal(canTransitionBooking("Cancelled", "Confirmed"), false);
  assert.equal(canTransitionBooking("Pending", "Checked-out"), false);
});

test("webhook HMAC verification rejects tampering and malformed signatures", () => {
  const payload = Buffer.from('{"event":"payment.captured"}');
  const secret = "test_webhook_secret_1234567890";
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  assert.equal(verifyHmacSignature(payload, signature, secret), true);
  assert.equal(verifyHmacSignature(Buffer.from('{"event":"payment.failed"}'), signature, secret), false);
  assert.equal(verifyHmacSignature(payload, "short", secret), false);
  assert.equal(verifyHmacSignature(payload, signature, "wrong-secret"), false);
});

test("webhook fallback ids are deterministic for replay protection", () => {
  const payload = Buffer.from('{"id":"pay_123"}');
  assert.equal(getWebhookEventId(payload), getWebhookEventId(payload));
  assert.notEqual(getWebhookEventId(payload), getWebhookEventId(Buffer.from('{"id":"pay_456"}')));
  assert.equal(getWebhookEventId(payload, "provider-event-1"), "provider-event-1");
});

test("departure availability never becomes negative", () => {
  assert.equal(availableDepartureSeats(20, 7), 13);
  assert.equal(availableDepartureSeats(10, 10), 0);
  assert.equal(availableDepartureSeats(5, 8), 0);
});

test("pay-at-trip charges a 10% confirmation advance and preserves the balance", () => {
  assert.deepEqual(tripPaymentBreakdown(11200, "pay_later"), {
    amountPaid: 1120,
    balanceDue: 10080,
  });
  assert.deepEqual(tripPaymentBreakdown(11200, "razorpay"), {
    amountPaid: 11200,
    balanceDue: 0,
  });
});
