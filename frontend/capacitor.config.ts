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
  plugins: {
    // Route fetch/XHR through native HTTP so requests bypass WebView CORS.
    // Required for the Android build to call the deployed Go backend without
    // adding capacitor://localhost / https://localhost to the backend's
    // CORS allowlist. Web builds ignore this block entirely.
    CapacitorHttp: {
      enabled: true,
    },
  },
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
