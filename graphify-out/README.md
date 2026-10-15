# MISO codebase map

Agents: read this guide and [GRAPH_REPORT.md](GRAPH_REPORT.md), then follow the relevant graph nodes to source and tests. Repository-wide instructions live in [AGENTS.md](../AGENTS.md).

## Explore

- [GRAPH_REPORT.md](GRAPH_REPORT.md): clustered architecture, cohesion scores, central nodes, confidence audit, and suggested questions.
- [graph.html](graph.html): interactive community and dependency explorer; open in a browser. Its visualization library loads from `unpkg.com`, so the viewer needs an internet connection; JSON and Markdown remain available offline.
- [graph.json](graph.json): portable graph data. `nodes` contain IDs, labels, source files/locations, and community IDs; `links` contain `source`, `target`, `relation`, confidence, and evidence. The default graph is undirected; `_src` and `_tgt` preserve the extracted edge direction. Hyperedges describe documented flows involving several concepts.
- [manifest.json](manifest.json): source modification times for Graphify updates.
- [cost.json](cost.json): extraction accounting and its measurement limitations.
- [benchmark.json](benchmark.json): heuristic query-context estimates, not measured billing savings.

For targeted lookup, search node labels or `source_file` with `rg`, load the matching node IDs, and select links where `source` or `target` matches. Read each relationship's evidence before relying on it. `EXTRACTED` means explicit syntax or documentation, not a proof of runtime behavior; `INFERRED` requires verification. Community membership is an algorithmic grouping, not an enforced module boundary.

## Start with these files

| Area | Entry points | Related checks |
| --- | --- | --- |
| App lifecycle, windows, IPC | `src/main/index.ts`, `src/main/preload.ts`, `src/shared/types.ts` | `scripts/smoke.mjs`, `src/main/smoke.ts` |
| First-run onboarding and completion | `src/renderer/setup.ts`, `src/renderer/ai-form.ts`, `src/main/index.ts`, `src/main/settings/store.ts` | `tests/secure-store.test.ts`, onboarding scenarios in `src/main/smoke.ts`, `docs/MANUAL_TESTS.md` |
| Google accounts and OAuth | `src/main/calendar/accounts.ts`, `auth.ts`, `oauth-config.ts`, `google.ts`, `provider.ts` | `tests/accounts-manual.test.ts`, `oauth-config.test.ts`, `auth-errors.test.ts`, `calendar-errors.test.ts` |
| Manual calendar operations | `src/main/calendar/manual.ts`, `mapping.ts`; `src/renderer/quick-add.ts`, `calendar-view.ts` | `tests/accounts-manual.test.ts` |
| Optional AI command flow | `src/main/nlu/input.ts`, `schema.ts`, `src/main/controller.ts`, `src/shared/ai.ts` | `tests/nlu.test.ts`, `controller.test.ts`, `providers.test.ts` |
| AI discovery and verified configuration | `src/main/nlu/models.ts`, `configure.ts`, `errors.ts`, `src/renderer/ai-form.ts`, `src/main/settings/store.ts` | `tests/ai-discovery.test.ts`, `providers.test.ts`, `secure-store.test.ts`, synthetic Electron smoke |
| Scheduling modes and saved-event review | `src/renderer/app.ts`, `quick-add.ts`, `calendar-view.ts`, `dashboard.ts`, `src/main/controller.ts` | `tests/controller.test.ts`, `nlu.test.ts`, Electron smoke, `docs/MANUAL_TESTS.md` |
| Synchronization and reminders | `src/main/sync/sync.ts`, `reminders.ts`, `concurrency.ts` | `tests/sync.test.ts`, `reminders.test.ts`, `concurrency.test.ts` |
| Settings and secret storage | `src/main/settings/store.ts`, `login.ts` | `tests/secure-store.test.ts` |
| Renderer, pet, placement | `src/renderer/app.ts`, `setup.ts`, `dialogs.ts`, `dashboard.ts`, `idle-poses.ts`, `src/shared/pet-layout.ts` | `tests/pet-layout.test.ts`, `idle-poses.test.ts`, `hotkey.test.ts`, Electron smoke |
| Build and distribution | `package.json`, `scripts/build.mjs`, `build-configured-release.mjs`, `audit-release.mjs`, `verify-packaged.mjs` | `npm run dist`, `npm run smoke:packaged`, `.github/workflows/check.yml` |

Typical manual flow: renderer -> `window.butler` preload bridge -> main IPC handler -> account/manual calendar services -> Google provider -> sync/snapshot -> renderer. Optional natural-language commands pass through `InputService` and `CommandController`; this is a separate entry into the calendar operations. Check source for the precise path used by the task.

First-run flow: welcome -> required Google sign-in with optional AI checkbox -> Google success and Yes/No AI choice -> provider configuration and successful AI test, or skip -> calendar sync with retry -> ready -> **Start MISO**. `setupWizard()` owns slide state; `finish-setup` in the main process requires current-account sync and verified AI when enabled, saves the encrypted `onboardingCompleted` setting, and reveals the pet. Existing profiles with accounts migrate as complete only when the flag is absent; an explicit false survives interrupted setup. Reset restores first-run onboarding. Follow `main_index_onboardingcomplete`, `renderer_setup_setupwizard`, and `store_protected_onboarding_completion` in the graph, then read the source for guards and failure handling.

