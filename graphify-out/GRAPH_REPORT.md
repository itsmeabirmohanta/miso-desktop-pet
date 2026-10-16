# Graph Report - .  (2026-10-16)

## Corpus Check
- 88 files · ~50,166 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 343 nodes · 621 edges · 16 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.89)
- Token cost: unavailable for the extraction agent; zero counters mean unmeasured, not free execution. Structural extraction uses no LLM API calls.

## Community Hubs (Navigation)
- [Windows and IPC Coordination](#community-0---windows-and-ipc-coordination)
- [Google Provider and Error Handling](#community-1---google-provider-and-error-handling)
- [AI Workflows and Onboarding](#community-2---ai-workflows-and-onboarding)
- [AI Discovery and Provider Services](#community-3---ai-discovery-and-provider-services)
- [Installer and Shipping Verification](#community-4---installer-and-shipping-verification)
- [Synchronization and Reminder Scheduling](#community-5---synchronization-and-reminder-scheduling)
- [Renderer Pet and Desktop Verification](#community-6---renderer-pet-and-desktop-verification)
- [Artwork and Typography](#community-7---artwork-and-typography)
- [Account Calendar Routing](#community-8---account-calendar-routing)
- [AI Command Confirmation](#community-9---ai-command-confirmation)
- [Manual Calendar Confirmations](#community-10---manual-calendar-confirmations)
- [OAuth Sign-In and Errors](#community-11---oauth-sign-in-and-errors)
- [Idle Pet Pose Scheduling](#community-12---idle-pet-pose-scheduling)
- [Desktop OAuth Configuration](#community-13---desktop-oauth-configuration)
- [Icon Binary Generation](#community-14---icon-binary-generation)
- [Development App Launcher](#community-15---development-app-launcher)

## God Nodes (most connected - your core abstractions)
1. `Installation and recovery guide` - 27 edges
2. `MISO codebase overview` - 17 edges
3. `Package scripts and shipping configuration` - 17 edges
4. `Manual acceptance checklist` - 17 edges
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
- `MISO codebase overview` --documents_optional_ai_workflow--> `Paginated text-model discovery and ranking`  [EXTRACTED]
  README.md → src/main/nlu/models.ts
- `MISO codebase overview` --documents_optional_ai_workflow--> `Persisted AI-assisted and User-assisted workflows`  [EXTRACTED]
  README.md → src/renderer/app.ts

## Communities

### Community 0 - "Windows and IPC Coordination"
Cohesion: 0.05
Nodes (50): index.ts, Renderer-ready pet reveal and display recovery, Windows AppUserModelID alignment, preload.ts, Sandboxed renderer and trusted IPC boundary, Onboarding gate for calendar actions, secureWindow(), handle() (+42 more)

### Community 1 - "Google Provider and Error Handling"
Cohesion: 0.07
Nodes (48): types.ts, provider.ts, store.ts, input.ts, mapping.ts, smoke.ts, GoogleCalendarProvider, accounts.ts (+40 more)

### Community 2 - "AI Workflows and Onboarding"
Cohesion: 0.1
Nodes (41): Installation and recovery guide, MISO codebase overview, Manual acceptance checklist, SettingsStore, Last-account removal returns to welcome, Protected onboarding completion and migration, Security boundaries and shipping requirements, Verified draft AI configuration (+33 more)

### Community 3 - "AI Discovery and Provider Services"
Cohesion: 0.08
Nodes (39): ai.ts, errors.ts, configure.ts, models.ts, Validated provider capability fallbacks, Paginated text-model discovery and ranking, request.ts, requestAI() (+31 more)

### Community 4 - "Installer and Shipping Verification"
Cohesion: 0.12
Nodes (32): Package scripts and shipping configuration, Agent architecture and verification instructions, audit-release.mjs, test-installer-upgrade.mjs, MISO installer artwork guide, Contributor workflow, Preserved accounts and settings across reinstalls, Branded NSIS wizard resources (+24 more)

### Community 5 - "Synchronization and Reminder Scheduling"
Cohesion: 0.08
Nodes (28): ReminderEngine, reminders.ts, SyncService, mapLimited(), Sync and timer optimization review, performSync(), performance.ts, Serialized incremental calendar synchronization (+20 more)

### Community 6 - "Renderer Pet and Desktop Verification"
Cohesion: 0.11
Nodes (25): app.ts, Accessible confirmations and acknowledgements, dashboard.ts, Persisted AI-assisted and User-assisted workflows, ai-form.ts, dialogs.ts, setup.ts, site-links.ts (+17 more)

### Community 7 - "Artwork and Typography"
Cohesion: 0.12
Nodes (21): Artwork drop-in guide, build.mjs, Baloo 2 headings font, Generated artwork manifest, Inter interface font, MISO visual styling, Renderer HTML and content security policy, prepare-assets.mjs (+13 more)

### Community 8 - "Account Calendar Routing"
Cohesion: 0.14
Nodes (14): AccountCalendarProvider, .add(), .call(), .constructor(), .createEvent(), .deleteEvent(), .ensureCalendar(), .getEvent() (+6 more)

### Community 9 - "AI Command Confirmation"
Cohesion: 0.2
Nodes (10): CommandController, .command(), .choose(), .clear(), .confirm(), .constructor(), .isBusy(), .label() (+2 more)

### Community 10 - "Manual Calendar Confirmations"
Cohesion: 0.2
Nodes (10): ManualCalendarService, .cancel(), .cancelEdit(), .confirm(), .confirmEdit(), .constructor(), .create(), .finish() (+2 more)

### Community 11 - "OAuth Sign-In and Errors"
Cohesion: 0.25
Nodes (8): auth-errors.ts, auth.ts, GoogleSignInError, connectGoogle(), makeAuth(), .constructor(), auth-errors.test.ts, signInError()

### Community 12 - "Idle Pet Pose Scheduling"
Cohesion: 0.33
Nodes (6): IdlePoseCycle, .constructor(), .dispose(), .enabled(), .schedule(), .setEnabled()

### Community 13 - "Desktop OAuth Configuration"
Cohesion: 0.33
Nodes (6): oauth-config.ts, oauth-config.test.ts, bundledOAuthConfig(), defaultOAuthConfig(), loadOAuthConfig(), store()

### Community 14 - "Icon Binary Generation"
Cohesion: 0.5
Nodes (4): make-icon.mjs, chunk(), crc(), writeFallback()

### Community 15 - "Development App Launcher"
Cohesion: 1.0
Nodes (1): start.mjs

## Knowledge Gaps
- **9 isolated node(s):** `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide`, `Idle mascot artwork guide`, `Sleep mascot artwork guide` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Account Calendar Routing`** (14 nodes): `AccountCalendarProvider`, `.add()`, `.call()`, `.constructor()`, `.createEvent()`, `.deleteEvent()`, `.ensureCalendar()`, `.getEvent()`, `.listCalendars()`, `.listEvents()`, `.remove()`, `.statuses()`, `.updateEvent()`, `.wrap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Command Confirmation`** (10 nodes): `CommandController`, `.choose()`, `.clear()`, `.command()`, `.confirm()`, `.constructor()`, `.isBusy()`, `.label()`, `.refreshAfterWrite()`, `.select()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Manual Calendar Confirmations`** (10 nodes): `ManualCalendarService`, `.cancel()`, `.cancelEdit()`, `.confirm()`, `.confirmEdit()`, `.constructor()`, `.create()`, `.finish()`, `.preview()`, `.previewEdit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Idle Pet Pose Scheduling`** (6 nodes): `IdlePoseCycle`, `.constructor()`, `.dispose()`, `.enabled()`, `.schedule()`, `.setEnabled()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MISO codebase overview` connect `AI Workflows and Onboarding` to `AI Discovery and Provider Services`, `Installer and Shipping Verification`, `Synchronization and Reminder Scheduling`, `Renderer Pet and Desktop Verification`, `Artwork and Typography`, `Idle Pet Pose Scheduling`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `Installation and recovery guide` connect `AI Workflows and Onboarding` to `Windows and IPC Coordination`, `AI Discovery and Provider Services`, `Installer and Shipping Verification`, `Renderer Pet and Desktop Verification`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `AccountCalendarProvider` connect `Account Calendar Routing` to `Google Provider and Error Handling`, `AI Workflows and Onboarding`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Windows and IPC Coordination` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Google Provider and Error Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `AI Workflows and Onboarding` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._

## Extraction and Verification Limits

- Snapshot: 88 maintained files; 64 code and 24 documents. Deterministic extraction refreshed all code and source positions while preserving reviewed conceptual IDs and relationships. Focused semantics cover renderer-ready pet reveal/display recovery, rendered-pixel smoke assertions, Gemini thinking/deadline controls and body-read timeout classification, with guide and manual acceptance references.
- Resolved 137 project imports to file IDs; excluded 97 external imports, 4 imports of structurally unsupported files, and 220 structural call guesses. Inspect source for runtime calls and scope. No application checks are established by this map refresh.
- Relative source paths and edge endpoints were checked. Community counts include file/method nodes and match JSON and HTML. The HTML uses a remote visualization library; static graph data and JavaScript syntax were checked, but browser visual verification was not performed.
- Agent token telemetry is unavailable: cost counters are unmeasured sentinels. The benchmark estimates context size heuristically and does not measure billing savings or answer quality. Generated application output, artwork binaries, credentials, profiles and calendar data are excluded. NSIS/configuration files require direct source inspection.
