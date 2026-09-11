# Permission Harvest — Cyber Awareness Demo

A fake calculator Android app plus a realtime web dashboard, built to demonstrate to students what actually happens when they tap **Allow** on permission dialogs without reading them. The app looks like an innocent calculator; once permissions are granted it reports location (incl. "all the time"), and a supervised operator can remotely trigger photo capture (front/rear) and microphone recording from the dashboard.

> Educational use only. Run it on your own devices, in academic settings, with supervision. The dashboard discloses everything it collects; a real malicious app would not.

## Live site

**https://cyber-awareness-calc.vercel.app** — password-protected (first visit asks you to create the password; sessions expire after 30 minutes of inactivity).

## Architecture

```
Android app (Kotlin + Compose)          Convex backend              Next.js dashboard
├─ Calculator UI (innocent)             ├── captures (locations)    ├── device list + drawer
├── permission flow (cam/mic/loc/BG)   ├── media   (photos/audio)  ├── per-device tabs: Events | Media | Map
├── HarvestService (foreground,        ├── commands (remote queue) ├── global overview + charts
│   location|camera|microphone types)  ├── HTTP: /api/ingest       ├── live map (MapLibre via mapcn)
├── uploads location every ~12s        │        /api/poll           └── realtime via Convex useQuery
│   (skips if not moved)               │        /api/media*
└── polls for remote commands (~2s)    │        /api/file/*
                                       └        /api/auth/*
```

- **Convex** powers realtime: every phone check-in, photo, or audio chunk appears on the dashboard instantly.
- **Vercel** hosts the Next.js app; **Convex** hosts functions + file storage.
- Phone → server calls are authorized with a shared ingest key; the dashboard is behind a password gate.

## Android app

- Requests CAMERA, RECORD_AUDIO, and location (fine/coarse + separate background prompt) on first open.
- After grants, a foreground service (`location|camera|microphone`) keeps:
  - reporting a location fix + reverse-geocoded address every ~12s (skips if you haven't moved 15m in the last minute),
  - polling for remote commands (photo front/rear, mic start/stop),
  - uploading photos as JPEG and audio as ~6s AAC chunks.
- Camera/mic capture from the background requires the foreground service Android mandates; the demo shows a notification ("Awareness demo active").
- Camera/mic cannot be "all the time" on Android — only location has that mode.

### Build

Requirements: JDK 17+, Android SDK (see `local.properties.example`).

```bash
# 1. put these in local.properties (gitignored):
sdk.dir=P:\\Applications\\Android\\Sdk
INGEST_KEY=<key set via `npx convex env set INGEST_KEY ...`>
INGEST_URL=https://<your-deployment>.convex.site/api/ingest

# 2. build
.\gradlew.bat assembleDebug
# APK: app\build\outputs\apk\debug\app-debug.apk
```

## Web dashboard

```bash
cd web
npm install
npx convex dev          # push functions, generate bindings
npm run dev             # local
```

Environment (`.env.local`):
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL (written by `npx convex dev`)
- `AUTH_SECRET` — random hex string used to sign the session cookie (`vercel env add AUTH_SECRET production`)

Deploy: `npx vercel deploy --prod`.

## Security model (and its honest limits)

- All traffic is HTTPS; the app's network security config forbids cleartext and restricts hosts to Convex/Vercel.
- Ingest/media/poll endpoints require the `x-ingest-key` header (401 otherwise).
- Password stored as PBKDF2-SHA-256 (150k iterations, random salt); 5 failed logins lock for 10 minutes.
- Session = HMAC-signed 30-minute sliding cookie (httpOnly, SameSite=Lax).
- Media file URLs are unguessable storage ids.
- NOT included (deliberately): per-request rate limiting, server-side session revocation, cert pinning. This is a demo, not a production spyware-grade system — and it is transparent by design.

## Repo layout

```
app/            Android app (calculator UI, permission flow, HarvestService, ingest client)
web/            Next.js dashboard + convex/ functions + vendored interior.dev components
.build-outputs/ local APK copies (gitignored)
```

Component sources: [interior.dev](https://www.interior.dev) (micro-interactions), map components via [mapcn.dev](https://www.mapcn.dev) (MapLibre + CARTO tiles).
