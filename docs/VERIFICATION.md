# Implementation verification

## MISO 1.0.12 — 22 October 2026

The Windows x64 release was rebuilt from current source using Node.js 22.14.0 and Electron 44.7.0. The build reused only the public Desktop OAuth app configuration from the existing publisher package; no personal profile was read.

- `npm run format:check` and `npm run check` passed: TypeScript, all 188 tests in 16 test files, and the application build.
- `npm run smoke` passed in a desktop session with isolated synthetic accounts. It covered onboarding, AI scheduling and editable receipts, sync retry, two accounts, last-account removal/cancellation with delayed failed revocation, accessible dialogs, and manual calendar writes.
- `npm run dist` passed, including the clean-build and packaged archive/runtime-fuse audits. The additional `--require-oauth` audit confirmed that the publisher package includes its default Desktop OAuth configuration.
- `npm run smoke:packaged` and the separate Safe Mode startup check passed with fresh temporary profiles, encrypted storage, setup-window checks, and disabled NODE_OPTIONS injection.
- `npm run test:installer` passed all 11 compiled NSIS scenarios, including same/different-directory replacement and saved-profile preservation. Production registrations and user profiles were untouched.
- `npm audit --omit=dev --audit-level=high` reported zero known production dependency vulnerabilities.

The installer offers **Launch MISO** on the finish page and retains the stable app ID and installer GUID. A SHA-256 checksum accompanies the release. The installer is unsigned; Google OAuth production approval has not been confirmed. These checks do not establish live Google consent, live provider access/quota, or all manual acceptance scenarios. See [shipping requirements](SECURITY-AND-SHIPPING.md) and [manual acceptance](MANUAL_TESTS.md).

## Historical MISO 1.0.7 verification

MISO 1.0.7 was checked on 13 October 2026 on Windows x64 with Node.js 22 and Electron 44.7.0.

- TypeScript checking, formatting, and application build passed.
- The official website, privacy policy, and terms pages returned HTTPS 200 responses. Setup and Settings website/policy buttons were exercised through the real IPC bridge with browser opening intercepted; their exact fixed URLs were verified and arbitrary HTTPS/JavaScript help URLs were rejected. Tray links use the same fixed URL map. Buttons open the system browser without attaching account or calendar data.
- All 133 offline tests passed, covering account isolation, OAuth configuration and sanitized sign-in failures, confirmations, scheduling, synchronization, encrypted-store migration/failures, popup placement, and idle pose scheduling.
- The Electron smoke workflow passed with isolated synthetic accounts: Google-first setup, two accounts, optional AI, manual event creation, agenda/edit confirmations, settings and popup exclusivity, hotkeys, removal/reset, and encrypted storage. Pose rotation and hover-to-rest are exercised with both reduced-motion preferences explicitly set for the test; normal OS preferences remain unchanged.
- The shipping executable started from fresh, initially nonexistent temporary profiles in normal and Safe Mode, opened setup, created only an encrypted vault, and ignored NODE_OPTIONS injection.
- The packaged archive passed the runtime-fuse and file audit. It contains the default Desktop OAuth app configuration, excludes development/test modules, source maps, profiles and personal account data, and keeps that configuration out of the UI.
- All 16 original artwork files remained unchanged; both locally bundled fonts and their licenses matched the packaged files. Checked text contrast exceeded 4.5:1 and control boundaries exceeded 3:1.
- The production dependency audit reported zero known vulnerabilities. This is not a formal security assessment.

The 1.0.7 installer audit required auto-launch at Finish to remain disabled and required Safe Mode and Recovery Profile shortcuts. Earlier per-user silent installation checks completed with exit code 0; that audit did not reinstall over the running user installation or reset its saved data. The current release instead offers the Launch MISO checkbox described above.

## Preventing build regressions

GitHub Actions receives the same publisher Desktop OAuth app configuration through repository secrets, rather than committed credential values. Publisher builds must pass a configured-OAuth check before the installer can be uploaded. Pull-request artifacts are labeled test builds and may require user-supplied configuration. CI also exercises normal and Safe Mode startup of the packaged executable.

The pose smoke test explicitly selects reduced-motion and normal-motion modes and temporarily removes renderer timer throttling during its timed assertion, so Windows runner preferences and background scheduling do not create a false failure. The shipped app still respects reduced-motion preferences and pauses decorative pose timers while hidden or busy.

Vitest is restricted to the repository's `tests/**/*.test.ts` files so ignored publication snapshots do not duplicate the local test suite.

Screenshots and generated reports remain under ignored `artifacts/`. Automated tests do not sign in to Google or use personal calendars. Live Google sign-in was previously confirmed by the user; this audit verifies configuration and failure handling, not a new Google consent exchange.

Live Google consent, provider/model behavior, sleep/resume, DST, OS notifications, multi-monitor placement, and login startup still require [manual acceptance](MANUAL_TESTS.md). Another laptop's Windows security settings, network, or Google account policy can produce failures beyond these checks. Windows x64 is the verified installer target; macOS/Linux packaging has not been verified here.

Publisher signing and Google production approval are separate from repository publication. The current installer remains unsigned. Bundled Desktop OAuth app configuration is extractable from an installed desktop application; personal refresh tokens and calendar data are never bundled. See [shipping requirements](SECURITY-AND-SHIPPING.md).
