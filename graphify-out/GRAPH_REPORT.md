# Graph Report - .  (2026-10-15)

## Corpus Check
- Corpus is ~38,508 words - fits in a single context window. You may not need a graph.

## Summary
- 297 nodes · 452 edges · 11 communities detected
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.89)
- Token cost: unavailable for extraction agents; stored zero counters are unmeasured sentinels. Structural extraction made no LLM API calls.

## Community Hubs (Navigation)
- [Windows Identity and IPC](#community-0---windows-identity-and-ipc)
- [Installer Upgrades and Data Preservation](#community-1---installer-upgrades-and-data-preservation)
- [Calendar Contracts and Mapping](#community-2---calendar-contracts-and-mapping)
- [Product Behavior and Verification](#community-3---product-behavior-and-verification)
- [Synchronization and Reminders](#community-4---synchronization-and-reminders)
- [Artwork and Typography](#community-6---artwork-and-typography)
- [Multiple Account Routing](#community-7---multiple-account-routing)
- [Manual Calendar Mutations](#community-8---manual-calendar-mutations)
- [AI Command Confirmation](#community-9---ai-command-confirmation)
- [Google Calendar Provider](#community-10---google-calendar-provider)
- [OAuth Sign-In and Errors](#community-12---oauth-sign-in-and-errors)

## God Nodes (most connected - your core abstractions)
1. `Package scripts and shipping configuration` - 16 edges
2. `AccountCalendarProvider` - 14 edges
3. `MISO codebase overview` - 13 edges
4. `Installation and recovery guide` - 13 edges
5. `Security boundaries and shipping requirements` - 11 edges
6. `Artwork drop-in guide` - 11 edges
7. `ManualCalendarService` - 11 edges
8. `SettingsStore` - 11 edges
9. `ReminderEngine` - 11 edges
10. `CommandController` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Security boundaries and shipping requirements` --documents_pkce_loopback_auth--> `connectGoogle()`  [INFERRED]
  docs/SECURITY-AND-SHIPPING.md → src/main/calendar/auth.ts
- `Deadline based reminder scheduling` --implemented_by--> `ReminderEngine`  [INFERRED]
  docs/OPTIMIZATION.md → src/main/sync/reminders.ts
- `MISO codebase overview` --documents_idle_pose_contract--> `IdlePoseCycle`  [INFERRED]
  README.md → src/renderer/idle-poses.ts
- `Optional AI commands` --implemented_by--> `InputService`  [INFERRED]
  docs/SECURITY-AND-SHIPPING.md → src/main/nlu/input.ts
- `Sandboxed renderer and trusted IPC boundary` --requires_trusted_main_frame--> `handle()`  [EXTRACTED]
  docs/SECURITY-AND-SHIPPING.md → src/main/index.ts

## Communities

### Community 0 - "Windows Identity and IPC"
Cohesion: 0.05
Nodes (6): Windows AppUserModelID alignment, handle(), openSettings(), openSetup(), secureWindow(), Sandboxed renderer and trusted IPC boundary

### Community 1 - "Installer Upgrades and Data Preservation"
Cohesion: 0.08
Nodes (23): Contributor graph-first onboarding, Agent architecture and verification instructions, Embedded PE metadata and icon auditing, Windows installer CI verification, Branded NSIS wizard resources, Eleven compiled installer upgrade scenarios, Existing machine-wide scope and elevation, Stop setup if previous uninstall fails (+15 more)

### Community 2 - "Calendar Contracts and Mapping"
Cohesion: 0.09
Nodes (1): AICredentialError

### Community 3 - "Product Behavior and Verification"
Cohesion: 0.11
Nodes (15): Contributor workflow, Manual acceptance checklist, InputService, Publication and exposure review, MISO codebase overview, MISO desktop calendar companion, IdlePoseCycle, Google Desktop OAuth public-client configuration (+7 more)

### Community 4 - "Synchronization and Reminders"
Cohesion: 0.09
Nodes (7): performSync(), Serialized incremental calendar synchronization, Sync and timer optimization review, Deadline based reminder scheduling, mapLimited(), ReminderEngine, SyncService

### Community 6 - "Artwork and Typography"
Cohesion: 0.12
Nodes (19): Generated artwork manifest, Artwork drop-in guide, Branding replacement guide, Baloo 2 headings font, Inter interface font, Bundled typography and font licenses, SIL Open Font License, Alert mascot artwork guide (+11 more)

### Community 7 - "Multiple Account Routing"
Cohesion: 0.14
Nodes (1): AccountCalendarProvider

### Community 8 - "Manual Calendar Mutations"
Cohesion: 0.18
Nodes (1): ManualCalendarService

### Community 9 - "AI Command Confirmation"
Cohesion: 0.2
Nodes (1): CommandController

### Community 10 - "Google Calendar Provider"
Cohesion: 0.2
Nodes (1): GoogleCalendarProvider

### Community 12 - "OAuth Sign-In and Errors"
Cohesion: 0.25
Nodes (2): connectGoogle(), GoogleSignInError

## Knowledge Gaps
- **10 isolated node(s):** `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide`, `Idle mascot artwork guide`, `Sleep mascot artwork guide` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Calendar Contracts and Mapping`** (39 nodes): `scopedCalendar()`, `unpackCalendar()`, `allDayOffset()`, `createPayload()`, `eventTimes()`, `explicitReminders()`, `updatePayload()`, `calendarErrorMessage()`, `retryRead()`, `statusCode()`, `delay()`, `smoke()`, `AICredentialError`, `systemPrompt()`, `parseIntent()`, `accounts.ts`, `manual.ts`, `mapping.ts`, `provider.ts`, `controller.ts`, `input.ts`, `schema.ts`, `store.ts`, `smoke.ts`, `reminders.ts`, `sync.ts`, `types.ts`, `eventStart()`, `inQuietHours()`, `plans()`, `manual()`, `raw()`, `accounts-manual.test.ts`, `calendar-errors.test.ts`, `fixture()`, `controller.test.ts`, `nlu.test.ts`, `reminders.test.ts`, `sync.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Multiple Account Routing`** (14 nodes): `AccountCalendarProvider`, `.add()`, `.call()`, `.constructor()`, `.createEvent()`, `.deleteEvent()`, `.ensureCalendar()`, `.getEvent()`, `.listCalendars()`, `.listEvents()`, `.remove()`, `.statuses()`, `.updateEvent()`, `.wrap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Manual Calendar Mutations`** (11 nodes): `ManualCalendarService`, `.cancel()`, `.cancelEdit()`, `.clear()`, `.confirm()`, `.confirmEdit()`, `.constructor()`, `.create()`, `.finish()`, `.preview()`, `.previewEdit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Command Confirmation`** (10 nodes): `CommandController`, `.choose()`, `.clear()`, `.command()`, `.confirm()`, `.constructor()`, `.isBusy()`, `.label()`, `.refreshAfterWrite()`, `.select()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Google Calendar Provider`** (10 nodes): `GoogleCalendarProvider`, `.constructor()`, `.createEvent()`, `.deleteEvent()`, `.ensureCalendar()`, `.getEvent()`, `.listCalendars()`, `.listEvents()`, `.updateEvent()`, `google.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OAuth Sign-In and Errors`** (8 nodes): `connectGoogle()`, `GoogleSignInError`, `.constructor()`, `signInError()`, `makeAuth()`, `auth-errors.ts`, `auth.ts`, `auth-errors.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Agent architecture and verification instructions` connect `Installer Upgrades and Data Preservation` to `Windows Identity and IPC`, `Calendar Contracts and Mapping`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `AccountCalendarProvider` connect `Multiple Account Routing` to `Calendar Contracts and Mapping`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `Package scripts and shipping configuration` connect `Installer Upgrades and Data Preservation` to `Windows Identity and IPC`, `Product Behavior and Verification`, `Artwork and Typography`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Windows Identity and IPC` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Installer Upgrades and Data Preservation` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Calendar Contracts and Mapping` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._

## Extraction Audit

- Refreshed 2026-10-15 for MISO 1.0.9 installer replacement behavior. Corpus: 82 supported files (58 code, 24 documents). Additional NSIS references are semantically extracted; those formats are not structurally parsed. See [navigation and limitations](README.md).
- Resolved 111 local import targets against existing file IDs. Omitted external dependency internals and unsupported configuration internals.
- Excluded 189 structural call edges because the installed extractor can confuse scopes and caller direction. Follow imports, containment, and documented concepts; verify runtime calls in source.
- Reused semantic caches for unchanged documentation; one agent refreshed four changed documents and affected installer/config evidence. Internal token telemetry is unavailable.
- The undirected simple graph coalesces repeated node pairs; `_src`/`_tgt` preserve extracted direction. The concept-oriented summary may omit file-only communities; JSON/HTML include all 16 communities.
- MISO 1.0.9 passed formatting, TypeScript checking, all 133 offline application tests, eleven compiled NSIS policy/reinstall scenarios, and packaged metadata/icon/runtime-fuse audits plus normal/Safe Mode startup checks.
- Reinstall fixtures invoke the stock NSIS old-version removal function against a unique test registration and temporary files, for same and changed directories. They verify removal of old files/registration, required preservation flags, and a saved-profile marker. They do not replace a real installed app or test an actual UAC prompt.
- Installer cleanup covers matching registered HKLM/current-HKCU installations. It does not enumerate other users' private profiles or delete portable/source copies. Historical claims in other documents remain attributed to those documents; no live Google account data was used.

Heuristic context estimate: 5,057 tokens per query versus 51,344 for the full corpus (10.2x). This is not measured billing savings or answer quality.
