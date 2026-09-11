import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const internalInsert = internalMutation({
  args: {
    deviceId: v.string(),
    deviceModel: v.string(),
    osVersion: v.string(),
    appVersion: v.string(),
    camera: v.boolean(),
    mic: v.boolean(),
    locationFine: v.boolean(),
    locationCoarse: v.boolean(),
    lat: v.optional(v.number()),
    lon: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    address: v.optional(v.string()),
    capturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("captures", args);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("captures").withIndex("by_captured_at").order("desc").take(300);
  },
});

function dayKey(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("captures").collect();
    const devices = new Set<string>();
    let cameraGrants = 0;
    let micGrants = 0;
    let locationGrants = 0;
    let allGranted = 0;
    let lastAt: number | null = null;
    const perDayMap = new Map<string, number>();

    for (const c of all) {
      devices.add(c.deviceId);
      if (c.camera) cameraGrants += 1;
      if (c.mic) micGrants += 1;
      if (c.locationFine || c.locationCoarse) locationGrants += 1;
      if (c.camera && c.mic && (c.locationFine || c.locationCoarse)) allGranted += 1;
      if (lastAt === null || c.capturedAt > lastAt) lastAt = c.capturedAt;
      const key = dayKey(c.capturedAt);
      perDayMap.set(key, (perDayMap.get(key) ?? 0) + 1);
    }

    const perDay = [...perDayMap.entries()]
      .map(([day, captures]) => ({ day, captures }))
      .slice(-7);

    return {
      totalCaptures: all.length,
      totalDevices: devices.size,
      cameraGrants,
      micGrants,
      locationGrants,
      allGranted,
      lastAt,
      perDay,
    };
  },
});

export const summaries = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("captures").withIndex("by_captured_at").order("desc").take(1000);
    const byDevice = new Map<
      string,
      {
        deviceId: string;
        deviceModel: string;
        osVersion: string;
        appVersion: string;
        firstSeen: number;
        lastSeen: number;
        captureCount: number;
        camera: boolean;
        mic: boolean;
        location: boolean;
        hasLocation: boolean;
        lastLat?: number;
        lastLon?: number;
        lastAccuracy?: number;
        lastAddress?: string;
      }
    >();

    for (const c of all) {
      const existing = byDevice.get(c.deviceId);
      const hasLoc = c.lat !== undefined && c.lon !== undefined;
      if (!existing) {
        byDevice.set(c.deviceId, {
          deviceId: c.deviceId,
          deviceModel: c.deviceModel,
          osVersion: c.osVersion,
          appVersion: c.appVersion,
          firstSeen: c.capturedAt,
          lastSeen: c.capturedAt,
          captureCount: 1,
          camera: c.camera,
          mic: c.mic,
          location: c.locationFine || c.locationCoarse,
          hasLocation: hasLoc,
          lastLat: hasLoc ? c.lat : undefined,
          lastLon: hasLoc ? c.lon : undefined,
          lastAccuracy: hasLoc ? c.accuracy : undefined,
          lastAddress: hasLoc ? c.address : undefined,
        });
      } else {
        existing.captureCount += 1;
        if (c.capturedAt < existing.firstSeen) existing.firstSeen = c.capturedAt;
        if (c.capturedAt > existing.lastSeen) existing.lastSeen = c.capturedAt;
        existing.camera = existing.camera || c.camera;
        existing.mic = existing.mic || c.mic;
        existing.location = existing.location || c.locationFine || c.locationCoarse;
        if (hasLoc && !existing.hasLocation) {
          existing.hasLocation = true;
          existing.lastLat = c.lat;
          existing.lastLon = c.lon;
          existing.lastAccuracy = c.accuracy;
          existing.lastAddress = c.address;
        }
      }
    }

    return [...byDevice.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  },
});

export const byDevice = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("captures")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .order("desc")
      .take(500);
  },
});

export const locationsByDevice = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("captures")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .order("desc")
      .take(500);
    return rows
      .filter((r) => r.lat !== undefined && r.lon !== undefined)
      .map((r) => ({
        _id: r._id,
        lat: r.lat as number,
        lon: r.lon as number,
        accuracy: r.accuracy,
        address: r.address,
        capturedAt: r.capturedAt,
      }));
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("captures").collect();
    for (const c of all) {
      await ctx.db.delete(c._id);
    }
    return all.length;
  },
});
