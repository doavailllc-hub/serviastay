CREATE TABLE IF NOT EXISTS servia_email_outbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recipient VARCHAR(320) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_body MEDIUMTEXT NOT NULL,
  email_type VARCHAR(60) NOT NULL DEFAULT 'transactional',
  dedupe_key VARCHAR(191) NULL,
  status ENUM('Pending','Sending','Retry','Sent','Failed') NOT NULL DEFAULT 'Pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts INT UNSIGNED NOT NULL DEFAULT 5,
  last_error VARCHAR(1000) NULL,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_outbox_dedupe (dedupe_key),
  INDEX idx_email_outbox_delivery (status, next_attempt_at)
);
