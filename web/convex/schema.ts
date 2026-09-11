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
});
