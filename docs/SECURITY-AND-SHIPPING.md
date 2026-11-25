# MISO distribution

Share the published `MISO-Setup.exe`, its SHA-256 checksum, and end-user instructions from [GitHub Releases](https://github.com/itsmeabirmohanta/miso-desktop-pet/releases/latest). Locally generated installers use `release/MISO-Setup.exe`. The development repository can be public; private `.env` files, ignored `artifacts`, logs, screenshots, app-data folders, and existing user profiles must stay outside distribution. See the [publication review](PUBLICATION-REVIEW.md).

## Implemented protections

- The full MISO store is encrypted through Electron safeStorage using the operating system's credential facilities. This includes account email addresses, cached event titles/dates, preferences, API keys, and refresh tokens. Previously plaintext personal fields migrate in place. An unreadable vault causes startup to fail rather than silently discarding data.
- Windows encryption is tied to the OS user/device protection. It is not a defense against malware running as that user, an administrator, or an unlocked compromised computer. No application can guarantee safety after arbitrary modification by a malicious distributor.
- A secure OS keyring is required. Linux's plaintext fallback is refused.
- Google uses the system browser, PKCE, random state validated in constant time, a loopback listener, and verified account identity. OAuth tokens and AI keys remain in the main process, not renderer snapshots.
- Renderer isolation/sandbox and CSP remain enabled. New windows, navigation, webviews, and browser permission requests are denied. IPC calls must originate from a known main frame. Packaged DevTools are disabled.
- Production Electron fuses disable RunAsNode, NODE_OPTIONS injection, and Node inspection. Cookie encryption, ASAR integrity validation, and ASAR-only loading are enabled.
- Release builds are clean and omit first-party source maps and the smoke-test module. Packaging uses explicit first-party file patterns. Automated audits check development/test markers, optional publisher-supplied private markers, developer credentials supplied through environment variables, and runtime fuses. These checks reduce accidental inclusion; they are not a formal security certification.
- No analytics/crash-upload service is configured. Google sync sends calendar requests to Google. AI is off by default; when enabled, typed AI commands go to the selected provider or local server. Provider policies govern data they receive.
- Installed Windows copies check this repository's GitHub Releases for updates shortly after startup and every six hours, and from **Check for updates…** in the tray menu. MISO asks before downloading and again before restarting; a postponed update installs when MISO quits. The updater reads `latest.yml` from the newest non-draft, non-prerelease release and rejects a download whose SHA-512 does not match it. Because the installer is unsigned, no publisher signature is checked: update integrity relies on HTTPS and on the security of the publisher's GitHub account and release assets. Development, smoke, and `--user-data-dir` verification runs never check for updates. The check sends no account, calendar, or AI data.
- Reset clears local personal data and AI keys, while retaining the selected OAuth configuration for reconnecting. Account removal attempts Google token revocation; local reset does not revoke remote Google permissions. Google calendars/events remain in Google.

## Google configuration and verification

The publisher-configured release includes the Desktop OAuth app configuration selected by the publisher. It is stored in GitHub Actions secrets for publisher builds and is not committed as credential values in this repository. The installer deliberately embeds this app configuration so users can connect their own Google accounts without creating a Cloud project. Personal account tokens, AI keys, and calendar data are excluded. Unconfigured source or test builds require a user's Desktop OAuth configuration under **Setup / credentials → Advanced developer configuration**.

Google Desktop OAuth clients are public clients. A client ID is present in the browser's authorization request, and a desktop client secret cannot be made confidential inside a distributed executable. UI masking, minification, ASAR packaging, and encryption with a shipped decryption key do not solve this. An OAuth client ID alone does not grant access to an owner's Google account.

A dedicated Google Cloud project/client for public distribution separates the app's public identity from unrelated development or server credentials. Regardless of which Desktop client is selected, its bundled values cannot be hidden from someone inspecting the installer or Google authorization URL. They are not personal account tokens and do not grant access to a user's account without authorization.

An alternative is a hosted login/token service. This requires a separate deployment, HTTPS domain, server-side credential storage, token lifecycle and access controls, and a data-handling policy. A server can keep its secret confidential, but the client ID used for Google authorization is still visible in the browser; use a separate public application registration if the original ID must stay private.

The client can be changed after connected accounts are removed. **Restore default** re-selects the build's default configuration without exposing it in the settings UI. This button is shown only when a default exists. Existing refresh tokens cannot be reused across OAuth clients.

To build with a separate public Desktop client, supply `BUTLER_PUBLIC_GOOGLE_CLIENT_ID` and, if required by that client's token exchange, `BUTLER_PUBLIC_GOOGLE_CLIENT_SECRET` to the release build. These are deliberately different from development environment variables. Never supply personal access/refresh tokens, a service-account private key, an AI key, or a confidential web client secret. Anything included through these public release variables is extractable from the installer.

Before general distribution, the publisher must enable Calendar API and complete Google's production publishing/verification requirements for the requested scopes. Testing-mode consent configuration is not a general-public release. Workspace administrators can impose additional restrictions.

MISO's official homepage is `https://miso.abirmahanta.in/`, with privacy policy at `https://miso.abirmahanta.in/privacy-policy` and terms at `https://miso.abirmahanta.in/terms-of-service`. These links are available inside the app and in the repository documentation. Google Auth Platform branding and domain ownership must be configured separately in the publisher's Cloud project; adding links to the app does not submit Google verification.

Google reference: https://developers.google.com/identity/protocols/oauth2/native-app
Production verification: https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
Electron integrity: https://www.electronjs.org/docs/latest/tutorial/asar-integrity

## Build and verification

1. `npm run check` — type check, unit tests, and development build.
2. `npm run smoke` — real Electron workflows with isolated fake accounts; artifacts stay outside the release.
3. `npm run dist` — clean production build, exclusion audit, Windows installer, archive/fuse audit, and SHA-256 checksum.
4. `npm run smoke:packaged` — verify the archive/fuses and launch the actual executable using a fresh temporary profile; confirm encrypted storage and the setup window, with a deliberately invalid NODE_OPTIONS injection present.

## Publishing a release with in-app updates

Installed copies update only from a published GitHub release that carries all three update assets produced by `npm run dist`:

1. Bump `version` in `package.json` (semantic versioning; installed copies offer only a higher version).
2. Run the build and verification steps above. The packaged audit confirms that `release/latest.yml` names `MISO-Setup.exe` with that file's exact SHA-512 and that the package's `app-update.yml` points at this repository.
3. Create a release tagged `v<version>` (the differential download locates the previous release's blockmap by tag) and upload, unrenamed, `MISO-Setup.exe`, `MISO-Setup.exe.blockmap`, `latest.yml`, and optionally `MISO-Setup.exe.sha256` and `USER-GUIDE.md`. Do not mark it as a draft or prerelease.

### Signed releases (SignPath Foundation)

`.github/workflows/release.yml` produces signed releases once the SignPath Foundation OSS application is approved. It runs on a `v<version>` tag that must match `package.json`:

1. Build and audit the release, then package `release/win-unpacked` with `scripts/electron-builder.signed.cjs`. That configuration adds `publisherName: SignPath Foundation` to `app-update.yml`, so signed copies accept only updates signed by that publisher.
2. Upload `MISO.exe` alone and submit it to SignPath (artifact configuration `app`). Wait for manual approval, then replace the unsigned executable and confirm its signature.
3. Build the NSIS installer from the signed application (`--prepackaged`), submit it (artifact configuration `installer`), and confirm its signature.
4. Rebuild `latest.yml` and the blockmap from the signed bytes (`scripts/refresh-update-manifest.mjs`), then run the packaged audit, packaged startup in normal and Safe Mode, and the installer scenarios.
5. Create a **draft** GitHub release with the installer, blockmap, `latest.yml`, checksum and user guide. Review the notes, then publish it.

One-time setup after approval: add the `SIGNPATH_API_TOKEN` repository secret (a submitter's API token) and the `SIGNPATH_ORGANIZATION_ID` variable. Set `SIGNPATH_PROJECT_SLUG` and `SIGNPATH_POLICY_SLUG` variables if they differ from `miso-desktop-pet` and `release-signing`. Create artifact configurations named `app` and `installer` from the reference copies in `.signpath/artifact-configurations/`. The workflow stops before building if the token or organization ID is missing. The uninstaller embedded in the installer is not separately signed.

Once a signed release ships, every later release must be signed by the same publisher; otherwise signed installations reject the update. Publish unsigned test builds only from CI artifacts, never as GitHub releases.

A release missing `latest.yml`, or with a renamed installer, produces no update prompt or a failed download. Rebuilding after uploading changes the checksum; upload the `latest.yml` from the same build as the installer. Versions before the first release containing the updater cannot update themselves; those users must install that release manually once.

`npm run smoke:packaged` does not sign in to Google or send test data to a production account. The temporary profile is removed after the process exits. Production builds do not enable `--smoke-test`.

The build currently has no publisher signing certificate. A production certificate must be configured by the publisher for a signed installer. A locally generated checksum detects accidental changes when checked against a trusted separately obtained value; it does not establish publisher identity or replace code signing. Google verification, real sign-in using a separate release client, and publisher signing remain external shipping requirements.
