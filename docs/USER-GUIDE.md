# Installing MISO

1. Install `MISO Setup 1.0.1.exe` on Windows x64.
2. Open MISO and connect your own Google account. Add more accounts if needed and select the calendars you want reminders from.
3. Click the cat to add tasks, reminders, important dates, or view your calendar. Drag it to move it. Configure your hotkey in Settings.
4. AI is optional and off by default. Calendar features do not need an AI key. If you enable AI, enter your own provider key or use your local server; your AI commands will be sent to the service you select.

**Current build:** built-in Google OAuth configuration is intentionally absent to protect the original developer configuration. Before connecting, open **Setup / credentials → Advanced developer configuration** and enter your own Google Desktop OAuth client ID and its client secret if required. Google's Calendar API must be enabled for that project. Follow Google's instructions: https://developers.google.com/identity/protocols/oauth2/native-app

When a build includes a separate public MISO OAuth configuration, users can sign in directly. Advanced configuration can override it. Remove connected accounts before switching clients; **Restore default** restores the build's default. The current build has no default to restore.

## Your data and sharing

Your accounts, calendar cache, settings, refresh tokens, and AI keys are stored separately from the application and protected with your operating system's credential encryption. Each installation starts without another person's accounts or data. Protect your OS account and device; other programs running as you can access your decrypted data.

Forward the original installer file, not your app-data folder, screenshots, logs, or a copy of this development workspace. Check the installer hash against a checksum obtained from a trusted publisher channel. The current installer is unsigned and may trigger a Windows reputation warning; a checksum alone does not prove publisher identity.

Remove an account to disconnect it locally; MISO also attempts token revocation. **Start from scratch** clears local personal data and saved AI keys but retains the selected Google OAuth configuration. Google calendars and events remain in Google. To revoke remaining permissions, manage third-party access in your Google account.

## Startup troubleshooting

Version 1.0.1 finishes installation without automatically launching the app. Open MISO from Start after clicking Finish. If it is blank or closes, try **MISO (Safe Mode)** in Start; it uses software rendering.

Startup failures display a support code and save `startup-status.json` under `%APPDATA%\butler-desktop`. This file contains only the version, platform, architecture, startup phase and support code. Share this file rather than keys, calendar data or the full profile. Never copy another user's app-data folder to a new laptop. A protected profile that cannot be decrypted is retained, not automatically erased.
