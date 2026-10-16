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
