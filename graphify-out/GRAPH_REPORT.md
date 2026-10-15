# Graph Report - .  (2026-10-15)

## Corpus Check
- Corpus is ~45,451 words - fits in a single context window. You may not need a graph.

## Summary
- 325 nodes · 545 edges · 16 communities detected
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.89)
- Token cost: unavailable for the extraction agent; zero counters mean unmeasured, not free execution. Structural extraction uses no LLM API calls.

## Community Hubs (Navigation)
- [Windows and IPC Coordination](#community-0---windows-and-ipc-coordination)
- [AI Workflows and Onboarding](#community-1---ai-workflows-and-onboarding)
- [Installer and Shipping Verification](#community-2---installer-and-shipping-verification)
- [Renderer Forms and Contracts](#community-3---renderer-forms-and-contracts)
- [Manual Calendars and OAuth Configuration](#community-4---manual-calendars-and-oauth-configuration)
- [Reminder and Desktop Verification](#community-5---reminder-and-desktop-verification)
- [Artwork and Typography](#community-6---artwork-and-typography)
- [AI Discovery and Provider Services](#community-7---ai-discovery-and-provider-services)
- [Account Routing and Concurrency](#community-8---account-routing-and-concurrency)
- [Intent Parsing and Event Mapping](#community-9---intent-parsing-and-event-mapping)
- [Synchronization and Reminder Scheduling](#community-10---synchronization-and-reminder-scheduling)
- [Google Provider and Error Handling](#community-11---google-provider-and-error-handling)
- [AI Command Confirmation](#community-12---ai-command-confirmation)
- [OAuth Sign-In and Errors](#community-13---oauth-sign-in-and-errors)
- [Icon Binary Generation](#community-14---icon-binary-generation)
- [Development App Launcher](#community-15---development-app-launcher)

## God Nodes (most connected - your core abstractions)
1. `Installation and recovery guide` - 20 edges
2. `MISO codebase overview` - 17 edges
3. `Package scripts and shipping configuration` - 17 edges
4. `AccountCalendarProvider` - 15 edges
5. `Agent architecture and verification instructions` - 12 edges
6. `Manual acceptance checklist` - 12 edges
7. `SettingsStore` - 12 edges
8. `Security boundaries and shipping requirements` - 11 edges
9. `Artwork drop-in guide` - 11 edges
10. `ManualCalendarService` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Security boundaries and shipping requirements` --documents_pkce_loopback_auth--> `connectGoogle()`  [INFERRED]
  docs/SECURITY-AND-SHIPPING.md → src/main/calendar/auth.ts
- `MISO codebase overview` --documents_idle_pose_contract--> `IdlePoseCycle`  [INFERRED]
  README.md → src/renderer/idle-poses.ts
- `Deadline based reminder scheduling` --implemented_by--> `ReminderEngine`  [INFERRED]
  docs/OPTIMIZATION.md → src/main/sync/reminders.ts
- `Sandboxed renderer and trusted IPC boundary` --requires_trusted_main_frame--> `handle()`  [EXTRACTED]
  docs/SECURITY-AND-SHIPPING.md → src/main/index.ts
- `Package scripts and shipping configuration` --configures_matching_shortcut_identity--> `Windows AppUserModelID alignment`  [EXTRACTED]
  package.json → src/shared/brand.ts

## Communities

### Community 0 - "Windows and IPC Coordination"
Cohesion: 0.05
Nodes (9): Windows AppUserModelID alignment, handle(), onboardingComplete(), openSettings(), openSetup(), secureWindow(), showPet(), Sandboxed renderer and trusted IPC boundary (+1 more)

### Community 1 - "AI Workflows and Onboarding"
Cohesion: 0.11
Nodes (26): Persisted AI-assisted and User-assisted workflows, Verified draft AI configuration, AI-created event receipt and confirmed manual edits, Sanitized AI access and quota errors, Explicit onboarding sync completion gate, Manual acceptance checklist, Paginated text-model discovery and ranking, verifyAISetup() (+18 more)

### Community 2 - "Installer and Shipping Verification"
Cohesion: 0.12
Nodes (21): Contributor graph-first onboarding, Agent architecture and verification instructions, Embedded PE metadata and icon auditing, Contributor workflow, Windows installer CI verification, Branded NSIS wizard resources, Eleven compiled installer upgrade scenarios, Existing machine-wide scope and elevation (+13 more)

### Community 3 - "Renderer Forms and Contracts"
Cohesion: 0.12
Nodes (4): setupPet(), calendarView(), choiceDialog(), quickAdd()

### Community 4 - "Manual Calendars and OAuth Configuration"
Cohesion: 0.1
Nodes (1): ManualCalendarService

### Community 5 - "Reminder and Desktop Verification"
Cohesion: 0.1
Nodes (2): IdlePoseCycle, Isolated synthetic-account verification

### Community 6 - "Artwork and Typography"
Cohesion: 0.12
Nodes (19): Generated artwork manifest, Artwork drop-in guide, Branding replacement guide, Baloo 2 headings font, Inter interface font, Bundled typography and font licenses, SIL Open Font License, Alert mascot artwork guide (+11 more)

### Community 7 - "AI Discovery and Provider Services"
Cohesion: 0.12
Nodes (7): AICredentialError, AIServiceError, readAIResponse(), discoverModels(), rankModels(), bindAI(), detectKeyProvider()

### Community 8 - "Account Routing and Concurrency"
Cohesion: 0.1
Nodes (2): AccountCalendarProvider, mapLimited()

### Community 9 - "Intent Parsing and Event Mapping"
Cohesion: 0.14
Nodes (2): createPayload(), InputService

### Community 10 - "Synchronization and Reminder Scheduling"
Cohesion: 0.12
Nodes (6): performSync(), Serialized incremental calendar synchronization, Sync and timer optimization review, Deadline based reminder scheduling, ReminderEngine, SyncService

### Community 11 - "Google Provider and Error Handling"
Cohesion: 0.12
Nodes (1): GoogleCalendarProvider

### Community 12 - "AI Command Confirmation"
Cohesion: 0.2
Nodes (1): CommandController

### Community 13 - "OAuth Sign-In and Errors"
Cohesion: 0.25
Nodes (2): connectGoogle(), GoogleSignInError

## Knowledge Gaps
- **9 isolated node(s):** `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide`, `Idle mascot artwork guide`, `Sleep mascot artwork guide` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Manual Calendars and OAuth Configuration`** (22 nodes): `ManualCalendarService`, `.cancel()`, `.cancelEdit()`, `.clear()`, `.confirm()`, `.confirmEdit()`, `.constructor()`, `.create()`, `.finish()`, `.preview()`, `.previewEdit()`, `bundledOAuthConfig()`, `defaultOAuthConfig()`, `loadOAuthConfig()`, `manual.ts`, `oauth-config.ts`, `store.ts`, `manual()`, `raw()`, `accounts-manual.test.ts`, `store()`, `oauth-config.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Reminder and Desktop Verification`** (22 nodes): `capturePerformance()`, `wait()`, `delay()`, `smoke()`, `IdlePoseCycle`, `.constructor()`, `.dispose()`, `.enabled()`, `.schedule()`, `.setEnabled()`, `performance.ts`, `smoke.ts`, `reminders.ts`, `idle-poses.ts`, `eventStart()`, `inQuietHours()`, `plans()`, `idle-poses.test.ts`, `reminders.test.ts`, `store()`, `secure-store.test.ts`, `Isolated synthetic-account verification`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Account Routing and Concurrency`** (20 nodes): `AccountCalendarProvider`, `.add()`, `.call()`, `.constructor()`, `.createEvent()`, `.deleteEvent()`, `.ensureCalendar()`, `.getEvent()`, `.listCalendars()`, `.listEvents()`, `.remove()`, `.statuses()`, `.updateEvent()`, `.wrap()`, `scopedCalendar()`, `unpackCalendar()`, `accounts.ts`, `concurrency.ts`, `mapLimited()`, `concurrency.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Intent Parsing and Event Mapping`** (19 nodes): `allDayOffset()`, `createPayload()`, `eventTimes()`, `explicitReminders()`, `updatePayload()`, `InputService`, `.constructor()`, `.parse()`, `systemPrompt()`, `parseIntent()`, `mapping.ts`, `controller.ts`, `input.ts`, `schema.ts`, `fixture()`, `controller.test.ts`, `nlu.test.ts`, `fixture()`, `providers.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Google Provider and Error Handling`** (17 nodes): `GoogleCalendarProvider`, `.constructor()`, `.createEvent()`, `.deleteEvent()`, `.ensureCalendar()`, `.getEvent()`, `.listCalendars()`, `.listEvents()`, `.updateEvent()`, `calendarErrorMessage()`, `retryRead()`, `statusCode()`, `google.ts`, `provider.ts`, `sync.ts`, `calendar-errors.test.ts`, `sync.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Command Confirmation`** (10 nodes): `CommandController`, `.choose()`, `.clear()`, `.command()`, `.confirm()`, `.constructor()`, `.isBusy()`, `.label()`, `.refreshAfterWrite()`, `.select()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OAuth Sign-In and Errors`** (8 nodes): `connectGoogle()`, `GoogleSignInError`, `.constructor()`, `signInError()`, `makeAuth()`, `auth-errors.ts`, `auth.ts`, `auth-errors.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MISO codebase overview` connect `AI Workflows and Onboarding` to `Installer and Shipping Verification`, `Synchronization and Reminder Scheduling`, `Reminder and Desktop Verification`, `Artwork and Typography`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `AccountCalendarProvider` connect `Account Routing and Concurrency` to `AI Workflows and Onboarding`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `Agent architecture and verification instructions` connect `Installer and Shipping Verification` to `Windows and IPC Coordination`, `Renderer Forms and Contracts`, `AI Discovery and Provider Services`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **What connects `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Windows and IPC Coordination` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `AI Workflows and Onboarding` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Installer and Shipping Verification` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
### Community 14 - "Icon Binary Generation"
Cohesion: 0.5
Nodes (4): chunk(), crc(), make-icon.mjs, writeFallback()

### Community 15 - "Development App Launcher"
Cohesion: 1.0
Nodes (1): start.mjs

## Extraction Audit

- Snapshot: 2026-10-15, repository root; 86 maintained files, approximately 45,451 words. See [coverage and navigation](README.md).
- Refreshed structure (259 AST nodes), four changed documents, and affected source semantics. Unchanged documentation and installer branding/upgrade relationships retain their verified cache evidence. Removed the obsolete AICredentialError node from input.ts after its move to errors.ts, and removed the former background-sync completion relationship.
- Excluded all 209 AST call guesses because scope and caller direction are unreliable. Resolved 129 local imports to real file IDs; external internals and unsupported asset imports are excluded. Inspect source to trace actual execution.
- All 16 communities appear here, in JSON and HTML. Added details omitted by the stock report with computed cohesion scores. The undirected simple graph coalesces repeated pairs; `_src` and `_tgt` retain extracted direction.
- Current semantics cover paginated AI discovery, verified draft/atomic encrypted commit, sanitized errors, independent scheduling modes, direct create receipts and confirmed manual edits, duration mapping, and explicit successful onboarding sync after both AI choices. Synthetic provider checks and documented tests are not proof of live-provider access or quota. Application checks were not rerun by this map refresh.
- One semantic extraction agent performed this refresh. Token telemetry is unavailable; zero counters are unmeasured sentinels. The benchmark estimates context size heuristically and does not measure billing savings or answer quality.
- Paths are portable relative forward slashes. Generated application output, binaries, credentials, profiles and calendar data are excluded. NSIS/configuration semantics require direct source inspection because structural parsing does not cover these formats. HTML has static data and JavaScript syntax validation; browser visual verification was unavailable.
