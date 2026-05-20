const appJson = require('./app.json');
const os = require('os');

/** First non-internal IPv4 (LAN), for physical devices on the same Wi‑Fi. */
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

const lan = lanIpv4();
const apiFromEnv = process.env.EXPO_PUBLIC_API_URL;
const socketFromEnv = process.env.EXPO_PUBLIC_SOCKET_URL;
const defaultBase = `http://${lan}:3000`;

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiBaseUrl: apiFromEnv || defaultBase,
      socketUrl: socketFromEnv || apiFromEnv || defaultBase,
    },
  },
};
