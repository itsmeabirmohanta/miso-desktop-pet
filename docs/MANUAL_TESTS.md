# Multiple-account and calendar-only acceptance

- Fresh configured build: Google login comes first with no API-key requirement. Cancel consent: no account saved.
- Start with AI off. Create a task and yearly date; verify Google times, reminders and local notifications.
- Add account B. Verify distinct labels and calendar choices. Reconnect B: update instead of duplicate.
- Create in each account and verify the destination. Confirm optional AI uses the selected default account.
- Cancel create, delete and account removal: no mutation. Test deletion of occurrence versus entire series.
- Change a Google event after preview: stale deletion must fail.
- Revoke A's access: B keeps syncing; A retains cached reminders and reports reconnect needed. Remove A: Google events and B remain.
- Enable AI with invalid credentials: calendar reminders continue. Test a valid model and disable AI again.
- Confirm successful-write/failed-refresh feedback says retry sync without repeating the write.
- Restart offline. Test quiet hours, pause, sound, resume and launch at login.

Real Google consent requires live accounts. Automated smoke tests use mock providers and isolated temporary user data.

# Manual acceptance checklist

Use a dedicated Google test account and a calendar containing no important data. Automated tests never require real keys.

- [ ] First launch opens setup with the pet hidden. Start stays disabled until Google is connected and its calendars are configured. AI is optional and off by default.
- [ ] Test Anthropic, OpenAI, Gemini, a compatible gateway and an unauthenticated local Ollama model with your own credentials. Confirm custom model IDs and endpoints work.
- [ ] Change provider/endpoint: the previous service’s key is not reused. Invalid keys reopen setup; corrected keys can pass the test.
- [ ] Close setup before completing it: exit without starting the pet. Restart a fully configured app: saved settings start the pet without re-entering keys.

- [ ] Connect once, check the three pet calendars, restart, verify silent reconnect and position restoration.
- [ ] Create the report, birthday and water examples. Inspect category, private tags, explicit Google reminders, recurrence, time zone and exclusive all-day end date.
- [ ] Birthday March 14 with a two-day 9am lead: verify March 12 at 9am and offset 2340.
- [ ] Create an event 10 minutes away on a watched calendar. Verify exactly one heads-up. Sync repeatedly and restart within the grace window: no duplicate.
- [ ] Snooze 5/15/60 minutes; Done clears the bubble without changing Google. Trigger two simultaneous reminders and process each one from the local bubble queue.
- [ ] Match two dentist events: select the intended one, inspect preview, confirm, verify duration preserved. Cancel an edit and a deletion; verify no changes.
- [ ] Edit/delete a recurring event: test this occurrence and whole series separately. Changing recurrence for one occurrence must be rejected.
- [ ] Change an event in Google while its confirmation is open: reject the stale write and ask for a new command.
- [ ] Try a read-only selected calendar: queries work, writes are refused.
- [ ] Put literal HTML and instruction-like text in event titles: render plain text and never execute or interpret it as instructions.
- [ ] Disconnect network before startup: show cached events. Recover network and verify polling resumes. Failed writes are not queued.
- [ ] Revoke Google access: no crash; reconnect message. Reconnect and verify later reminders work.
- [ ] Force rate limits/quota failures: reads back off; writes do not repeat automatically. Check ambiguous network writes on Google before retrying.
- [ ] Sleep past a due reminder by less than 30 minutes: missed alert; beyond 30 minutes: no stale alert.
- [ ] Toggle quiet hours across midnight and pause: no local delivery during suppression; catch up within grace only.
- [ ] Change system timezone and test timed and all-day events around DST (New York spring and autumn transitions). Verify same actual instant for timed events.
- [ ] Drag between displays, disconnect a display, restart with changed display arrangement: pet remains accessible via the tray.
- [ ] Test native notification behavior with OS Do Not Disturb; independently check MISO quiet hours.
- [ ] Enable and disable login startup and verify on Windows/macOS/Linux.
- [ ] Build/install/uninstall on each target OS; check unsigned-app warnings and OS keyring availability.

Known v1 limits: no bulk commands; no arbitrary occurrence-date chooser; no live-service CI; memory-only snooze; bounded encrypted offline event cache; individual pose images and GIF/WebP animation rather than sprite-sheet playback. No signed distribution builds are provided.
