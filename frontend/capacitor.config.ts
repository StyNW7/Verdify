import type { CapacitorConfig } from '@capacitor/cli';

// Live-reload toggle. Set CAP_SERVER_URL to your laptop's LAN URL
// (e.g. CAP_SERVER_URL=http://192.168.1.42:5173) before running `npx cap sync`
// or `npx cap run android`. Leave unset for a production build that ships
// the compiled `dist/` bundle.
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.verdify.app',
  appName: 'Verdify',
  webDir: 'dist',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: true,
        },
      }
    : {}),
};

export default config;
