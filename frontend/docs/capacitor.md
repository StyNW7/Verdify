# capacitor.md

How Verdify's React/Vite frontend ships as an Android app via Capacitor 8.

> Status: Android only. iOS is intentionally out of scope (no Mac in the team's setup, $99/yr Apple Developer fee deferred). The same project will accept iOS later via `npx cap add ios` on a Mac — no code rewrite needed.

## What's already wired

Saputra ran the one-time setup. You don't redo this — it's listed only so you know what's in the tree:

- `npm i @capacitor/core @capacitor/android` + `npm i -D @capacitor/cli`
- `npx cap init "Verdify" "com.verdify.app" --web-dir=dist`
- `npx cap add android` → created `frontend/android/` (the native Android Studio project)
- `capacitor.config.ts` — env-driven `server.url` for live reload (see "Dev: live reload")
- `package.json` scripts: `cap:sync`, `cap:open`, `cap:run`, `cap:dev`

The Android project under `frontend/android/` is committed. Build artifacts (`android/app/build/`, `.gradle/`, `local.properties`) are gitignored by Capacitor's own `android/.gitignore`.

## One-time prereqs (per developer machine)

You only need these the first time you build the APK on your machine.

1. **JDK 21** (Capacitor 8 requires it; JDK 17 will fail Gradle sync).
   - Windows: install Temurin 21 from adoptium.net, then set `JAVA_HOME` to its install path.
2. **Android Studio** (latest stable). Open it once, accept SDK licenses, install:
   - Android SDK Platform 35 (or whatever Capacitor 8 targets — Android Studio will prompt)
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
3. **`ANDROID_HOME` env var** pointing at your SDK (default Windows path: `%LOCALAPPDATA%\Android\Sdk`).
4. **A device or emulator.** Easiest: enable USB debugging on a phone and plug it in. Verify with `adb devices`.

No Apple Developer account, no Mac, no Xcode — Android only.

## Daily flow: production build

This is what you run when you want a real APK on a real phone.

```powershell
cd frontend
npm run cap:run        # builds Vite -> dist, syncs to android, launches on connected device
```

Under the hood `cap:run` is `npm run build && cap run android`. Capacitor copies `dist/` into `android/app/src/main/assets/public/`, so any time the web bundle changes you must `cap sync` (or use one of the `cap:*` scripts that does it for you).

To open the project in Android Studio for signing, release builds, or debugging native code:

```powershell
npm run cap:open
```

## Dev: live reload from Vite

Faster than rebuilding the APK every change. The phone's WebView points at your laptop's `vite` dev server over LAN.

**Step 1 — find your laptop's LAN IP** (must be on the same Wi-Fi as the phone):

```powershell
ipconfig | Select-String "IPv4"
```

Pick the one for your active Wi-Fi adapter, e.g. `192.168.1.42`.

**Step 2 — start Vite bound to all interfaces:**

```powershell
npm run cap:dev        # runs `vite --host`
```

Vite prints something like `Network: http://192.168.1.42:5173/`.

**Step 3 — sync that URL into the Android app and run it:**

```powershell
$env:CAP_SERVER_URL = "http://192.168.1.42:5173"
npx cap sync android
npx cap run android
```

> ⚠ **PowerShell syntax matters.** The bash/CMD form `CAP_SERVER_URL=http://...` does NOT set an env var in PowerShell — it parses as something else and the variable ends up unset. Use `$env:CAP_SERVER_URL = "..."` exactly. Sanity-check with `echo $env:CAP_SERVER_URL` in the SAME shell before running `cap sync`. If the env var is missing at sync time, the `server` block in `capacitor.config.ts` is skipped and the app silently keeps loading the old bundled assets — looking exactly like "live reload doesn't work."

Now the installed app loads from your laptop. Editing React source hot-reloads on the phone the same way it does in Chrome.

**Step 4 — when you're done with live reload**, unset the env var and re-sync so the app goes back to using its bundled assets:

```powershell
Remove-Item Env:CAP_SERVER_URL
npm run cap:sync
```

`cleartext: true` is set in `capacitor.config.ts` only when `CAP_SERVER_URL` is present, so the production build still rejects HTTP. This is deliberate.

## Backend calls from the device

When the app runs on a phone, `localhost` is the **phone**, not your laptop. Three options:

1. **Hit the deployed backend** (Cloud Run URL). Easiest. CORS already allows the mobile WebView since Capacitor uses the `https://localhost` or `capacitor://localhost` origin — confirm with the backend team if you see CORS errors.
2. **Hit your laptop's local Go backend over LAN.** Replace the API base URL in the frontend with `http://<laptop-ip>:8080` while testing. Requires Windows Firewall to allow inbound on the Go port.
3. **adb reverse** for USB-tethered devices: `adb reverse tcp:8080 tcp:8080` makes the phone's `localhost:8080` resolve to your laptop. No frontend code changes; works only over USB.

Option 3 is the tightest dev loop. Option 1 is what staging/demo runs against.

## Capacitor plugins (when you need native features)

Add as you go — don't preinstall everything. Install pattern:

```powershell
npm i @capacitor/<plugin-name>
npx cap sync android
```

Likely candidates for Verdify:

| Need | Plugin | Notes |
| --- | --- | --- |
| GPS for "I missed my stop" / journey tracking | `@capacitor/geolocation` | Add `ACCESS_FINE_LOCATION` permission in `android/app/src/main/AndroidManifest.xml`. |
| QR scanning at boarding | `@capacitor-mlkit/barcode-scanning` (community) | Camera permission required. |
| Push notifications for trip updates | `@capacitor/push-notifications` | Needs Firebase Cloud Messaging setup — coordinate with whoever owns Firebase. |
| Persist auth token across app launches | `@capacitor/preferences` | Replaces `localStorage` for native — `localStorage` works in WebView but is wiped more aggressively. |
| Open external URLs (Google Maps fallback) | `@capacitor/browser` | In-app browser; better UX than `window.open`. |

After any `cap sync`, restart the app on the device — plugin registration happens at native startup, not in JS.

## Common gotchas

- **White screen after launch.** 99% of the time `cap sync` wasn't run after the last `vite build`. Re-run `npm run cap:sync`.
- **`vite --host` works but phone can't reach it.** Windows Firewall is blocking node.exe inbound. Allow it on Private networks.
- **`server.url` set but app loads bundled assets.** `cap sync` wasn't run after setting `CAP_SERVER_URL`. The URL is baked into `android/app/src/main/assets/capacitor.config.json` at sync time, not read at runtime.
- **Routing breaks on hard reload inside the app.** React Router needs a hash router or Capacitor's `App` plugin to handle deep links. Stick with `BrowserRouter` for now (the WebView never hard-reloads in normal use); if it bites, switch to `HashRouter` for the Capacitor build only.
- **Google Maps blank on device.** The Maps JS API key may be HTTP-referrer restricted to your web domain. Add `capacitor://localhost` and `http://localhost` as allowed referrers in the GCP Maps API key settings. (Coordinate with Saputra — that key is paid for from the TryGCP credit.)
- **APK too large.** Vite builds are usually fine (~1–2 MB gzipped). If it balloons, check `dist/assets/` for unintended fonts/images bundled from `public/Images/`.

## When to ship a real APK

- Internal demos / submissions: `cap:run` against a connected phone is enough.
- App store / sideload distribution: open in Android Studio (`cap:open`), generate a signed AAB/APK via Build → Generate Signed Bundle. Keystore lives outside the repo — don't commit `*.jks`.

Play Store publishing is a one-time $25 fee per developer account. Out of scope until the team decides to publish.
