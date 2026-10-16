# Multiple-account and calendar-only acceptance

- Fresh configured build: welcome slide and Start onboarding button, then mandatory Google login with optional Enable AI Assistant checkbox. Cancel consent: no account saved; stay on the Google slide.
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

- [ ] Installer finish page: Launch MISO checked opens onboarding and closes the installer without waiting for the app to exit. Unchecked does not launch; opening the shortcut later shows the same welcome slide.
- [ ] First launch opens welcome with the pet hidden. Start onboarding shows Google sign-in and the optional AI checkbox; Google is mandatory. After consent, show sign-in completed and the Yes/No AI choice. Checkbox preference carries into that choice.
- [ ] AI Yes opens configuration. Switch providers, verify required key behavior, fail a model test, then correct it. AI remains off until verified. Continue without AI and AI No both proceed to sync without requiring a key.
- [ ] Sync shows progress; failure stays on the sync slide with retry and reconnect options. Only success reveals Sync completed and Start MISO. Start closes setup/settings and reveals the pet; Review my choices returns to the AI choice.
- [ ] Close and reopen after Google sign-in but before Start MISO: onboarding still appears, reuses the saved account, and completes without a second sign-in. After finishing, relaunch directly into the pet. Existing pre-onboarding profiles retain their completed experience. Start from scratch restores welcome.
- [ ] Test Anthropic, OpenAI, Gemini, a compatible gateway and an unauthenticated local Ollama model with your own credentials. Confirm custom model IDs and endpoints work.
- [ ] Gemini: paste an AI Studio API key and use Automatic without typing a model ID or endpoint. Load available models; verify all pages and text-model filtering. Select a discovered model, then a custom ID. Test invalid keys, restricted keys, missing model access and exhausted quota; preserve a previously working configuration when the draft fails. Never paste real keys into logs or screenshots.
- [ ] AI recovery: simulate 503 responses during model discovery and interpretation, verify at most two retries, respect Retry-After/no-retry headers and deadlines, and save only a successful draft. For a schema/mode/instruction-related Gemini 400, remove only the explicitly rejected feature and validate the final JSON locally. Unknown 400s and invalid credentials must not be blindly retried. Test an OpenAI reasoning model and a pasted full completion endpoint. Distinguish billing/context errors without displaying remote messages, keys, URLs or calendar text in errors. No duplicate Google writes may result from AI retries.
- [ ] AI-assisted: click the pet, type a clear event/reminder with an explicit duration, and verify exactly one Google write. Check the saved-event dialog's title, date, end time, account and reminders. Edit title/time/reminders, cancel the preview, then confirm a fresh preview. An event changed remotely must reject stale changes.
- [ ] Switch AI-assisted/User-assisted from the popup and Settings. User-assisted opens manual steps and makes no AI request. Switching after an AI-created event or manual edit must remain available; switching modes and restarting preserves the choice. Turning AI off retains calendar/manual features.
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
- [ ] Remove one of two Google accounts: Cancel and Escape keep both; confirmation removes only that account, shows an acknowledgement, and keeps the app available. Remove the last account: the confirmation warns about returning to onboarding; the welcome slide appears immediately with pet/Settings hidden, including while Google revocation is pending or fails. Dismiss the result with OK, restart, reconnect, and complete mandatory sync/Start MISO before using the app again. Pending event previews and snoozes must not survive removal of the last account.
- [ ] Success/error dialogs have one OK button, accessible titles/descriptions and keyboard focus. Destructive confirmations initially focus Cancel. Check failed AI setup/sync, account removal, OAuth configuration/default restoration, scheduling workflow changes, preferences, and local reset; feedback must appear in the visible window and never imply a cancelled action completed.
- [ ] Force rate limits/quota failures: reads back off; writes do not repeat automatically. Check ambiguous network writes on Google before retrying.
- [ ] Sleep past a due reminder by less than 30 minutes: missed alert; beyond 30 minutes: no stale alert.
- [ ] Toggle quiet hours across midnight and pause: no local delivery during suppression; catch up within grace only.
- [ ] Change system timezone and test timed and all-day events around DST (New York spring and autumn transitions). Verify same actual instant for timed events.
- [ ] Drag between displays, disconnect a display, restart with changed display arrangement: pet remains accessible via the tray.
- [ ] After Start MISO, verify the cat image actually paints inside the screen, not just that its window is visible. Minimize the pet or move its native window off-screen, then activate MISO or use Show MISO from the tray: it restores on a connected display. Change resolution/scaling/work area while idle and while a popup is open; the cat stays reachable and closes stale popup placement.
- [ ] Test native notification behavior with OS Do Not Disturb; independently check MISO quiet hours.
- [ ] Enable and disable login startup and verify on Windows/macOS/Linux.
- [ ] Build/install/uninstall on each target OS; check unsigned-app warnings and OS keyring availability.

Known v1 limits: no bulk commands; no arbitrary occurrence-date chooser; no live-service CI; memory-only snooze; bounded encrypted offline event cache; individual pose images and GIF/WebP animation rather than sprite-sheet playback. No signed distribution builds are provided.
