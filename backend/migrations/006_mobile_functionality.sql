CREATE TABLE IF NOT EXISTS servia_trip_wishlist (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  experience_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trip_wishlist_user_experience (user_id, experience_id),
  KEY idx_trip_wishlist_user (user_id)
);

CREATE TABLE IF NOT EXISTS servia_push_devices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  platform VARCHAR(24) NULL,
  device_name VARCHAR(255) NULL,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_device_token (expo_push_token),
  KEY idx_push_devices_user (user_id)
);

CREATE TABLE IF NOT EXISTS servia_account_deletion_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  status ENUM('Pending','Cancelled','Completed') NOT NULL DEFAULT 'Pending',
  reason VARCHAR(500) NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_account_deletion_user_status (user_id, status)
);

CREATE TABLE IF NOT EXISTS servia_host_preferences (
  host_id BIGINT NOT NULL,
  payout_schedule ENUM('weekly','biweekly','monthly') NOT NULL DEFAULT 'weekly',
  tax_name VARCHAR(255) NULL,
  tax_id VARCHAR(100) NULL,
  tax_country VARCHAR(100) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (host_id)
);
