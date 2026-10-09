# MISO

**MISO - Your Little Butler** is an Electron desktop companion for Google Calendar tasks, reminders, meetings, and important dates. AI is optional and off by default.

The interface follows the [MISO brand styling guide](docs/UI-BRANDING.md): cream surfaces, charcoal text, butter-yellow actions, and locally bundled Baloo 2 and Inter fonts. Existing layouts, icons and mascot artwork are preserved.

## Features

- A draggable desktop mascot with separate idle, walking, sleeping, thinking, alert, happy, and wink artwork.
- Idle pose changes every 15 seconds; hovering returns to the resting pose. Automatic rotation pauses during interactions and respects reduced-motion preferences.
- Compact, centered, step-by-step reminder entry, opened by clicking the mascot or a configurable hotkey.
- Multiple Google accounts and calendar selection.
- A seven-day agenda with event details, reviewed edits and deletions, and links to Google Calendar.
- Manual tasks and yearly important dates without an AI key.
- Optional natural-language commands using a supported provider or local compatible server.
- OS-encrypted local account data, calendar cache, preferences, refresh tokens, and API keys.

## Run locally

Use Node.js 22.12 or newer, npm, and a desktop session. Windows x64 is the verified distribution target.

```sh
npm ci
npm start
```

After Google setup, click the mascot or press the default **Ctrl+Alt+B** shortcut. Drag with the left mouse button to move it. Open Settings from the greeting or system tray.

## Google sign-in

This repository contains no developer credentials or personal Google accounts. An unconfigured build requires a user's **Desktop app** OAuth client under **Setup / credentials -> Advanced developer configuration**. Enable Google Calendar API for that project and configure its consent screen and permitted users.

For local development, set `BUTLER_GOOGLE_CLIENT_ID` and optionally `BUTLER_GOOGLE_CLIENT_SECRET` in your shell before starting. The scripts do not automatically load `.env` files. [.env.example](.env.example) lists the available variables without credentials.

A publisher can provide a **separate public Desktop OAuth client** through `BUTLER_PUBLIC_GOOGLE_CLIENT_ID` and `BUTLER_PUBLIC_GOOGLE_CLIENT_SECRET` when building a release. Development variables are not automatically embedded in production builds. Google authorization uses the system browser, PKCE, random state, and a loopback callback.

To explicitly reuse the app OAuth configuration saved in the publisher's local MISO profile, run `npm run dist:configured`. This reads only the app client ID and client secret into the build environment; it never copies account tokens, AI keys or calendar data. The bundled configuration is hidden from the UI but remains extractable from the installer, as expected for Desktop OAuth. Use only a Desktop client for this command.

Desktop OAuth client IDs and bundled native client secrets cannot be kept confidential in a distributed app. Never embed personal access/refresh tokens, service-account private keys, AI keys, or confidential web-client credentials. Default configuration is hidden in the settings UI; custom configuration and Restore default are supported when a build includes a default. Connected accounts must be removed before switching clients.

General-public sign-in requires the publisher's Google production configuration and any required verification. See [Google's Desktop OAuth documentation](https://developers.google.com/identity/protocols/oauth2/native-app).

## Replace the artwork

Edit **src/assets**, never the generated dist folder. See the [artwork guide](src/assets/README.md).

```text
src/assets/
  branding/             logo.svg / logo.png / logo.webp, icon.ico, icon.png, tray.png
  mascot/
    idle/               mascot.svg / mascot.png / mascot.webp / mascot.gif
    walk/
    sleep/
    alert/
    happy/
    thinking/
    wink/
```

Each action folder uses the same `mascot` base name. Build-time priority is WebP, PNG, GIF, then SVG. Missing action files fall back to the original cat. Use consistent transparent canvases. Supplied artwork is preserved by the build; `manifest.json` is generated automatically.

## Check and build

```sh
npm run check            # TypeScript, offline tests, development bundle
npm run smoke            # Electron workflows with isolated fake accounts
npm run format:check
npm run dist             # Clean release build and installer
npm run smoke:packaged   # Windows archive/runtime checks and fresh-profile launch
```

On Windows, the installer is `release/MISO Setup 1.0.1.exe`, with a generated SHA-256 checksum. Share the installer rather than this workspace or a user's app-data folder. Node.js is not needed on the recipient's machine.

Windows packaging and fresh-profile startup are verified. macOS/Linux packaging targets exist but require testing on those systems; the packaged verification script targets Windows. Publisher code signing is not configured by default, so Windows can show reputation warnings. No installer is automatically published by CI; Windows build artifacts can be downloaded from a successful Actions run.

## Privacy and security

The full local store is protected through Electron safeStorage. Linux's insecure plaintext keyring fallback is refused. Unreadable encrypted data is not silently replaced. The original `butler-desktop` profile folder and application ID are retained for upgrade compatibility.

Renderers use sandboxing, context isolation, restricted CSP, and a limited IPC bridge. Production builds exclude first-party source maps and smoke-test code and enable Electron runtime and archive protections. Logs, user data, installers, and test screenshots are ignored by Git.

No analytics or crash-upload service is configured. Calendar requests go to Google. If AI is enabled, typed commands and clarification context go to the selected provider or local server. OS encryption does not protect an unlocked device from malware running as its user. See [security and shipping details](docs/SECURITY-AND-SHIPPING.md) and [security reporting](SECURITY.md).

## More documentation

- [User guide](docs/USER-GUIDE.md)
- [Artwork guide](src/assets/README.md)
- [Manual acceptance checks](docs/MANUAL_TESTS.md)
- [Optimization notes](docs/OPTIMIZATION.md)
- [Contributing](CONTRIBUTING.md)