Both AI choices require the explicit sync step. The main `sync` IPC handler clears the completion marker before starting and sets it only after successful sync for the unchanged account generation. Background refresh and preliminary Google sign-in sync cannot unlock Start; AI configuration or an AI-enabled choice invalidates the marker. Failed or pending sync keeps Start blocked.

AI setup uses provider model catalogs with pagination and text-model filtering. Automatic ranks available models and verifies up to three candidates with a synthetic parse; custom selection verifies that model. `verifyAISetup()` works on a draft, and `SettingsStore.saveAI()` commits the verified configuration, encrypted key and fingerprint together, preserving working settings on failure. `errors.ts` reports sanitized access, restrictions, quota, model and network failures. These checks do not create a Google event or establish live-provider availability for another account.

`assistantMode` persists independently of `aiEnabled`. AI-assisted clear create commands save directly to Google and return `Reply.scheduledEvent`; the pet opens a saved-event receipt through `quickAdd().reviewScheduled()` and `calendarView()`. Title, start/end and reminder edits use manual preview and confirmation; ambiguous commands ask clarification, and existing-event changes still require confirmation. User-assisted opens manual steps and sends no scheduling commands to AI. Duration flows from the NLU schema through calendar mapping. Follow the shared types, preload bridge and validated main IPC handlers when changing these contracts.

## Coverage and limitations

The map covers supported maintained code under `src/`, `scripts/`, and `tests/`, plus project documentation and the renderer HTML. `.graphifyignore` excludes dependencies, generated builds/installers, local `outputs/` and `artifacts/`, artwork binaries, and font/license assets. Asset READMEs and `docs/UI-BRANDING.md` remain in scope. No image semantics were extracted.

Graphify's detector does not structurally parse CSS, JSON configuration/manifests, YAML workflows, `.mts` configuration, or NSIS scripts. Read those files directly when relevant; documented references may still appear in the graph. External dependency internals are not included. Local import IDs are resolved against extracted file nodes before graph construction to avoid silently dropping project dependencies. The installed extractor's call heuristics can link unrelated same-named methods across scopes and misattribute callers; all structural call edges are excluded from the refreshed snapshot. Use imports and symbol containment for navigation, and inspect source to trace calls. The simple graph can retain only one relationship per node pair.

Documentation concepts were extracted by an agent and merged with deterministic structural extraction. Reported historical test counts and platform verification are claims in those source documents, not checks rerun when building this map. Token telemetry for the extraction agent is unavailable; zero counters mean unmeasured, not free execution. The token-reduction benchmark is a heuristic estimate, not a measured model-cost saving.

## Refresh

Invoke the installed `graphify` skill from the repository root:

```text
/graphify .
/graphify . --update
```

Use a full rebuild after removals/renames or major refactors, and verify that local imports still resolve to extracted file IDs. Exclude structural call edges unless a future extractor provides reliable scope and caller resolution; retain documented semantic relationships and their confidence tags. Preserve relative forward-slash source paths so committed outputs work across machines. Confirm all graph edge endpoints exist, source locations point to maintained files, and report/HTML/JSON describe the same graph. Recheck this guide's entry points after architecture changes. The map's manifest records the files included in the extraction snapshot; files added later may be absent until the next refresh.

## Windows branding and installer

`APP_ID` in `src/shared/brand.ts`, the main process, taskbar window properties, and installed shortcuts share the stable ID `dev.butler.desktop`. Windows Shell uses the packaged `MISO.exe` icon, because it cannot open an icon inside `app.asar`. Development launches still execute Electron's development binary.

`resources/installer/` contains the wizard bitmaps and regeneration instructions; `scripts/prepare-installer.ps1` composes them from the existing artwork. NSIS page copy lives in `scripts/installer.nsh`. The release audit inspects actual PE product metadata and embedded icon bytes. `MISO_RELEASE_DIR` lets the audit and packaged startup checks target a build outside the default `release/` directory, including an output directory outside OneDrive when synchronization locks ASAR files.

The custom finish page explicitly defines its **Launch MISO** checkbox and `MisoLaunchAfterSetup` callback. The callback mirrors electron-builder's assisted finish callback: `StdUtils.ExecShellAsUser` opens the installed shortcut asynchronously in the Windows user context and passes `--updated` only during updates. `runAfterFinish` alone does not configure a replacement finish page. Expanding `StartApp` in this callback would redeclare a variable already defined by the stock install section. First launch opens onboarding; completed profiles start the pet. `scripts/audit-release.mjs` checks these finish-page definitions, while live installer behavior remains a Windows acceptance check.

`scripts/installer-upgrade.nsh` prefers an existing machine-wide installation, enforces the same rule during silent setup, and stops on old-uninstaller failures. The app ID and NSIS GUID remain stable; the standard electron-builder install section removes registered old versions before writing the replacement. Saved profile data is preserved. `scripts/test-installer-upgrade.mjs` compiles eleven Windows NSIS scenarios, including same/different-directory removal and profile preservation. CI runs these after packaging. Read `.nsh`/`.nsi` changes directly and refresh their semantic references explicitly because the detector does not structurally parse those files.
