import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

const http = httpRouter();

http.route({
  path: "/api/ingest",
  method: "POST",
  handler: ingest,
});

export default http;
