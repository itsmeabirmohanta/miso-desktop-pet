# MISO 1.0.1 distribution

Share only `release/MISO Setup 1.0.1.exe`, its SHA-256 checksum, and end-user instructions. Do not share this workspace, `artifacts`, logs, screenshots, your app-data folder, or a folder copied from an existing installation's user profile.

## Implemented protections

- The full MISO store is encrypted through Electron safeStorage using the operating system's credential facilities. This includes account email addresses, cached event titles/dates, preferences, API keys, and refresh tokens. Previously plaintext personal fields migrate in place. An unreadable vault causes startup to fail rather than silently discarding data.
- Windows encryption is tied to the OS user/device protection. It is not a defense against malware running as that user, an administrator, or an unlocked compromised computer. No application can guarantee safety after arbitrary modification by a malicious distributor.
- A secure OS keyring is required. Linux's plaintext fallback is refused.
- Google uses the system browser, PKCE, random state validated in constant time, a loopback listener, and verified account identity. OAuth tokens and AI keys remain in the main process, not renderer snapshots.
- Renderer isolation/sandbox and CSP remain enabled. New windows, navigation, webviews, and browser permission requests are denied. IPC calls must originate from a known main frame. Packaged DevTools are disabled.
- Production Electron fuses disable RunAsNode, NODE_OPTIONS injection, and Node inspection. Cookie encryption, ASAR integrity validation, and ASAR-only loading are enabled.
- Release builds are clean and omit first-party source maps and the smoke-test module. Packaging uses explicit first-party file patterns. Automated audits check development/test markers, optional publisher-supplied private markers, developer credentials supplied through environment variables, and runtime fuses. These checks reduce accidental inclusion; they are not a formal security certification.
- No analytics/crash-upload service is configured. Google sync sends calendar requests to Google. AI is off by default; when enabled, typed AI commands go to the selected provider or local server. Provider policies govern data they receive.
- Reset clears local personal data and AI keys, while retaining the selected OAuth configuration for reconnecting. Account removal attempts Google token revocation; local reset does not revoke remote Google permissions. Google calendars/events remain in Google.

## Google configuration and the remaining release decision

The current installer intentionally contains **no original developer OAuth configuration**. Users can enter their own Desktop OAuth configuration under **Setup / credentials → Advanced developer configuration**.

Google Desktop OAuth clients are public clients. A client ID is present in the browser's authorization request, and a desktop client secret cannot be made confidential inside a distributed executable. UI masking, minification, ASAR packaging, and encryption with a shipped decryption key do not solve this. An OAuth client ID alone does not grant access to an owner's Google account.

For built-in login, create a separate Google Cloud OAuth client for MISO's public distribution. Keep the owner's original client out of the release. The separate public client still cannot be hidden from someone inspecting the application or Google authorization URL.

An alternative is a hosted login/token service. This requires a separate deployment, HTTPS domain, server-side credential storage, token lifecycle and access controls, and a data-handling policy. A server can keep its secret confidential, but the client ID used for Google authorization is still visible in the browser; use a separate public application registration if the original ID must stay private.

The client can be changed after connected accounts are removed. **Restore default** re-selects the build's default configuration without exposing it in the settings UI. This button is shown only when a default exists. Existing refresh tokens cannot be reused across OAuth clients.

To build with a separate public Desktop client, supply `BUTLER_PUBLIC_GOOGLE_CLIENT_ID` and, if required by that client's token exchange, `BUTLER_PUBLIC_GOOGLE_CLIENT_SECRET` to the release build. These are deliberately different from development environment variables. Never supply personal access/refresh tokens, a service-account private key, an AI key, or a confidential web client secret. Anything included through these public release variables is extractable from the installer.

Before general distribution, the publisher must enable Calendar API and complete Google's production publishing/verification requirements for the requested scopes. Testing-mode consent configuration is not a general-public release. Workspace administrators can impose additional restrictions.

Google reference: https://developers.google.com/identity/protocols/oauth2/native-app
Production verification: https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
Electron integrity: https://www.electronjs.org/docs/latest/tutorial/asar-integrity

## Build and verification

1. `npm run check` — type check, unit tests, and development build.
2. `npm run smoke` — real Electron workflows with isolated fake accounts; artifacts stay outside the release.
3. `npm run dist` — clean production build, exclusion audit, Windows installer, archive/fuse audit, and SHA-256 checksum.
4. `npm run smoke:packaged` — verify the archive/fuses and launch the actual executable using a fresh temporary profile; confirm encrypted storage and the setup window, with a deliberately invalid NODE_OPTIONS injection present.

`npm run smoke:packaged` does not sign in to Google or send test data to a production account. The temporary profile is removed after the process exits. Production builds do not enable `--smoke-test`.

The build currently has no publisher signing certificate. A production certificate must be configured by the publisher for a signed installer. A locally generated checksum detects accidental changes when checked against a trusted separately obtained value; it does not establish publisher identity or replace code signing. Google verification, real sign-in using a separate release client, and publisher signing remain external shipping requirements.
