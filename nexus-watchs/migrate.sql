-- Migration: Nexus Watch - Manus → Supabase
-- Renomeia openId para supabaseId e cria todas as tabelas se não existirem

-- Tabela users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supabaseId VARCHAR(255) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Se a coluna openId existe, renomeia para supabaseId
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'openId'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE users CHANGE COLUMN openId supabaseId VARCHAR(255) NOT NULL',
  'SELECT "openId column not found, skipping rename" AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Garante unique index em supabaseId
ALTER TABLE users ADD UNIQUE INDEX IF NOT EXISTS idx_supabaseId (supabaseId);

-- Tabela devices
CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('dvr', 'nvr', 'ip_camera') NOT NULL,
  connectionType ENUM('ip', 'ddns', 'p2p', 'qrcode') NOT NULL,
  ipAddress VARCHAR(45),
  ddnsAddress VARCHAR(255),
  p2pId VARCHAR(255),
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  port INT DEFAULT 8000,
  status ENUM('online', 'offline', 'error') NOT NULL DEFAULT 'offline',
  latency INT,
  lastSeen TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela cameras
CREATE TABLE IF NOT EXISTS cameras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deviceId INT NOT NULL,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  channelNumber INT NOT NULL,
  rtspUrl VARCHAR(500),
  resolution ENUM('sd', 'hd', 'fullhd', '4k') NOT NULL DEFAULT 'hd',
  isPtzEnabled INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela favorites
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  `order` INT DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela favoriteCameras
CREATE TABLE IF NOT EXISTS favoriteCameras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  favoriteId INT NOT NULL,
  cameraId INT NOT NULL,
  `order` INT DEFAULT 0
);

-- Tabela notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  deviceId INT,
  cameraId INT,
  type ENUM('motion_detection', 'alarm', 'device_offline', 'system_alert') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  isRead INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela ptzPresets
CREATE TABLE IF NOT EXISTS ptzPresets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cameraId INT NOT NULL,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  panPosition INT,
  tiltPosition INT,
  zoomLevel INT,
  presetNumber INT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela videoRecordings
CREATE TABLE IF NOT EXISTS videoRecordings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  cameraId INT NOT NULL,
  filename VARCHAR(500) NOT NULL,
  fileSize INT,
  duration INT,
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP NULL,
  storageKey VARCHAR(500),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

SELECT 'Migration concluída com sucesso!' AS resultado;
