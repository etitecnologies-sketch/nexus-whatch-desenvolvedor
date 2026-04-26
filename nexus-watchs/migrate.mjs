#!/usr/bin/env node
// migrate.mjs - Roda SQL puro para renomear openId → supabaseId
import mysql from "mysql2/promise";

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) { console.error("❌ DATABASE_URL não configurada"); process.exit(1); }

  console.log("[Migration] Conectando ao banco...");
  const connection = await mysql.createConnection(databaseUrl);

  try {
    // Verifica se a coluna openId ainda existe
    const [cols] = await connection.execute(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'openId'
    `);

    if (cols.length > 0) {
      console.log("[Migration] Renomeando openId → supabaseId...");
      await connection.execute(`ALTER TABLE users CHANGE COLUMN openId supabaseId VARCHAR(255) NOT NULL`);
      console.log("[Migration] ✅ Coluna renomeada!");
    } else {
      console.log("[Migration] ✅ supabaseId já existe, nada a fazer.");
    }

    const tables = [
      `CREATE TABLE IF NOT EXISTS devices (
        id INT AUTO_INCREMENT PRIMARY KEY, userId INT NOT NULL,
        name VARCHAR(255) NOT NULL, type ENUM('dvr','nvr','ip_camera') NOT NULL,
        manufacturer VARCHAR(100) NOT NULL DEFAULT 'generic',
        connectionType ENUM('ip','ddns','p2p','qrcode') NOT NULL,
        ipAddress VARCHAR(45), ddnsAddress VARCHAR(255), p2pId VARCHAR(255),
        username VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL,
        port INT DEFAULT 8000, status ENUM('online','offline','error') NOT NULL DEFAULT 'offline',
        latency INT, lastSeen TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS cameras (
        id INT AUTO_INCREMENT PRIMARY KEY, deviceId INT NOT NULL, userId INT NOT NULL,
        name VARCHAR(255) NOT NULL, channelNumber INT NOT NULL, rtspUrl VARCHAR(500),
        resolution ENUM('sd','hd','fullhd','4k') NOT NULL DEFAULT 'hd',
        isPtzEnabled INT NOT NULL DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY, userId INT NOT NULL,
        name VARCHAR(255) NOT NULL, description TEXT, icon VARCHAR(50), color VARCHAR(50),
        \`order\` INT DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS favoriteCameras (
        id INT AUTO_INCREMENT PRIMARY KEY, favoriteId INT NOT NULL,
        cameraId INT NOT NULL, \`order\` INT DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY, userId INT NOT NULL,
        deviceId INT, cameraId INT,
        type ENUM('motion_detection','alarm','device_offline','system_alert') NOT NULL,
        title VARCHAR(255) NOT NULL, message TEXT, isRead INT NOT NULL DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS ptzPresets (
        id INT AUTO_INCREMENT PRIMARY KEY, cameraId INT NOT NULL, userId INT NOT NULL,
        name VARCHAR(255) NOT NULL, panPosition INT, tiltPosition INT,
        zoomLevel INT, presetNumber INT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS videoRecordings (
        id INT AUTO_INCREMENT PRIMARY KEY, userId INT NOT NULL, cameraId INT NOT NULL,
        filename VARCHAR(500) NOT NULL, fileSize INT, duration INT,
        startTime TIMESTAMP NOT NULL, endTime TIMESTAMP NULL, storageKey VARCHAR(500),
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    ];

    for (const sql of tables) {
      await connection.execute(sql);
    }

    console.log("[Migration] ✅ Todas as tabelas verificadas!");

    // Adiciona coluna manufacturer se não existir
    const [manCol] = await connection.execute(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'devices'
        AND COLUMN_NAME = 'manufacturer'
    `);

    if (manCol.length === 0) {
      console.log("[Migration] Adicionando coluna manufacturer...");
      await connection.execute(`
        ALTER TABLE devices
        ADD COLUMN manufacturer VARCHAR(100) DEFAULT 'generic' AFTER type
      `);
      console.log("[Migration] ✅ Coluna manufacturer adicionada!");
    }
  } finally {
    await connection.end();
  }
}

runMigration().catch((err) => {
  console.error("[Migration] ❌ Falha:", err.message);
  process.exit(1);
});
