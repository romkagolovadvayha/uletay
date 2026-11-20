CREATE DATABASE IF NOT EXISTS uletay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE uletay;

CREATE TABLE IF NOT EXISTS app_content (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  content LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  vk_id VARCHAR(20) NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL DEFAULT '',
  role ENUM('owner', 'admin') NOT NULL DEFAULT 'owner',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_sessions_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  platform ENUM('ios', 'android', 'web') NOT NULL,
  expo_token VARCHAR(255) NULL,
  endpoint TEXT NULL,
  endpoint_hash CHAR(64) NULL,
  p256dh VARCHAR(255) NULL,
  auth_secret VARCHAR(255) NULL,
  user_agent VARCHAR(255) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_expo_token (expo_token),
  UNIQUE KEY uq_push_endpoint_hash (endpoint_hash),
  KEY idx_push_active_platform (active, platform)
);

CREATE TABLE IF NOT EXISTS push_rustore_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  push_token TEXT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(255) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_rustore_token_hash (token_hash),
  KEY idx_push_rustore_active (active)
);

CREATE TABLE IF NOT EXISTS push_broadcasts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(500) NOT NULL,
  target_path VARCHAR(255) NOT NULL,
  audience ENUM('all', 'native', 'web') NOT NULL,
  native_accepted INT UNSIGNED NOT NULL DEFAULT 0,
  native_failed INT UNSIGNED NOT NULL DEFAULT 0,
  web_sent INT UNSIGNED NOT NULL DEFAULT 0,
  web_failed INT UNSIGNED NOT NULL DEFAULT 0,
  error_message VARCHAR(1000) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_push_broadcast_admin FOREIGN KEY (created_by) REFERENCES admin_users(id),
  KEY idx_push_broadcast_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS push_subscription_favorites (
  subscription_id BIGINT UNSIGNED NOT NULL,
  favorite_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (subscription_id, favorite_key),
  KEY idx_push_favorite_key (favorite_key),
  CONSTRAINT fk_push_favorites_subscription
    FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS push_reminder_deliveries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subscription_id BIGINT UNSIGNED NOT NULL,
  reminder_key VARCHAR(500) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_reminder_delivery (subscription_id, reminder_key),
  KEY idx_push_reminder_sent_at (sent_at),
  CONSTRAINT fk_push_reminder_subscription
    FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vk_id VARCHAR(20) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  avatar_url VARCHAR(2048) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  reply_to INT UNSIGNED NULL,
  request_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_chat_request (user_id,request_id),
  KEY idx_chat_reply (reply_to),
  KEY idx_chat_deleted (deleted_at),
  FOREIGN KEY (user_id) REFERENCES chat_users(id),
  FOREIGN KEY (reply_to) REFERENCES chat_messages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_reports (
  message_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id,user_id),
  FOREIGN KEY (message_id) REFERENCES chat_messages(id),
  FOREIGN KEY (user_id) REFERENCES chat_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  KEY idx_chat_session_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES chat_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_native_auth (
  state_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  client_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload TEXT NOT NULL,
  callback_used BOOLEAN NOT NULL DEFAULT FALSE,
  ticket_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL UNIQUE,
  identity_payload TEXT NULL,
  expires_at TIMESTAMP NOT NULL,
  KEY idx_native_auth_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS artist_wish_votes (
  festival_year SMALLINT UNSIGNED NOT NULL,
  artist_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (festival_year,artist_id,user_id),
  KEY idx_artist_wish_user (festival_year,user_id),
  CONSTRAINT fk_artist_wish_user FOREIGN KEY (user_id) REFERENCES chat_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS artist_wish_mentions (
  festival_year SMALLINT UNSIGNED NOT NULL,
  artist_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  platform ENUM('vk','telegram') NOT NULL,
  author_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_url VARCHAR(2048) NOT NULL,
  source_key VARCHAR(191) NOT NULL,
  kind ENUM('request','like') NOT NULL DEFAULT 'request',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (festival_year,artist_id,platform,author_hash),
  KEY idx_artist_wish_source (festival_year,platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
