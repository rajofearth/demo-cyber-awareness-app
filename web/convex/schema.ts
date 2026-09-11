import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  captures: defineTable({
    deviceId: v.string(),
    deviceModel: v.string(),
    osVersion: v.string(),
    appVersion: v.string(),
    camera: v.boolean(),
    mic: v.boolean(),
    locationFine: v.boolean(),
    locationCoarse: v.boolean(),
    backgroundLocation: v.optional(v.boolean()),
    lat: v.optional(v.number()),
    lon: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    address: v.optional(v.string()),
    capturedAt: v.number(),
  })
    .index("by_device", ["deviceId"])
    .index("by_captured_at", ["capturedAt"]),

  media: defineTable({
    deviceId: v.string(),
    kind: v.string(),
    lens: v.optional(v.string()),
    storageId: v.string(),
    mime: v.string(),
    takenAt: v.number(),
    durationMs: v.optional(v.number()),
    seq: v.optional(v.number()),
  }).index("by_device", ["deviceId"]).index("by_storage", ["storageId"]),

  commands: defineTable({
    deviceId: v.string(),
    type: v.string(),
    lens: v.optional(v.string()),
    audioAction: v.optional(v.string()),
    status: v.string(),
    resultMediaId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_device", ["deviceId"])
    .index("by_status", ["status"]),

  authConfig: defineTable({
    saltHex: v.string(),
    hash: v.string(),
    failedCount: v.optional(v.number()),
    lockUntil: v.optional(v.number()),
  }),
});
