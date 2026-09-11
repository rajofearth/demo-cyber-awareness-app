import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 150000, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export const configured = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("authConfig").first();
    return doc !== null;
  },
});

export const setup = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("authConfig").first();
    if (existing) {
      return { ok: false, error: "Password already configured" };
    }
    if (args.password.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters" };
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await pbkdf2(args.password, salt);
    await ctx.db.insert("authConfig", { saltHex: toHex(salt), hash, failedCount: 0 });
    return { ok: true };
  },
});

export const login = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db.query("authConfig").first();
    if (!doc) {
      return { ok: false, error: "Not configured" };
    }
    if (doc.lockUntil !== undefined && doc.lockUntil > Date.now()) {
      const mins = Math.ceil((doc.lockUntil - Date.now()) / 60000);
      return { ok: false, error: `Locked. Try again in ${mins} min` };
    }
    const salt = new Uint8Array(
      (doc.saltHex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)),
    );
    const hash = await pbkdf2(args.password, salt);
    if (hash !== doc.hash) {
      const failedCount = (doc.failedCount ?? 0) + 1;
      await ctx.db.patch(doc._id, {
        failedCount,
        lockUntil: failedCount >= 5 ? Date.now() + 10 * 60 * 1000 : undefined,
      });
      return { ok: false, error: "Wrong password" };
    }
    await ctx.db.patch(doc._id, { failedCount: 0, lockUntil: undefined });
    return { ok: true };
  },
});
