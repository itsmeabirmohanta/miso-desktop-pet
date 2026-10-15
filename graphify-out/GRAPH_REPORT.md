# Graph Report - .  (2026-10-15)

## Corpus Check
- Corpus is ~36,283 words - fits in a single context window. You may not need a graph.

## Summary
- 274 nodes · 476 edges · 17 communities detected
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.89)
- Token cost: unavailable for the extraction agent; stored zero counters are unmeasured sentinels. Structural extraction made no LLM API calls.

## Community Hubs (Navigation)
- [Windows and IPC Coordination](#community-0---windows-and-ipc-coordination)
- [Product Documentation and Shipping](#community-1---product-documentation-and-shipping)
- [Calendar Contracts and Integration](#community-2---calendar-contracts-and-integration)
- [Renderer Dialogs and Settings](#community-3---renderer-dialogs-and-settings)
- [AI Parsing and Event Mapping](#community-4---ai-parsing-and-event-mapping)
- [Multiple Account Routing](#community-5---multiple-account-routing)
- [Reminder Delivery and Snooze](#community-6---reminder-delivery-and-snooze)
- [Encrypted Local Settings](#community-7---encrypted-local-settings)
- [Artwork and Typography](#community-8---artwork-and-typography)
- [Manual Calendar Mutations](#community-9---manual-calendar-mutations)
- [Synchronization and Performance](#community-10---synchronization-and-performance)
- [AI Command Confirmation](#community-11---ai-command-confirmation)
- [Google Calendar Provider](#community-12---google-calendar-provider)
- [OAuth Sign-In and Errors](#community-13---oauth-sign-in-and-errors)
- [OAuth Client Configuration](#community-14---oauth-client-configuration)
- [Idle Pet Pose Scheduling](#community-15---idle-pet-pose-scheduling)
- [Icon Binary Generation](#community-16---icon-binary-generation)

## God Nodes (most connected - your core abstractions)
1. `AccountCalendarProvider` - 14 edges
2. `MISO codebase overview` - 13 edges
3. `ManualCalendarService` - 11 edges
4. `SettingsStore` - 11 edges
5. `ReminderEngine` - 11 edges
6. `Security boundaries and shipping requirements` - 11 edges
7. `Artwork drop-in guide` - 11 edges
8. `CommandController` - 10 edges
9. `GoogleCalendarProvider` - 9 edges
10. `Isolated synthetic-account verification` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Security boundaries and shipping requirements` --documents_pkce_loopback_auth--> `connectGoogle()`  [INFERRED]
  docs/SECURITY-AND-SHIPPING.md → src/main/calendar/auth.ts
- `Deadline based reminder scheduling` --implemented_by--> `ReminderEngine`  [INFERRED]
  docs/OPTIMIZATION.md → src/main/sync/reminders.ts
- `Optional AI commands` --implemented_by--> `InputService`  [INFERRED]
  docs/SECURITY-AND-SHIPPING.md → src/main/nlu/input.ts
- `MISO codebase overview` --documents_idle_pose_contract--> `IdlePoseCycle`  [INFERRED]
  README.md → src/renderer/idle-poses.ts
- `handle()` --requires_trusted_main_frame--> `Sandboxed renderer and trusted IPC boundary`  [EXTRACTED]
  src/main/index.ts → docs/SECURITY-AND-SHIPPING.md

## Communities

### Community 0 - "Windows and IPC Coordination"
Cohesion: 0.07
Nodes (28): agendaEvents(), aiKey(), aiVerified(), closePetPopup(), deliver(), fingerprint(), handle(), ignoreMouse() (+20 more)

### Community 1 - "Product Documentation and Shipping"
Cohesion: 0.09
Nodes (26): Artwork drop-in guide, Branding replacement guide, Contributor workflow, Manual acceptance checklist, Alert mascot artwork guide, Happy mascot artwork guide, Idle mascot artwork guide, Sleep mascot artwork guide (+18 more)

### Community 2 - "Calendar Contracts and Integration"
Cohesion: 0.14
Nodes (8): unpackCalendar(), calendarErrorMessage(), retryRead(), statusCode(), delay(), smoke(), manual(), raw()

### Community 3 - "Renderer Dialogs and Settings"
Cohesion: 0.13
Nodes (7): button(), el(), setupPet(), text(), choiceDialog(), confirmDialog(), resultDialog()

### Community 4 - "AI Parsing and Event Mapping"
Cohesion: 0.13
Nodes (9): createPayload(), eventTimes(), explicitReminders(), updatePayload(), AICredentialError, InputService, systemPrompt(), aiSecretName() (+1 more)

### Community 5 - "Multiple Account Routing"
Cohesion: 0.18
Nodes (2): AccountCalendarProvider, scopedCalendar()

### Community 6 - "Reminder Delivery and Snooze"
Cohesion: 0.2
Nodes (3): inQuietHours(), plans(), ReminderEngine

### Community 7 - "Encrypted Local Settings"
Cohesion: 0.35
Nodes (2): OS encrypted local vault, SettingsStore

### Community 8 - "Artwork and Typography"
Cohesion: 0.27
Nodes (10): Generated artwork manifest, Baloo 2 headings font, Inter interface font, Bundled typography and font licenses, SIL Open Font License, Renderer HTML and content security policy, prepareAssets(), selectImage() (+2 more)

### Community 9 - "Manual Calendar Mutations"
Cohesion: 0.27
Nodes (1): ManualCalendarService

### Community 10 - "Synchronization and Performance"
Cohesion: 0.24
Nodes (6): capturePerformance(), wait(), Serialized incremental calendar synchronization, Sync and timer optimization review, Deadline based reminder scheduling, SyncService

### Community 11 - "AI Command Confirmation"
Cohesion: 0.42
Nodes (1): CommandController

### Community 12 - "Google Calendar Provider"
Cohesion: 0.22
Nodes (1): GoogleCalendarProvider

### Community 13 - "OAuth Sign-In and Errors"
Cohesion: 0.25
Nodes (2): connectGoogle(), GoogleSignInError

### Community 14 - "OAuth Client Configuration"
Cohesion: 0.47
Nodes (3): bundledOAuthConfig(), defaultOAuthConfig(), loadOAuthConfig()

### Community 15 - "Idle Pet Pose Scheduling"
Cohesion: 0.47
Nodes (1): IdlePoseCycle

### Community 16 - "Icon Binary Generation"
Cohesion: 0.67
Nodes (2): chunk(), crc()

## Knowledge Gaps
- **9 isolated node(s):** `AICredentialError`, `Branding replacement guide`, `Alert mascot artwork guide`, `Happy mascot artwork guide`, `Idle mascot artwork guide` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Multiple Account Routing`** (15 nodes): `AccountCalendarProvider`, `.add()`, `.call()`, `.constructor()`, `.createEvent()`, `.deleteEvent()`, `.ensureCalendar()`, `.getEvent()`, `.listCalendars()`, `.listEvents()`, `.remove()`, `.statuses()`, `.updateEvent()`, `.wrap()`, `scopedCalendar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Encrypted Local Settings`** (12 nodes): `OS encrypted local vault`, `SettingsStore`, `.assertSecure()`, `.cache()`, `.constructor()`, `.fired()`, `.persist()`, `.resetPersonalData()`, `.save()`, `.secret()`, `.setSecret()`, `.settings()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Manual Calendar Mutations`** (11 nodes): `ManualCalendarService`, `.cancel()`, `.cancelEdit()`, `.clear()`, `.confirm()`, `.confirmEdit()`, `.constructor()`, `.create()`, `.finish()`, `.preview()`, `.previewEdit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Command Confirmation`** (10 nodes): `CommandController`, `.choose()`, `.clear()`, `.command()`, `.confirm()`, `.constructor()`, `.isBusy()`, `.label()`, `.refreshAfterWrite()`, `.select()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Google Calendar Provider`** (10 nodes): `GoogleCalendarProvider`, `.constructor()`, `.createEvent()`, `.deleteEvent()`, `.ensureCalendar()`, `.getEvent()`, `.listCalendars()`, `.listEvents()`, `.updateEvent()`, `google.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OAuth Sign-In and Errors`** (8 nodes): `connectGoogle()`, `GoogleSignInError`, `.constructor()`, `signInError()`, `makeAuth()`, `auth-errors.ts`, `auth.ts`, `auth-errors.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Idle Pet Pose Scheduling`** (6 nodes): `IdlePoseCycle`, `.constructor()`, `.dispose()`, `.enabled()`, `.schedule()`, `.setEnabled()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Icon Binary Generation`** (4 nodes): `chunk()`, `crc()`, `make-icon.mjs`, `writeFallback()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AccountCalendarProvider` connect `Multiple Account Routing` to `Calendar Contracts and Integration`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `ManualCalendarService` connect `Manual Calendar Mutations` to `Calendar Contracts and Integration`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `MISO codebase overview` connect `Product Documentation and Shipping` to `Artwork and Typography`, `Synchronization and Performance`, `Idle Pet Pose Scheduling`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `AICredentialError`, `Branding replacement guide`, `Alert mascot artwork guide` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Windows and IPC Coordination` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Product Documentation and Shipping` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Calendar Contracts and Integration` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._

## Extraction Audit

- Snapshot: 2026-10-15, repository root; 56 code files and 22 documents. See [navigation and coverage](README.md).
- Merged 235 structural nodes with 39 documentation nodes. Structural extraction produced 572 candidate edges; semantic extraction added 100.
- Resolved 111 local module import targets against existing file nodes. External dependency internals and the unsupported JSON manifest import are omitted.
- Excluded all 98 unverified name-based structural call guesses after finding false cross-scope links. This graph supports navigation by imports, containment, and documented concepts; inspect source for actual call chains.
- The default undirected simple graph coalesces repeated node pairs. Original directions remain in `_src`/`_tgt`. Total community count includes the file-only development-launcher community omitted from the stock report's concept-oriented summary.
- Semantic extraction used one agent; token telemetry is unavailable. No application tests or live-account checks were run for this documentation-only change.
- Paths are repository-relative with forward slashes. Generated output, private local artifacts, binaries, and fonts were excluded by `.graphifyignore`.
- The benchmark below estimates context size using a heuristic. It does not measure model billing or actual answer quality.

Estimated query context: 3,767 tokens versus 48,377 tokens for the full corpus (12.8x estimated reduction).
