# Graph Report - .  (2026-10-16)

## Corpus Check
- Corpus is ~49,154 words - fits in a single context window. You may not need a graph.

## Summary
- 338 nodes · 602 edges · 14 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.89)
- Token cost: unavailable for the extraction agent; zero counters mean unmeasured, not free execution. Structural extraction uses no LLM API calls.

## Community Hubs (Navigation)
- [AI Workflows and Onboarding](#community-0---ai-workflows-and-onboarding)
- [Windows and IPC Coordination](#community-1---windows-and-ipc-coordination)
- [AI Discovery and Provider Services](#community-2---ai-discovery-and-provider-services)
- [Installer and Shipping Verification](#community-3---installer-and-shipping-verification)
- [Account Routing and Synchronization](#community-4---account-routing-and-synchronization)
- [Renderer Pet and Desktop Verification](#community-5---renderer-pet-and-desktop-verification)
- [Manual Calendars and OAuth Configuration](#community-6---manual-calendars-and-oauth-configuration)
- [Artwork and Typography](#community-7---artwork-and-typography)
- [Synchronization and Reminder Scheduling](#community-8---synchronization-and-reminder-scheduling)
- [Google Provider and Error Handling](#community-9---google-provider-and-error-handling)
- [AI Command Confirmation](#community-10---ai-command-confirmation)
- [OAuth Sign-In and Errors](#community-11---oauth-sign-in-and-errors)
- [Icon Binary Generation](#community-12---icon-binary-generation)
- [Development App Launcher](#community-13---development-app-launcher)

## God Nodes (most connected - your core abstractions)
1. `Installation and recovery guide` - 24 edges
2. `MISO codebase overview` - 17 edges
3. `Package scripts and shipping configuration` - 17 edges
4. `Manual acceptance checklist` - 16 edges
5. `AccountCalendarProvider` - 15 edges
6. `Agent architecture and verification instructions` - 12 edges
7. `SettingsStore` - 12 edges
8. `Security boundaries and shipping requirements` - 11 edges
9. `Artwork drop-in guide` - 11 edges
10. `Protected onboarding completion and migration` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Security boundaries and shipping requirements` --documents_pkce_loopback_auth--> `connectGoogle()`  [INFERRED]
  docs/SECURITY-AND-SHIPPING.md → src/main/calendar/auth.ts
- `MISO codebase overview` --documents_idle_pose_contract--> `IdlePoseCycle`  [INFERRED]
  README.md → src/renderer/idle-poses.ts
- `Deadline based reminder scheduling` --implemented_by--> `ReminderEngine`  [INFERRED]
  docs/OPTIMIZATION.md → src/main/sync/reminders.ts
- `Package scripts and shipping configuration` --configures_matching_shortcut_identity--> `Windows AppUserModelID alignment`  [EXTRACTED]
  package.json → src/shared/brand.ts
- `Installation and recovery guide` --explains_taskbar_identity_and_stale_pins--> `Windows AppUserModelID alignment`  [EXTRACTED]
  docs/USER-GUIDE.md → src/shared/brand.ts

## Communities

### Community 0 - "AI Workflows and Onboarding"
Cohesion: 0.08
Nodes (53): Installation and recovery guide, MISO codebase overview, Manual acceptance checklist, SettingsStore, Last-account removal returns to welcome, Protected onboarding completion and migration, Security boundaries and shipping requirements, Verified draft AI configuration (+45 more)

### Community 1 - "Windows and IPC Coordination"
Cohesion: 0.05
Nodes (51): index.ts, Windows AppUserModelID alignment, preload.ts, Sandboxed renderer and trusted IPC boundary, Onboarding gate for calendar actions, hotkey.ts, secureWindow(), handle() (+43 more)

### Community 2 - "AI Discovery and Provider Services"
Cohesion: 0.07
Nodes (50): types.ts, ai.ts, errors.ts, input.ts, configure.ts, mapping.ts, models.ts, controller.ts (+42 more)

### Community 3 - "Installer and Shipping Verification"
Cohesion: 0.14
Nodes (30): Package scripts and shipping configuration, Agent architecture and verification instructions, audit-release.mjs, test-installer-upgrade.mjs, MISO installer artwork guide, Contributor workflow, Preserved accounts and settings across reinstalls, Branded NSIS wizard resources (+22 more)

### Community 4 - "Account Routing and Synchronization"
Cohesion: 0.07
Nodes (28): AccountCalendarProvider, accounts.ts, SyncService, mapLimited(), performSync(), Serialized incremental calendar synchronization, .perform(), .rebuild() (+20 more)

### Community 5 - "Renderer Pet and Desktop Verification"
Cohesion: 0.09
Nodes (25): app.ts, smoke.ts, IdlePoseCycle, Isolated synthetic-account verification, brand.ts, idle-poses.ts, site-links.ts, quick-add.ts (+17 more)

### Community 6 - "Manual Calendars and OAuth Configuration"
Cohesion: 0.1
Nodes (22): store.ts, ManualCalendarService, manual.ts, accounts-manual.test.ts, oauth-config.ts, oauth-config.test.ts, .clear(), .cancel() (+14 more)

### Community 7 - "Artwork and Typography"
Cohesion: 0.12
Nodes (21): Artwork drop-in guide, build.mjs, Baloo 2 headings font, Generated artwork manifest, Inter interface font, MISO visual styling, Renderer HTML and content security policy, prepare-assets.mjs (+13 more)

### Community 8 - "Synchronization and Reminder Scheduling"
Cohesion: 0.11
Nodes (18): ReminderEngine, reminders.ts, Sync and timer optimization review, performance.ts, .clear(), Deadline based reminder scheduling, .constructor(), .done() (+10 more)

### Community 9 - "Google Provider and Error Handling"
Cohesion: 0.12
Nodes (17): provider.ts, GoogleCalendarProvider, sync.ts, google.ts, sync.test.ts, .constructor(), .createEvent(), .deleteEvent() (+9 more)

### Community 10 - "AI Command Confirmation"
Cohesion: 0.2
Nodes (10): CommandController, .command(), .choose(), .clear(), .confirm(), .constructor(), .isBusy(), .label() (+2 more)

### Community 11 - "OAuth Sign-In and Errors"
Cohesion: 0.25
Nodes (8): auth-errors.ts, auth.ts, GoogleSignInError, connectGoogle(), makeAuth(), .constructor(), auth-errors.test.ts, signInError()

### Community 12 - "Icon Binary Generation"
Cohesion: 0.5
Nodes (4): make-icon.mjs, chunk(), crc(), writeFallback()

### Community 13 - "Development App Launcher"
Cohesion: 1.0
Nodes (1): start.mjs

## Knowledge Gaps
- **9 isolated node(s):** `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide`, `Idle mascot artwork guide`, `Sleep mascot artwork guide` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Manual Calendars and OAuth Configuration`** (22 nodes): `ManualCalendarService`, `.cancel()`, `.cancelEdit()`, `.clear()`, `.confirm()`, `.confirmEdit()`, `.constructor()`, `.create()`, `.finish()`, `.preview()`, `.previewEdit()`, `bundledOAuthConfig()`, `defaultOAuthConfig()`, `loadOAuthConfig()`, `manual.ts`, `oauth-config.ts`, `store.ts`, `manual()`, `raw()`, `accounts-manual.test.ts`, `store()`, `oauth-config.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Google Provider and Error Handling`** (17 nodes): `GoogleCalendarProvider`, `.constructor()`, `.createEvent()`, `.deleteEvent()`, `.ensureCalendar()`, `.getEvent()`, `.listCalendars()`, `.listEvents()`, `.updateEvent()`, `calendarErrorMessage()`, `retryRead()`, `statusCode()`, `google.ts`, `provider.ts`, `sync.ts`, `calendar-errors.test.ts`, `sync.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Command Confirmation`** (10 nodes): `CommandController`, `.choose()`, `.clear()`, `.command()`, `.confirm()`, `.constructor()`, `.isBusy()`, `.label()`, `.refreshAfterWrite()`, `.select()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MISO codebase overview` connect `AI Workflows and Onboarding` to `Synchronization and Reminder Scheduling`, `Installer and Shipping Verification`, `Renderer Pet and Desktop Verification`, `Artwork and Typography`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `Installation and recovery guide` connect `AI Workflows and Onboarding` to `Windows and IPC Coordination`, `Installer and Shipping Verification`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `AccountCalendarProvider` connect `Account Routing and Synchronization` to `AI Workflows and Onboarding`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AI Workflows and Onboarding` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Windows and IPC Coordination` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `AI Discovery and Provider Services` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._

## Extraction and Verification Limits

- Snapshot: 88 maintained files; 64 code and 24 documents. Deterministic extraction refreshed all code; reviewed account-removal/dialog/storage semantics were retained, source positions updated, and bounded AI retry/capability-fallback relationships extracted from source, synthetic checks and two updated documents.
- Resolved 137 project imports to file IDs; excluded 97 external imports, 4 imports of structurally unsupported files, and 215 structural call guesses. Inspect source for runtime calls and scope. No application checks are established by this map refresh.
- Relative source paths and edge endpoints were checked. Community counts include file/method nodes and match JSON and HTML. The HTML uses a remote visualization library; static graph data and JavaScript syntax were checked, but browser visual verification was not performed.
- Agent token telemetry is unavailable: cost counters are unmeasured sentinels. The benchmark estimates context size heuristically and does not measure billing savings or answer quality. Generated application output, artwork binaries, credentials, profiles and calendar data are excluded. NSIS/configuration files require direct source inspection.
