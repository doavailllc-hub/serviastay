ALTER TABLE experience_bookings
  ADD COLUMN amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total;

ALTER TABLE experience_bookings
  ADD COLUMN balance_due DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER amount_paid;

ALTER TABLE experience_bookings
  ADD COLUMN razorpay_order_id VARCHAR(191) NULL AFTER payment_status;

ALTER TABLE experience_bookings
  ADD COLUMN razorpay_payment_id VARCHAR(191) NULL AFTER razorpay_order_id;

UPDATE experience_bookings
SET amount_paid = CASE WHEN payment_status = 'Paid' THEN total ELSE 0 END,
    balance_due = CASE WHEN payment_status = 'Paid' THEN 0 ELSE total END;

ALTER TABLE experience_bookings
  ADD UNIQUE INDEX uq_experience_booking_payment (razorpay_payment_id);
