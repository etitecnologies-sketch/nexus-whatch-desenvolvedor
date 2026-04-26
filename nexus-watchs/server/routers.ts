import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getUserDevices,
  createDevice,
  deleteDevice,
  getDeviceCameras,
  createCamera,
  deleteCamera,
  getUserFavorites,
  createFavorite,
  deleteFavorite,
  getUserNotifications,
  markNotificationAsRead,
  getCameraPtzPresets,
  createPtzPreset,
  deletePtzPreset,
  checkDeviceConnectivity,
  updateDeviceStatus,
  getDeviceById,
  updateDevice,
  getDriver,
} from "./db";

import { sdk } from "./_core/sdk";
import { mapOnvifManufacturerToDriverKey, probeOnvif } from "./_core/onvif";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ supabaseId: z.string(), name: z.string(), email: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const sessionToken = await sdk.createSessionToken(input.supabaseId, {
          name: input.name || input.email || "User",
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { 
          ...cookieOptions, 
          maxAge: ONE_YEAR_MS 
        });

        return { success: true };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  devices: router({
    list: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      return getUserDevices(ctx.user.id);
    }),
    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          type: z.enum(["dvr", "nvr", "ip_camera"]),
          manufacturer: z.string().optional().default("generic"),
          connectionType: z.enum(["ip", "ddns", "p2p", "qrcode"]),
          ipAddress: z.string().optional(),
          ddnsAddress: z.string().optional(),
          p2pId: z.string().optional(),
          username: z.string().min(1),
          password: z.string().min(1),
          port: z.number().optional().default(554),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");

        const host = input.ipAddress || input.ddnsAddress;
        if (
          host &&
          (input.connectionType === "ip" || input.connectionType === "ddns") &&
          (!input.manufacturer || input.manufacturer === "generic")
        ) {
          try {
            const ports = Array.from(
              new Set([input.port, 80, 8000].filter((p): p is number => typeof p === "number" && Number.isFinite(p)))
            );
            const probe = await probeOnvif({
              host,
              ports,
              username: input.username,
              password: input.password,
              timeoutMs: 2500,
              maxProfiles: 4,
            });

            const detected = mapOnvifManufacturerToDriverKey(probe?.deviceInfo.manufacturer);
            if (detected) {
              input.manufacturer = detected;
            }
          } catch {
          }
        }

        const device = await createDevice({
          userId: ctx.user.id,
          ...input,
        });

        // Try to check connectivity immediately in the background
        if (device && typeof device === 'object' && 'insertId' in device) {
          const deviceId = Number(device.insertId);
          getDeviceById(deviceId, ctx.user.id).then(async (fullDevice) => {
            if (fullDevice) {
              const result = await checkDeviceConnectivity(fullDevice);
              await updateDeviceStatus(deviceId, ctx.user!.id, result.status, result.latency);
            }
          }).catch(err => console.error("[StatusCheck] Initial check failed:", err));
        }

        return device;
      }),
    onvifProbe: publicProcedure
      .input(
        z.object({
          host: z.string().min(1),
          port: z.number().optional(),
          username: z.string().min(1),
          password: z.string().min(1),
        })
      )
      .query(async ({ input }) => {
        const ports = Array.from(
          new Set([input.port, 80, 8000].filter((p): p is number => typeof p === "number" && Number.isFinite(p)))
        );
        let probe: Awaited<ReturnType<typeof probeOnvif>> = null;
        try {
          probe = await probeOnvif({
            host: input.host,
            ports,
            username: input.username,
            password: input.password,
            timeoutMs: 2500,
            maxProfiles: 4,
          });
        } catch {
          probe = null;
        }

        if (!probe) {
          return {
            ok: false,
          } as const;
        }

        return {
          ok: true,
          manufacturer: probe.deviceInfo.manufacturer ?? null,
          model: probe.deviceInfo.model ?? null,
          firmwareVersion: probe.deviceInfo.firmwareVersion ?? null,
          serialNumber: probe.deviceInfo.serialNumber ?? null,
          hardwareId: probe.deviceInfo.hardwareId ?? null,
          mediaXAddr: probe.mediaXAddr ?? null,
          ptzXAddr: probe.ptzXAddr ?? null,
          profiles: probe.profiles,
          streamUris: probe.streamUris,
          ptzSupported: probe.ptzSupported,
          mappedManufacturer: mapOnvifManufacturerToDriverKey(probe.deviceInfo.manufacturer) ?? null,
        } as const;
      }),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          type: z.enum(["dvr", "nvr", "ip_camera"]).optional(),
          manufacturer: z.string().optional(),
          connectionType: z.enum(["ip", "ddns", "p2p", "qrcode"]).optional(),
          ipAddress: z.string().optional(),
          ddnsAddress: z.string().optional(),
          p2pId: z.string().optional(),
          username: z.string().min(1).optional(),
          password: z.string().min(1).optional(),
          port: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { id, ...updates } = input;
        const result = await updateDevice(id, ctx.user.id, updates);

        // Re-check connectivity if connection info changed
        if (updates.ipAddress || updates.ddnsAddress || updates.port || updates.connectionType) {
          getDeviceById(id, ctx.user.id).then(async (fullDevice) => {
            if (fullDevice) {
              const checkResult = await checkDeviceConnectivity(fullDevice);
              await updateDeviceStatus(id, ctx.user!.id, checkResult.status, checkResult.latency);
            }
          }).catch(err => console.error("[StatusCheck] Update check failed:", err));
        }

        return result;
      }),
    checkStatus: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const device = await getDeviceById(input.id, ctx.user.id);
        if (!device) throw new Error("Device not found");

        const result = await checkDeviceConnectivity(device);
        await updateDeviceStatus(device.id, ctx.user.id, result.status, result.latency);
        
        return result;
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return deleteDevice(input.id, ctx.user.id);
      }),
    getStreamUrl: publicProcedure
      .input(z.object({ 
        deviceId: z.number(), 
        channel: z.number().default(1),
        streamType: z.enum(["main", "sub"]).default("sub") 
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const device = await getDeviceById(input.deviceId, ctx.user.id);
        if (!device) throw new Error("Device not found");

        const driver = getDriver(device);
        const rtspUrl = driver.getRtspUrl(input.channel, input.streamType);
        const webStreamUrl = await driver.getWebStreamUrl(input.channel, input.streamType);
        const p2pUrl = driver.getP2PUrl();
        
        return {
          rtspUrl,
          webStreamUrl,
          p2pUrl,
          p2pId: device.p2pId,
          streamName: `device_${device.id}_ch${input.channel}_${input.streamType}`
        };
      }),
  }),

  cameras: router({
    listByDevice: publicProcedure
      .input(z.object({ deviceId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) return [];
        return getDeviceCameras(input.deviceId, ctx.user.id);
      }),
    create: publicProcedure
      .input(
        z.object({
          deviceId: z.number(),
          name: z.string().min(1),
          channelNumber: z.number(),
          rtspUrl: z.string().optional(),
          resolution: z.enum(["sd", "hd", "fullhd", "4k"]).optional().default("hd"),
          isPtzEnabled: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return createCamera({
          userId: ctx.user.id,
          deviceId: input.deviceId,
          name: input.name,
          channelNumber: input.channelNumber,
          rtspUrl: input.rtspUrl,
          resolution: input.resolution,
          isPtzEnabled: input.isPtzEnabled ? 1 : 0,
        });
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return deleteCamera(input.id, ctx.user.id);
      }),
  }),

  favorites: router({
    list: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      return getUserFavorites(ctx.user.id);
    }),
    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          icon: z.string().optional(),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return createFavorite({
          userId: ctx.user.id,
          ...input,
        });
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return deleteFavorite(input.id, ctx.user.id);
      }),
  }),

  notifications: router({
    list: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      return getUserNotifications(ctx.user.id);
    }),
    markAsRead: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return markNotificationAsRead(input.id, ctx.user.id);
      }),
  }),

  ptz: router({
    listPresets: publicProcedure
      .input(z.object({ cameraId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) return [];
        return getCameraPtzPresets(input.cameraId, ctx.user.id);
      }),
    createPreset: publicProcedure
      .input(
        z.object({
          cameraId: z.number(),
          name: z.string().min(1),
          panPosition: z.number().optional(),
          tiltPosition: z.number().optional(),
          zoomLevel: z.number().optional(),
          presetNumber: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return createPtzPreset({
          userId: ctx.user.id,
          cameraId: input.cameraId,
          name: input.name,
          panPosition: input.panPosition,
          tiltPosition: input.tiltPosition,
          zoomLevel: input.zoomLevel,
          presetNumber: input.presetNumber,
        });
      }),
    deletePreset: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return deletePtzPreset(input.id, ctx.user.id);
      }),
    move: publicProcedure
      .input(
        z.object({
          cameraId: z.number(),
          direction: z.enum(["up", "down", "left", "right", "zoomIn", "zoomOut"]),
          speed: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        // Mock implementation for PTZ movement
        console.log(`[PTZ] Camera ${input.cameraId} moving ${input.direction} at speed ${input.speed || 1}`);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
