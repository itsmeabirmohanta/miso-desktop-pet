# MISO optimization review

Implemented:

- Background polls use incremental feeds. Manual refresh and completed writes still refresh the expanded event window. Healthy calendar lists refresh every 15 minutes.
- Sync operations are serialized; background polls do not overlap.
- Preference-only saves avoid remote event downloads.
- Unchanged preferences and event caches skip disk writes. Native click-through settings update only when their value changes.
- Agenda timestamps are calculated once per event with a consistent timezone before sorting.
- Agenda search matches title, account and calendar. Offline notices explain cached results, and reminder reviews use clearer wording.

Additional refinements completed:

- Calendar lists and account event feeds use at most two parallel account reads. Results remain associated with their original account; failed or removed accounts do not overwrite healthy results. Writes remain serialized.
- Reminder delivery schedules the next deadline and checks at minute boundaries for clock changes, quiet hours and missed reminders. The idle one-second polling loop was removed; snoozes also schedule their own deadlines.
- Cursor sampling remains fast near the pet and slows when far away or hidden. Hidden animations pause; reduced-motion preferences are respected.
- Source is formatted with pinned Prettier, with `npm run format` and `npm run format:check`. Concurrency and performance sampling are isolated in small modules.

Verification: 112 automated tests and the Electron smoke test passed. A stable subsequent poll makes one event request in the mocked test instead of two. Preference saves make zero event-list calls in the smoke test. New tests check the two-read concurrency limit, ordered results, exact reminder deadlines, idle timer activity and cleanup.

Measured samples are saved in `artifacts/review/performance-before.json` and `performance-after.json`. They use mocked accounts, a hidden Settings renderer and three 500ms samples per mode. Summed working sets can count shared pages more than once. The samples showed no convincing overall CPU or memory improvement; do not interpret these short measurements as a production speedup. The code-level reductions in requests and timer wakeups are verified separately.

Next priorities:

1. Profile idle CPU, memory, startup-to-pet time and popup response time with the pet visible, hidden and Settings closed. Establish a repeatable baseline.
2. Measure two-account concurrency with real Google latency and monitor quota errors. The concurrency limit is implemented and tested.
3. Perform extended real-device tests for adaptive cursor sampling, reminder deadlines, sleep/resume and quiet-hour transitions.
4. Further separate window coordination from the main entrypoint as new flows are added. Source formatting and small concurrency/profiling modules are in place.
5. Consider Google push notifications only for a distributed version with a public HTTPS webhook. Renewable channels, monitoring and missed-message reconciliation add backend responsibilities.

References:

- https://www.electronjs.org/docs/latest/tutorial/performance
- https://developers.google.com/workspace/calendar/api/guides/sync
- https://developers.google.com/workspace/calendar/api/guides/quota
- https://developers.google.com/workspace/calendar/api/guides/push
