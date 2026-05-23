const appJson = require('./app.json');
const os = require('os');

/** First non-internal IPv4 (LAN), for physical devices on the same Wi‑Fi (dev only). */
function lanIpv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

const apiFromEnv = process.env.EXPO_PUBLIC_API_URL;
const socketFromEnv = process.env.EXPO_PUBLIC_SOCKET_URL;
const androidMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

// EAS sets EAS_BUILD_PROFILE during `eas build`. Treat `preview` and `production`
// as "shippable" — the bundle must point at a real HTTPS backend.
const profile = process.env.EAS_BUILD_PROFILE;
const isShippableBuild = profile === 'production' || profile === 'preview';
const isAndroidBuild = process.env.EAS_BUILD_PLATFORM === 'android';

if (isAndroidBuild && !androidMapsApiKey) {
  console.warn(
    '[app.config] EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY is not set. ' +
      'Android Google Maps tiles will fail to render. ' +
      'Set it via EAS secrets or eas.json before building Android.',
  );
}

function assertProductionApiUrl(url) {
  if (!url) {
    throw new Error(
      `[app.config] EXPO_PUBLIC_API_URL is required for EAS_BUILD_PROFILE="${profile}". ` +
        `Set it in eas.json (env) or via EAS secrets. Example: https://api.your-domain.com`,
    );
  }
  if (!/^https:\/\//i.test(url)) {
    throw new Error(
      `[app.config] EXPO_PUBLIC_API_URL must be HTTPS for "${profile}" builds (got "${url}"). ` +
        `iOS ATS will block plain http on TestFlight.`,
    );
  }
  if (/localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./i.test(url)) {
    throw new Error(
      `[app.config] EXPO_PUBLIC_API_URL="${url}" looks like a local/LAN address — not valid for "${profile}" builds.`,
    );
  }
}

let apiBaseUrl;
let socketUrl;

if (isShippableBuild) {
  assertProductionApiUrl(apiFromEnv);
  apiBaseUrl = apiFromEnv;
  socketUrl = socketFromEnv || apiFromEnv;
} else {
  // Local dev: prefer explicit env, otherwise auto-detect Mac LAN IP for physical devices.
  const defaultBase = `http://${lanIpv4()}:3000`;
  apiBaseUrl = apiFromEnv || defaultBase;
  socketUrl = socketFromEnv || apiFromEnv || defaultBase;
}

module.exports = {
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      ...(androidMapsApiKey
        ? {
            config: {
              ...(appJson.expo.android && appJson.expo.android.config),
              googleMaps: {
                apiKey: androidMapsApiKey,
              },
            },
          }
        : {}),
    },
    extra: {
      ...appJson.expo.extra,
      apiBaseUrl,
      socketUrl,
      buildProfile: profile || 'dev',
    },
  },
};
