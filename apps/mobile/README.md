# האוזן / The Ear — Mobile

Expo / React Native client. Local dev uses an auto-detected LAN IP (see [app.config.js](app.config.js)); EAS preview/production builds must be pointed at a real HTTPS backend.

Current production backend: `https://the-ear.onrender.com`

---

## Local dev

```bash
# from repo root
npm run dev          # starts backend + Expo together
# or, in apps/mobile:
npm run start
```

- iOS Simulator → `http://127.0.0.1:3000`
- Android Emulator → `http://10.0.2.2:3000`
- Physical device on same Wi‑Fi → Mac's LAN IP, auto-detected by [app.config.js](app.config.js)

Nothing in this section requires EAS or the Render URL.

---

## EAS build configuration

[eas.json](eas.json) declares three profiles: `development`, `preview` (internal distribution, real devices), `production` (store / TestFlight).

`preview` and `production` both require **`EXPO_PUBLIC_API_URL`** to be set on the EAS side — the build fails fast in [app.config.js](app.config.js) if it is missing, not HTTPS, or looks like a LAN/localhost address.

`EXPO_PUBLIC_SOCKET_URL` is optional; when unset it falls back to `EXPO_PUBLIC_API_URL`.

### One-time setup: register the URLs with EAS

Use **EAS environment variables** (recommended — scoped per environment, visible in the dashboard):

```bash
cd apps/mobile

# preview
eas env:create --environment preview \
  --name EXPO_PUBLIC_API_URL \
  --value https://the-ear.onrender.com \
  --visibility plaintext

# production
eas env:create --environment production \
  --name EXPO_PUBLIC_API_URL \
  --value https://the-ear.onrender.com \
  --visibility plaintext
```

Optional — only if the socket host ever diverges from the API host:

```bash
eas env:create --environment preview \
  --name EXPO_PUBLIC_SOCKET_URL \
  --value https://the-ear.onrender.com \
  --visibility plaintext

eas env:create --environment production \
  --name EXPO_PUBLIC_SOCKET_URL \
  --value https://the-ear.onrender.com \
  --visibility plaintext
```

Android only — Google Maps key (already documented in [.env.example](.env.example)):

```bash
eas env:create --environment preview \
  --name EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY \
  --value <KEY> \
  --visibility sensitive

eas env:create --environment production \
  --name EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY \
  --value <KEY> \
  --visibility sensitive
```

Verify what EAS has stored:

```bash
eas env:list --environment preview
eas env:list --environment production
```

> If `eas env` is not available on your EAS CLI version, the legacy equivalent is `eas secret:create --scope project --name <NAME> --value <VALUE>` — the `$VAR` references already in [eas.json](eas.json) resolve against project secrets as well.

---

## Preview build (share with friends / internal testers)

```bash
cd apps/mobile

# iOS — registered ad-hoc devices (run `eas device:create` once per device first)
eas build --profile preview --platform ios

# Android — installable .apk
eas build --profile preview --platform android

# both
eas build --profile preview --platform all
```

When the build finishes, EAS prints an install URL / QR code. Share that.

---

## Production build (store / TestFlight)

```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

---

## Verify the installed build is talking to Render

After installing the preview build on a device:

1. **App opens past splash** — first paint fetches drops via the API. If `EXPO_PUBLIC_API_URL` is wrong, the feed stays empty / errors. If it is missing, the build itself would have failed in EAS.
2. **Render logs show traffic** — open the Render service dashboard for `the-ear` and watch the live log while you open the app. You should see `GET /drops`, `GET /health`, anonymous auth, etc. originating from the device.
3. **Map shows nearby drops** — drop creation + nearby search both hit the backend; a successful post that then reappears on the map confirms REST + 2dsphere search end-to-end.
4. **Live updates** — open the app on two devices; a drop posted on one should appear on the other within a couple of seconds. That confirms the Socket.io connection (uses `EXPO_PUBLIC_SOCKET_URL`, defaulting to the API URL).

If any of the above fails, re-check `eas env:list --environment preview` and rebuild — env vars are baked in at build time, not at runtime.
