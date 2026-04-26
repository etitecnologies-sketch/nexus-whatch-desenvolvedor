import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import net from "net";
import {
  InsertUser,
  users,
  devices,
  InsertDevice,
  Device,
  cameras,
  InsertCamera,
  favorites,
  InsertFavorite,
  notifications,
  InsertNotification,
  ptzPresets,
  InsertPtzPreset,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.supabaseId) {
    throw new Error("User supabaseId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      supabaseId: user.supabaseId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserBySupabaseId(supabaseId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.supabaseId, supabaseId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Device queries
 */
export async function getUserDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.userId, userId));
}

export async function getDeviceById(deviceId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(devices)
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)))
    .limit(1);
  return result[0];
}

export async function createDevice(device: InsertDevice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(devices).values(device);
  return result[0];
}

export async function updateDevice(deviceId: number, userId: number, updates: Partial<InsertDevice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(devices)
    .set(updates)
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)));
}

export async function updateDeviceStatus(deviceId: number, userId: number, status: "online" | "offline" | "error", latency?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(devices)
    .set({ status, latency, lastSeen: new Date() })
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)));
}

import { getDriver } from "./drivers";
export { getDriver };

export async function checkDeviceConnectivity(device: Device): Promise<{ status: "online" | "offline" | "error", latency: number }> {
  const driver = getDriver(device);
  const result = await driver.checkStatus();
  
  return {
    status: result.status,
    latency: result.latency || 0
  };
}

export async function deleteDevice(deviceId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .delete(devices)
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)));
}

/**
 * Camera queries
 */
export async function getDeviceCameras(deviceId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cameras)
    .where(and(eq(cameras.deviceId, deviceId), eq(cameras.userId, userId)));
}

export async function createCamera(camera: InsertCamera) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(cameras).values(camera);
}

export async function deleteCamera(cameraId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .delete(cameras)
    .where(and(eq(cameras.id, cameraId), eq(cameras.userId, userId)));
}

/**
 * Favorites queries
 */
export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(favorites).where(eq(favorites.userId, userId));
}

export async function createFavorite(favorite: InsertFavorite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(favorites).values(favorite);
}

export async function deleteFavorite(favoriteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .delete(favorites)
    .where(and(eq(favorites.id, favoriteId), eq(favorites.userId, userId)));
}

/**
 * Notifications queries
 */
export async function getUserNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy((t) => desc(t.createdAt))
    .limit(limit);
}

export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(notifications).values(notification);
}

export async function markNotificationAsRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(notifications)
    .set({ isRead: 1 })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

/**
 * PTZ Presets queries
 */
export async function getCameraPtzPresets(cameraId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ptzPresets)
    .where(and(eq(ptzPresets.cameraId, cameraId), eq(ptzPresets.userId, userId)));
}

export async function createPtzPreset(preset: InsertPtzPreset) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(ptzPresets).values(preset);
}

export async function deletePtzPreset(presetId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .delete(ptzPresets)
    .where(and(eq(ptzPresets.id, presetId), eq(ptzPresets.userId, userId)));
}
