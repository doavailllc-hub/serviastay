CREATE TABLE IF NOT EXISTS servia_auth_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(320) NOT NULL, purpose VARCHAR(40) NOT NULL,
  code_hash CHAR(64) NOT NULL, attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_auth_code_email_purpose (email, purpose), INDEX idx_auth_code_expiry (expires_at)
);

CREATE TABLE IF NOT EXISTS servia_host_submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  submission_key VARCHAR(100) NOT NULL, user_id BIGINT NOT NULL,
  submission_type ENUM('property','experience') NOT NULL,
  status ENUM('Processing','Completed') NOT NULL DEFAULT 'Processing', entity_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_host_submission_key (submission_key), INDEX idx_host_submission_user (user_id, submission_type)
);

CREATE TABLE IF NOT EXISTS servia_payment_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  payment_id VARCHAR(191) NOT NULL, order_id VARCHAR(191) NOT NULL,
  user_id BIGINT NOT NULL, booking_type VARCHAR(40) NOT NULL, booking_id BIGINT NOT NULL,
  amount DECIMAL(12,2) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment_claim_payment (payment_id), UNIQUE KEY uq_payment_claim_order (order_id),
  INDEX idx_payment_claim_booking (booking_type, booking_id)
);

CREATE TABLE IF NOT EXISTS servia_webhook_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(40) NOT NULL, event_id VARCHAR(191) NOT NULL, event_type VARCHAR(100) NOT NULL,
  status ENUM('Processing','Processed','Failed') NOT NULL DEFAULT 'Processing',
  payload JSON NULL, error_message VARCHAR(1000) NULL, attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_webhook_provider_event (provider, event_id), INDEX idx_webhook_status (status, updated_at)
);

CREATE TABLE IF NOT EXISTS servia_gateway_refunds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  refund_request_id BIGINT NOT NULL, booking_id BIGINT NOT NULL,
  payment_id VARCHAR(191) NOT NULL, gateway_refund_id VARCHAR(191) NULL,
  amount DECIMAL(12,2) NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'Created',
  error_message VARCHAR(1000) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gateway_refund_request (refund_request_id),
  UNIQUE KEY uq_gateway_refund_id (gateway_refund_id), INDEX idx_gateway_refund_status (status)
);
