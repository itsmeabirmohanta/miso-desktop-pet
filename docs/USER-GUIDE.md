# Installing MISO

1. Install `MISO Setup 1.0.4.exe` on Windows x64.
2. Open MISO and connect your own Google account. Add more accounts if needed and select the calendars you want reminders from.
3. Click the cat to add tasks, reminders, important dates, or view your calendar. Drag it to move it. Configure your hotkey in Settings.
4. AI is optional and off by default. Calendar features do not need an AI key. If you enable AI, enter your own provider key or use your local server; your AI commands will be sent to the service you select.

The publisher-configured installer includes MISO's Desktop OAuth app configuration. Click **Connect Google account** and sign in using your own account. The app configuration is hidden from the settings UI; each user's tokens and calendar data stay in their own protected local profile. Google may restrict authorization while the publisher's consent screen is in Testing mode.

Advanced developer configuration lets users supply their own Desktop OAuth client instead. Remove connected accounts before switching clients; **Restore default** restores MISO's bundled configuration. Builds made without publisher configuration require this advanced setup. See https://developers.google.com/identity/protocols/oauth2/native-app.

If sign-in fails after returning from Google, share the displayed stage and `GOOGLE_...` support code. Version 1.0.4 distinguishes rejected client configuration, rejected sign-in codes, permission denial, connection/TLS errors, and missing offline access or account identity. These messages do not include tokens or raw server responses.

## Your data and sharing

Your accounts, calendar cache, settings, refresh tokens, and AI keys are stored separately from the application and protected with your operating system's credential encryption. Each installation starts without another person's accounts or data. Protect your OS account and device; other programs running as you can access your decrypted data.

Forward the original installer file, not your app-data folder, screenshots, logs, or a copy of this development workspace. Check the installer hash against a checksum obtained from a trusted publisher channel. The current installer is unsigned and may trigger a Windows reputation warning; a checksum alone does not prove publisher identity.

Remove an account to disconnect it locally; MISO also attempts token revocation. **Start from scratch** clears local personal data and saved AI keys but retains the selected Google OAuth configuration. Google calendars and events remain in Google. To revoke remaining permissions, manage third-party access in your Google account.

## Startup troubleshooting

Installation finishes without automatically launching the app. Open MISO from Start after clicking Finish. If it is blank or closes, try **MISO (Safe Mode)** in Start or on the desktop; it uses software rendering. You can also run `MISO.exe --safe-mode`. Safe Mode does not repair storage errors.

Version 1.0.2 reports separate codes for unavailable encryption, failed encryption, and an unreadable vault. For `VAULT_UNREADABLE`, the startup dialog offers **Start separate profile**, or use **MISO (Recovery Profile)** in Start. This preserves the original encrypted data and opens empty setup in `%APPDATA%\miso-recovery`; reconnect your own calendars. Once this profile starts successfully, normal launches use it too. To return to the original profile, close MISO and remove only the `%APPDATA%\miso-recovery-selected` marker file. No profile data is deleted by changing this marker.

Startup failures display a support code and save `startup-status.json` under `%APPDATA%\butler-desktop`. This file contains only the version, platform, architecture, startup phase and support code. Share this file rather than keys, calendar data or the full profile. Never copy another user's app-data folder to a new laptop. A protected profile that cannot be decrypted is retained, not automatically erased.
