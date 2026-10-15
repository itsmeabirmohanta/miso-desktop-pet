# Working in MISO

## Understand the codebase first

Before answering architecture questions or changing code:

1. Read [graphify-out/README.md](graphify-out/README.md) for the architecture entry points, map coverage, and refresh guidance.
2. Read [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md), especially the communities, central nodes, and connections relevant to the task.
3. Search [graphify-out/graph.json](graphify-out/graph.json) for the affected file or symbol and follow its imports, related symbols, and community neighbors. Use [graphify-out/graph.html](graphify-out/graph.html) when visual exploration helps. Inspect only the relevant portion of the JSON rather than dumping the entire graph into context.
4. Open the referenced source files and relevant tests before editing. The graph is a navigation aid: source code is authoritative. Check provenance and confidence; inferred calls or conceptual relationships require source verification. Historical verification documents do not establish that checks pass now.

If the map is missing or stale, inspect source directly and regenerate it with the `graphify` skill (`/graphify .`, or `/graphify . --update` for incremental extraction). Use `.graphifyignore` to keep dependencies, generated output, local artifacts, and artwork binaries out of the corpus. Refresh the map after changes to module boundaries, public contracts, imports, or documented architecture; check removed/renamed symbols for stale nodes. Do not block a small unrelated fix solely because Graphify is unavailable; report that the map needs refreshing.

## Architecture and boundaries

- MISO is an Electron/TypeScript desktop calendar companion. `src/main/index.ts` wires windows, IPC, accounts, synchronization, settings, and reminders.
- `src/main/preload.ts` exposes `window.butler`; `src/shared/types.ts` defines the `ButlerAPI` contract. Changes to IPC require checking all three layers: main handlers, preload, and renderer consumers.
- `src/main/calendar/` owns Google OAuth, providers, account routing, event mapping, and manual create/edit/delete flows. `src/main/sync/` owns feeds, concurrency, and reminder scheduling.
- `src/main/nlu/` parses optional AI commands; `src/main/controller.ts` executes the confirmation/clarification flow. Manual calendar features must continue working with AI disabled.
- `src/main/settings/` owns encrypted local state and login startup. Keep credentials and account data in the main process; preserve sandboxing, context isolation, sender validation, and explicit edit/delete confirmation.
- `src/renderer/` owns setup, dialogs, agenda, settings, and pet interactions; `src/shared/` holds contracts, branding, AI configuration, hotkeys, and placement helpers.
- `scripts/` handles build, assets, release audits, and smoke checks. Edit maintained source rather than generated `dist/`, `release/`, or `artifacts/` contents.

## Verification

Follow [CONTRIBUTING.md](CONTRIBUTING.md). Use Node.js 22.12 or newer and the scripts in `package.json`.

- For application changes, run `npm run format:check` and `npm run check` (typecheck, tests, build).
- For renderer, OAuth, storage, or IPC changes, also run `npm run smoke` in a desktop session.
- For Windows packaging changes, run `npm run dist`, `npm run smoke:packaged`, and `npm run test:installer` on Windows. Preserve the stable installer GUID and user profile data; upgrade tests must use isolated registrations and files.
- For documentation/map-only changes, validate links, graph provenance, edge endpoints, and generated output consistency; application checks are unnecessary unless application code also changes.

Use synthetic accounts and mocked providers in automated checks. Consult `docs/MANUAL_TESTS.md` for flows requiring live acceptance. Never put live credentials, personal calendar data, user profiles, or unredacted local artifacts in the graph or commits.
