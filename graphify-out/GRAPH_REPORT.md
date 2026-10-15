# Graph Report - .  (2026-10-15)

## Corpus Check
- Corpus is ~37,583 words - fits in a single context window. You may not need a graph.

## Summary
- 284 nodes · 416 edges · 12 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.89)
- Token cost: unavailable for extraction agents; stored zero counters are unmeasured sentinels. Structural extraction made no LLM API calls.

## Community Hubs (Navigation)
- [Windows Identity and IPC](#community-0---windows-identity-and-ipc)
- [Product Shipping and Verification](#community-1---product-shipping-and-verification)
- [Calendar Contracts and Mapping](#community-2---calendar-contracts-and-mapping)
- [Synchronization and Reminders](#community-3---synchronization-and-reminders)
- [Artwork and Typography](#community-5---artwork-and-typography)
- [Multiple Account Routing](#community-6---multiple-account-routing)
- [Encrypted Local Settings](#community-7---encrypted-local-settings)
- [Manual Calendar Mutations](#community-8---manual-calendar-mutations)
- [AI Command Confirmation](#community-9---ai-command-confirmation)
- [Google Calendar Provider](#community-10---google-calendar-provider)
- [Idle Pet Pose Scheduling](#community-12---idle-pet-pose-scheduling)
- [OAuth Sign-In and Errors](#community-13---oauth-sign-in-and-errors)

## God Nodes (most connected - your core abstractions)
1. `AccountCalendarProvider` - 14 edges
2. `MISO codebase overview` - 13 edges
3. `Package scripts and shipping configuration` - 13 edges
4. `Security boundaries and shipping requirements` - 11 edges
5. `Artwork drop-in guide` - 11 edges
6. `ManualCalendarService` - 11 edges
7. `SettingsStore` - 11 edges
8. `ReminderEngine` - 11 edges
9. `CommandController` - 10 edges
10. `GoogleCalendarProvider` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Security boundaries and shipping requirements` --documents_pkce_loopback_auth--> `connectGoogle()`  [INFERRED]
  docs/SECURITY-AND-SHIPPING.md → src/main/calendar/auth.ts
- `MISO codebase overview` --documents_idle_pose_contract--> `IdlePoseCycle`  [INFERRED]
  README.md → src/renderer/idle-poses.ts
- `Deadline based reminder scheduling` --implemented_by--> `ReminderEngine`  [INFERRED]
  docs/OPTIMIZATION.md → src/main/sync/reminders.ts
- `Optional AI commands` --implemented_by--> `InputService`  [INFERRED]
  docs/SECURITY-AND-SHIPPING.md → src/main/nlu/input.ts
- `handle()` --requires_trusted_main_frame--> `Sandboxed renderer and trusted IPC boundary`  [EXTRACTED]
  src/main/index.ts → docs/SECURITY-AND-SHIPPING.md

## Communities

### Community 0 - "Windows Identity and IPC"
Cohesion: 0.05
Nodes (8): Contributor graph-first onboarding, Agent architecture and verification instructions, Windows AppUserModelID alignment, handle(), openSettings(), openSetup(), secureWindow(), Sandboxed renderer and trusted IPC boundary

### Community 1 - "Product Shipping and Verification"
Cohesion: 0.1
Nodes (22): Embedded PE metadata and icon auditing, Contributor workflow, Branded NSIS wizard resources, MISO installer artwork guide, Manual acceptance checklist, InputService, Package scripts and shipping configuration, Publication and exposure review (+14 more)

### Community 2 - "Calendar Contracts and Mapping"
Cohesion: 0.1
Nodes (1): AICredentialError

### Community 3 - "Synchronization and Reminders"
Cohesion: 0.07
Nodes (7): performSync(), Serialized incremental calendar synchronization, Sync and timer optimization review, Deadline based reminder scheduling, mapLimited(), ReminderEngine, SyncService

### Community 5 - "Artwork and Typography"
Cohesion: 0.12
Nodes (19): Generated artwork manifest, Artwork drop-in guide, Branding replacement guide, Baloo 2 headings font, Inter interface font, Bundled typography and font licenses, SIL Open Font License, Alert mascot artwork guide (+11 more)

### Community 6 - "Multiple Account Routing"
Cohesion: 0.14
Nodes (1): AccountCalendarProvider

### Community 7 - "Encrypted Local Settings"
Cohesion: 0.2
Nodes (2): OS encrypted local vault, SettingsStore

### Community 8 - "Manual Calendar Mutations"
Cohesion: 0.18
Nodes (1): ManualCalendarService

### Community 9 - "AI Command Confirmation"
Cohesion: 0.2
Nodes (1): CommandController

### Community 10 - "Google Calendar Provider"
Cohesion: 0.2
Nodes (1): GoogleCalendarProvider

### Community 12 - "Idle Pet Pose Scheduling"
Cohesion: 0.25
Nodes (1): IdlePoseCycle

### Community 13 - "OAuth Sign-In and Errors"
Cohesion: 0.25
Nodes (2): connectGoogle(), GoogleSignInError

## Knowledge Gaps
- **9 isolated node(s):** `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide`, `Idle mascot artwork guide`, `Sleep mascot artwork guide` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Calendar Contracts and Mapping`** (34 nodes): `scopedCalendar()`, `unpackCalendar()`, `allDayOffset()`, `createPayload()`, `eventTimes()`, `explicitReminders()`, `updatePayload()`, `calendarErrorMessage()`, `retryRead()`, `statusCode()`, `delay()`, `smoke()`, `AICredentialError`, `systemPrompt()`, `parseIntent()`, `accounts.ts`, `manual.ts`, `mapping.ts`, `provider.ts`, `controller.ts`, `input.ts`, `schema.ts`, `store.ts`, `smoke.ts`, `sync.ts`, `types.ts`, `manual()`, `raw()`, `accounts-manual.test.ts`, `calendar-errors.test.ts`, `fixture()`, `controller.test.ts`, `nlu.test.ts`, `sync.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Multiple Account Routing`** (14 nodes): `AccountCalendarProvider`, `.add()`, `.call()`, `.constructor()`, `.createEvent()`, `.deleteEvent()`, `.ensureCalendar()`, `.getEvent()`, `.listCalendars()`, `.listEvents()`, `.remove()`, `.statuses()`, `.updateEvent()`, `.wrap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Encrypted Local Settings`** (12 nodes): `OS encrypted local vault`, `SettingsStore`, `.assertSecure()`, `.cache()`, `.constructor()`, `.fired()`, `.persist()`, `.resetPersonalData()`, `.save()`, `.secret()`, `.setSecret()`, `.settings()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Manual Calendar Mutations`** (11 nodes): `ManualCalendarService`, `.cancel()`, `.cancelEdit()`, `.clear()`, `.confirm()`, `.confirmEdit()`, `.constructor()`, `.create()`, `.finish()`, `.preview()`, `.previewEdit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Command Confirmation`** (10 nodes): `CommandController`, `.choose()`, `.clear()`, `.command()`, `.confirm()`, `.constructor()`, `.isBusy()`, `.label()`, `.refreshAfterWrite()`, `.select()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Google Calendar Provider`** (10 nodes): `GoogleCalendarProvider`, `.constructor()`, `.createEvent()`, `.deleteEvent()`, `.ensureCalendar()`, `.getEvent()`, `.listCalendars()`, `.listEvents()`, `.updateEvent()`, `google.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Idle Pet Pose Scheduling`** (8 nodes): `IdlePoseCycle`, `.constructor()`, `.dispose()`, `.enabled()`, `.schedule()`, `.setEnabled()`, `idle-poses.ts`, `idle-poses.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OAuth Sign-In and Errors`** (8 nodes): `connectGoogle()`, `GoogleSignInError`, `.constructor()`, `signInError()`, `makeAuth()`, `auth-errors.ts`, `auth.ts`, `auth-errors.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AccountCalendarProvider` connect `Multiple Account Routing` to `Calendar Contracts and Mapping`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `Package scripts and shipping configuration` connect `Product Shipping and Verification` to `Windows Identity and IPC`, `Artwork and Typography`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `ManualCalendarService` connect `Manual Calendar Mutations` to `Calendar Contracts and Mapping`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Windows Identity and IPC` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Product Shipping and Verification` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Calendar Contracts and Mapping` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._

## Extraction Audit

- Refreshed 2026-10-15 for MISO 1.0.8 Windows branding and installer work. Corpus: 81 files (57 code, 24 documents). See [navigation and limitations](README.md).
- Resolved 111 local import targets to existing file IDs. Omitted external dependency internals and unsupported configuration internals.
- Excluded 189 structural call edges because the installed extractor can confuse scopes and caller direction, including same-file calls. Follow imports, containment, and documented concepts; verify runtime calls in source.
- Reused semantic caches for unchanged documentation; one agent refreshed the three changed/new documents and affected code evidence. Internal token telemetry is unavailable.
- The undirected simple graph coalesces repeated node pairs; `_src`/`_tgt` preserve extracted direction. The concept-oriented summary omits a file-only community; JSON/HTML include all 17 communities.
- MISO 1.0.8 changes passed formatting, TypeScript checking, all 133 offline tests, and the Electron smoke workflow. Packaged metadata/icon and runtime-fuse audits, normal/Safe Mode startup checks, and a live Windows taskbar property check passed with isolated profiles.
- Historical claims in other documents remain attributed to those documents. No live Google account or calendar data was used in these checks.

The heuristic benchmark estimates 4,404 tokens per query versus 50,110 for the full corpus (11.4x). This is not measured billing savings or answer quality.
