import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const internalInsertMedia = internalMutation({
  args: {
    deviceId: v.string(),
    kind: v.string(),
    lens: v.optional(v.string()),
    storageId: v.string(),
    mime: v.string(),
    takenAt: v.number(),
    durationMs: v.optional(v.number()),
    seq: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("media", args);
    const limit = args.kind === "photo" ? 50 : 10;
    const rows = await ctx.db
      .query("media")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .order("desc")
      .collect();
    const overflow = rows.filter((r) => r.kind === args.kind).slice(limit);
    for (const row of overflow) {
      try {
        await ctx.storage.delete(row.storageId);
      } catch {
      }
      await ctx.db.delete(row._id);
    }
  },
});

export const createCommand = mutation({
  args: {
    deviceId: v.string(),
    type: v.string(),
    lens: v.optional(v.string()),
    audioAction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("commands", {
      deviceId: args.deviceId,
      type: args.type,
      lens: args.lens,
      audioAction: args.audioAction,
      status: "pending",
      createdAt: Date.now(),
    });
    return id.toString();
  },
});

export const completeCommand = mutation({
  args: {
    commandId: v.string(),
    status: v.string(),
    resultMediaId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = args.commandId as never;
    await ctx.db.patch(id, {
      status: args.status,
      resultMediaId: args.resultMediaId,
    });
  },
});

export const internalPending = internalQuery({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("commands")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .order("desc")
      .take(10);
    return rows.filter((r) => r.status === "pending");
  },
});

export const internalMarkDelivered = internalMutation({
  args: { ids: v.array(v.id("commands")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.patch(id, { status: "delivered" });
    }
  },
});

export const mediaByStorage = internalQuery({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("media")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();
  },
});

export const mediaByDevice = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("media")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .order("desc")
      .take(60);
  },
});

export const commandsByDevice = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("commands")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .order("desc")
      .take(10);
  },
});
