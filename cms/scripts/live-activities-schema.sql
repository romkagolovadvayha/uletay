CREATE TABLE IF NOT EXISTS festival_activity_installations (
  installation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  secret_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at DATETIME(3) NOT NULL,
  KEY idx_activity_installation_expiry (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS festival_live_activities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  installation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  activity_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  favorite_key VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
  push_token VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  push_token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  environment ENUM('production','sandbox') NOT NULL,
  client_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_state_json TEXT NOT NULL,
  last_payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  last_sent_timestamp BIGINT UNSIGNED NOT NULL DEFAULT 0,
  failures INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(3) NULL,
  lease_token CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  lease_until DATETIME(3) NULL,
  expires_at DATETIME(3) NOT NULL,
  ended_at DATETIME(3) NULL,
  ended_reason VARCHAR(32) NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_festival_activity (installation_id, activity_id),
  KEY idx_festival_activity_due (ended_at, next_attempt_at),
  CONSTRAINT fk_festival_activity_installation FOREIGN KEY (installation_id)
    REFERENCES festival_activity_installations(installation_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
