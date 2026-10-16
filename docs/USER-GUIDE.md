# Installing MISO

1. Install the Windows x64 installer (`MISO Setup 1.0.11.exe` for the local build), or use the published `MISO-Setup.exe` from [GitHub Releases](https://github.com/itsmeabirmohanta/miso-desktop-pet/releases/latest). Leave **Launch MISO** checked on the finish page to open it immediately, or open it later from Start.
2. On first launch, choose **Start onboarding** on the welcome screen and sign in with Google. Google sign-in is required. The **Enable AI Assistant** checkbox is optional; it enables natural-language events and reminders after configuration.
3. After the Google sign-in success screen, choose **Yes, enable AI** or **No, thanks**. Yes opens AI setup: choose a provider, paste its API key, leave **Automatic (recommended)** selected, and choose **Save & test AI**. MISO discovers available text models and tests a suitable model before saving. You can also continue without AI. No goes directly to calendar sync. Manual calendar features never require an AI key.
4. Wait for **Sync completed**, then choose **Start MISO**. Setup closes and the pet appears. A failed sync offers retry; an interrupted first setup resumes before the pet starts. Completed setup is remembered across launches and upgrades. **Start from scratch** restores first-run onboarding.
   Sync is mandatory for both choices: **Yes → AI details → sync → Start MISO**, or **No → sync → Start MISO**. Preliminary sign-in/background sync does not unlock Start; choosing/configuring AI requires completing the explicit sync step. A failed sync stays blocked until retry succeeds.
5. Click the cat to add tasks, reminders, important dates, or view your calendar. Drag it to move it. Settings lets you add more Google accounts, choose calendars, change your hotkey, or enable AI later. When enabled, typed AI commands go to the provider or local server you select.

## AI setup and scheduling modes

For Gemini, use a **Gemini API key from Google AI Studio**. A Google OAuth client secret and a Gemini chat subscription are different credentials. The official API URL is filled in automatically. Recognizable key prefixes can select Gemini, Anthropic or OpenAI while entering a new key; the visible provider remains editable, unfamiliar key formats are accepted, and explicitly selected compatible/local endpoints are never changed automatically. No connection is made until you load models or submit setup.

**Load available models** fills the selector with text models returned by the provider for that key, including paginated catalogs. **Automatic** prefers a stable, efficient text model and tests up to three candidates when a model fails or has no quota. Model IDs are discovered rather than fixed in the app. API access and quota vary by account. You can choose a listed model or **Enter a custom model ID**, including when a compatible server has no catalog. Ollama supports installed local models without an API key unless your server requires one. Advanced connection settings let you supply a compatible service's URL. Remote endpoints require HTTPS; local servers may use HTTP.

Verification sends a small synthetic reminder command to your chosen service, without creating a Google event. Provider charges may apply. Only a successful interpretation saves the new model/key and enables AI; a failed setup leaves the previously saved configuration intact. Errors distinguish invalid credentials, Gemini key restrictions, access denial, model availability, network failures, and quota exhaustion. A valid key with exhausted quota is not reported as an invalid key.

Temporary AI service failures such as HTTP 503 receive at most two automatic retries with backoff, within the request deadline. Long provider cooldowns and explicit no-retry responses are respected. Calendar writes are not retried by this mechanism. A persistent 503 means the provider/model is still unavailable; try again later or select another available model. HTTP 400/422 errors distinguish unsupported JSON schemas, JSON modes, instruction roles, context size, and billing where the provider supplies a recognizable diagnostic. Unknown request failures still require checking the selected provider, model and API base URL.

Scheduling normalizes pasted API endpoint paths just like setup. OpenAI reasoning models receive the appropriate instruction role. When Gemini explicitly rejects its structured-output schema, JSON mode or system-instruction field, MISO retries with that unsupported feature removed. Compatible chat servers that explicitly reject instruction roles can use a combined user prompt. Every response still passes local validation before any Google Calendar action. These compatibility attempts can make additional provider requests; a failed setup still does not save its draft key/model.

Provider references: [OpenAI message formats](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [Gemini retry guidance](https://ai.google.dev/gemini-api/docs/troubleshooting), and [Claude API errors](https://platform.claude.com/docs/en/api/errors). Automated checks use synthetic credentials and local/mock providers; they cannot establish live model access, credits or regional availability for your account.

After successful configuration, **AI-assisted** becomes the scheduling workflow. Click the cat or use your hotkey and type, for example, “remind me to call Mum tomorrow at 6pm” or “planning Friday at 10 for one hour.” A clear create command saves automatically to the default account's MISO calendar. MISO then shows the saved event, account, end time and reminders. Choose **Edit** to adjust the title, start/end or reminder offsets; review and confirm those changes. Ambiguous commands ask a clarification instead of writing. Existing-event edits and deletions still require confirmation; whole-series manual edits open Google Calendar.

With AI enabled, the pet popup offers **AI-assisted / User-assisted** buttons, and Settings has a Scheduling workflow selector. **User-assisted** keeps the step-by-step form and sends no scheduling commands to an AI provider. Switching modes is remembered and does not disconnect Google, disable reminders, or discard your AI configuration. Disabling AI retains the manual workflow.

The official website is [miso.abirmahanta.in](https://miso.abirmahanta.in/). Setup, Settings, and the tray menu include links to the website, [privacy policy](https://miso.abirmahanta.in/privacy-policy), and [terms of service](https://miso.abirmahanta.in/terms-of-service). These links open your browser; MISO does not attach account identities, credentials, or calendar details to them.

While idle, MISO changes between resting, happy and sleeping poses every 15 seconds. Hovering returns it to resting immediately; leaving restarts the interval. This changes only its appearance and does not open a popup or move the pet. Rotation pauses while a dialog is open, reminders are paused, the pet is hidden, or an action is in progress. Reduced-motion preferences disable automatic pose rotation.

The publisher-configured installer includes MISO's Desktop OAuth app configuration. Click **Connect Google account** and sign in using your own account. The app configuration is hidden from the settings UI; each user's tokens and calendar data stay in their own protected local profile. Google may restrict authorization while the publisher's consent screen is in Testing mode.

Advanced developer configuration lets users supply their own Desktop OAuth client instead. Remove connected accounts before switching clients; **Restore default** restores MISO's bundled configuration. Builds made without publisher configuration require this advanced setup. See https://developers.google.com/identity/protocols/oauth2/native-app.

If sign-in fails after returning from Google, share the displayed stage and `GOOGLE_...` support code. Version 1.0.4 distinguishes rejected client configuration, rejected sign-in codes, permission denial, connection/TLS errors, and missing offline access or account identity. These messages do not include tokens or raw server responses.

## Reinstalling and upgrading

Run the new installer to replace a registered MISO installation. The installer keeps the same installation ID across releases, removes the previous version before copying the new files, and refreshes its desktop and Start menu shortcuts. This also works when choosing a different installation directory. Versions from this project's earlier Butler branding are replaced when they use the same installation ID.

If MISO is already installed for the whole computer, setup keeps that installation scope and requests Windows administrator approval when needed. It also removes a registered MISO copy for the current Windows user, preventing those two installation scopes from leaving duplicate copies. On a computer without a machine-wide copy, a per-user installation remains available.

Saved accounts, encrypted settings, and calendar data are preserved. If the old uninstaller is missing or fails, setup stops and asks you to repair/remove the old installation through Windows Settings before trying again. Setup does not search other users' private profiles or delete portable copies, source checkouts, downloaded installers, or unrelated desktop files.

## Your data and sharing

Your accounts, calendar cache, settings, refresh tokens, and AI keys are stored separately from the application and protected with your operating system's credential encryption. Each installation starts without another person's accounts or data. Protect your OS account and device; other programs running as you can access your decrypted data.

Forward the original installer file, not your app-data folder, screenshots, logs, or a copy of this development workspace. Check the installer hash against a checksum obtained from a trusted publisher channel. The current installer is unsigned and may trigger a Windows reputation warning; a checksum alone does not prove publisher identity.

Remove an account to disconnect it locally; MISO also attempts token revocation. **Start from scratch** clears local personal data and saved AI keys but retains the selected Google OAuth configuration. Google calendars and events remain in Google. To revoke remaining permissions, manage third-party access in your Google account.

Removing the last Google account immediately returns MISO to the first welcome slide. The pet, reminders, and calendar actions stay unavailable until you connect Google and complete onboarding again. Removing one account while another remains keeps the app available. If Google cannot confirm revocation, MISO still removes local access and explains how to revoke permissions yourself.

Account removal, event creation/deletion, and reset use confirmation dialogs with **Cancel** selected initially. Completed actions and failures show titled feedback; acknowledgement dialogs have a single **OK** button. When the last account is removed or MISO is reset, the result appears in the visible onboarding window.

## Startup troubleshooting

The installed app runs as `MISO.exe` with MISO product metadata and a custom Windows icon. Setup and Settings use the same Windows app identity as the installed shortcuts. The installer has MISO welcome/finish pages, mascot artwork, and matching install/uninstall icons.

Running `npm start` uses the development `electron.exe`, so Task Manager can still call that process Electron. Use MISO from the Start menu or `release/win-unpacked/MISO.exe` to check the shipping process name. If an old pinned taskbar shortcut still shows Electron, close the app, unpin that shortcut, open the installed MISO, and pin its new taskbar entry.

The installer finish page offers **Launch MISO**. Uncheck it to open the app later from Start. Launch uses the Windows user context and does not wait for MISO to exit before closing the installer. If the app is blank or closes, try **MISO (Safe Mode)** in Start or on the desktop; it uses software rendering. You can also run `MISO.exe --safe-mode`. Safe Mode does not repair storage errors.

Version 1.0.2 reports separate codes for unavailable encryption, failed encryption, and an unreadable vault. For `VAULT_UNREADABLE`, the startup dialog offers **Start separate profile**, or use **MISO (Recovery Profile)** in Start. This preserves the original encrypted data and opens empty setup in `%APPDATA%\miso-recovery`; reconnect your own calendars. Once this profile starts successfully, normal launches use it too. To return to the original profile, close MISO and remove only the `%APPDATA%\miso-recovery-selected` marker file. No profile data is deleted by changing this marker.

Startup failures display a support code and save `startup-status.json` under `%APPDATA%\butler-desktop`. This file contains only the version, platform, architecture, startup phase and support code. Share this file rather than keys, calendar data or the full profile. Never copy another user's app-data folder to a new laptop. A protected profile that cannot be decrypted is retained, not automatically erased.
