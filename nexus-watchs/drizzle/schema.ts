import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Supabase Auth identifier (UUID) */
  supabaseId: varchar("supabaseId", { length: 255 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Devices table - DVRs, NVRs, and IP cameras
 */
export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["dvr", "nvr", "ip_camera"]).notNull(),
  manufacturer: varchar("manufacturer", { length: 100 }).default("generic").notNull(),
  connectionType: mysqlEnum("connectionType", ["ip", "ddns", "p2p", "qrcode"]).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  ddnsAddress: varchar("ddnsAddress", { length: 255 }),
  p2pId: varchar("p2pId", { length: 255 }),
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  port: int("port").default(554),
  status: mysqlEnum("status", ["online", "offline", "error"]).default("offline").notNull(),
  latency: int("latency"), // milliseconds
  lastSeen: timestamp("lastSeen"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

/**
 * Cameras table - Individual cameras connected to devices
 */
export const cameras = mysqlTable("cameras", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  channelNumber: int("channelNumber").notNull(),
  rtspUrl: varchar("rtspUrl", { length: 500 }),
  resolution: mysqlEnum("resolution", ["sd", "hd", "fullhd", "4k"]).default("hd").notNull(),
  isPtzEnabled: int("isPtzEnabled").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Camera = typeof cameras.$inferSelect;
export type InsertCamera = typeof cameras.$inferInsert;

/**
 * Favorites table - Grouped cameras for quick access
 */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Loja", "Estoque", "Caixa"
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // icon name from lucide-react
  color: varchar("color", { length: 50 }), // color class for UI
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Favorite cameras - Junction table for cameras in favorites
 */
export const favoriteCameras = mysqlTable("favoriteCameras", {
  id: int("id").autoincrement().primaryKey(),
  favoriteId: int("favoriteId").notNull(),
  cameraId: int("cameraId").notNull(),
  order: int("order").default(0),
});

export type FavoriteCamera = typeof favoriteCameras.$inferSelect;
export type InsertFavoriteCamera = typeof favoriteCameras.$inferInsert;

/**
 * Notifications table - Alert history
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: int("deviceId"),
  cameraId: int("cameraId"),
  type: mysqlEnum("type", ["motion_detection", "alarm", "device_offline", "system_alert"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * PTZ Presets table - Saved positions for PTZ cameras
 */
export const ptzPresets = mysqlTable("ptzPresets", {
  id: int("id").autoincrement().primaryKey(),
  cameraId: int("cameraId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  panPosition: int("panPosition"), // 0-360 degrees
  tiltPosition: int("tiltPosition"), // 0-180 degrees
  zoomLevel: int("zoomLevel"), // 0-100
  presetNumber: int("presetNumber"), // Device preset slot
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PtzPreset = typeof ptzPresets.$inferSelect;
export type InsertPtzPreset = typeof ptzPresets.$inferInsert;

/**
 * Video Recordings table - Local recordings metadata
 */
export const videoRecordings = mysqlTable("videoRecordings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cameraId: int("cameraId").notNull(),
  filename: varchar("filename", { length: 500 }).notNull(),
  fileSize: int("fileSize"), // bytes
  duration: int("duration"), // seconds
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  storageKey: varchar("storageKey", { length: 500 }), // S3 storage reference
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VideoRecording = typeof videoRecordings.$inferSelect;
export type InsertVideoRecording = typeof videoRecordings.$inferInsert;
