import { capturePerformance } from "./performance";
import { app, screen, type BrowserWindow } from "electron";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { strict as assert } from "node:assert";
import type { SettingsStore } from "./settings/store";
import { AccountCalendarProvider, scopedCalendar } from "./calendar/accounts";
import type { CalendarProvider } from "./calendar/provider";
import type { CalendarEvent } from "../shared/types";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function smoke(
  pet: BrowserWindow,
  settings: BrowserWindow,
  store: SettingsStore,
  setup: BrowserWindow,
  provider: AccountCalendarProvider,
) {
  await delay(700);
  assert.equal(setup.getTitle(), "Set up MISO");
  const output = join(process.cwd(), "artifacts", "review");
  await mkdir(output, { recursive: true });
  const evaluate = async (w: BrowserWindow, code: string) => {
    try {
      return await w.webContents.executeJavaScript(code);
    } catch (error) {
      // Expressions are fixed synthetic test steps, never personal data.
      throw new Error(`Smoke step failed in ${w.getTitle()}: ${code}`, {
        cause: error,
      });
    }
  };
  assert.equal(
    await evaluate(settings, "document.querySelector('h1').textContent"),
    "MISO",
  );
  assert.equal(await evaluate(settings, "typeof require"), "undefined");
  assert.equal(
    await evaluate(setup, "document.querySelector('h1').textContent"),
    "First, connect Google.",
  );
  assert.equal(
    await evaluate(setup, "document.querySelector('#start-butler').disabled"),
    true,
  );
  assert.equal(
    await evaluate(settings, "document.querySelector('#ai-form').hidden"),
    true,
  );
  assert.equal(
    await evaluate(pet, "document.querySelector('#pet-blob')"),
    null,
  );
  assert.equal(store.settings.aiEnabled, false);
  assert.match(
    await evaluate(setup, "window.butler.finishSetup().catch(e=>e.message)"),
    /Connect Google/,
  );
  assert.match(
    await evaluate(
      pet,
      "window.butler.command('add task').catch(e=>e.message)",
    ),
    /currently off/,
  );
  setup.showInactive();
  await delay(250);
  await writeFile(
    join(output, "setup.png"),
    (await setup.webContents.capturePage()).toPNG(),
  );
  store.setSecret("smoke-test", "secure-roundtrip");
  assert.equal(store.secret("smoke-test"), "secure-roundtrip");
  assert.equal(
    (
      await readFile(join(app.getPath("userData"), "butler.json"), "utf8")
    ).includes("secure-roundtrip"),
    false,
  );
  store.setSecret("smoke-test", "");
  let readCount = 0;
  const events = new Map<string, CalendarEvent>();
  const accounts = ["one", "two"].map((id) => ({
    id,
    email: `${id}@example.test`,
    petCalendars: {
      task: scopedCalendar(id, "tasks"),
      date: scopedCalendar(id, "dates"),
      reminder: scopedCalendar(id, "reminders"),
    },
  }));
  for (const account of accounts) {
    store.setSecret(`googleRefreshToken:${account.id}`, "smoke-only");
    const raw: CalendarProvider = {
      async listCalendars() {
        return ["tasks", "dates", "reminders"].map((id) => ({
          id,
          title: id,
          role: "owner",
          timeZone: "Asia/Kolkata",
          defaultOffsets: [],
        }));
      },
      async ensureCalendar(c) {
        return c;
      },
      async listEvents(id) {
        readCount++;
        return {
          items: Array.from(events.values()).filter(
            (e) => e.calendarId === id && e.organizer?.email === account.email,
          ),
        };
      },
      async createEvent(id, event) {
        const created = {
          ...event,
          calendarId: id,
          etag: "v1",
          organizer: { email: account.email },
        };
        events.set(event.id!, created);
        return created;
      },
      async getEvent(id, eventId) {
        const e = events.get(eventId);
        if (!e) throw new Error("Missing event");
        return e;
      },
      async updateEvent(id, eventId, patch) {
        const existing = events.get(eventId);
        if (!existing) throw new Error("Missing event");
        const updated = { ...existing, ...patch, etag: "v2" };
        events.set(eventId, updated);
        return updated;
      },
      async deleteEvent(id, eventId) {
        events.delete(eventId);
      },
    };
    provider.add(account.id, account.email, raw);
  }
  store.save({
    accounts,
    defaultAccountId: "one",
    petCalendars: accounts[0].petCalendars,
  });
  const synced = await evaluate(settings, "window.butler.sync()");
  assert.equal(synced.accounts.length, 2);
  assert.equal(synced.calendars.length, 6);
  assert.equal(synced.setupReady, true);
  assert.equal(synced.hasApiKey, false);
  assert.equal(
    await evaluate(
      settings,
      "document.querySelectorAll('#accounts button').length",
    ),
    2,
  );
  assert.equal(
    await evaluate(
      setup,
      "document.querySelectorAll('#setup-accounts button').length",
    ),
    2,
  );
  await evaluate(
    setup,
    "document.querySelector('#setup-accounts button').click()",
  );
  await delay(150);
  assert.equal(store.settings.accounts.length, 2);
  await evaluate(
    setup,
    "document.querySelector('dialog button:last-child').click()",
  );
  await delay(150);
  assert.equal(store.settings.accounts.length, 2);
  await evaluate(setup, "document.querySelector('#start-scratch').click()");
  await delay(150);
  assert.equal(store.settings.accounts.length, 2);
  await evaluate(
    setup,
    "document.querySelector('dialog button:last-child').click()",
  );
  await delay(150);
  assert.equal(store.settings.accounts.length, 2);
  await evaluate(settings, "window.butler.finishSetup()");
  await delay(100);
  assert.equal(pet.isVisible(), true);
  assert.equal(
    await evaluate(pet, "document.querySelector('#command-form').hidden"),
    true,
  );
  await capturePerformance(pet, output);
  const work = screen.getPrimaryDisplay().workArea;
  await evaluate(pet, `window.butler.move(${work.x},${work.y})`);
  await delay(150);
  // Keep the real desktop cursor from making the hover-only name assertion flaky.
  pet.webContents.sendInputEvent({ type: "mouseMove", x: 379, y: 439 });
  await delay(80);
  let geometry = await evaluate(
    pet,
    "(()=>{const r=document.querySelector('#pet').getBoundingClientRect();return {x:window.screenX+r.x,y:window.screenY+r.y,width:r.width,below:document.querySelector('.pet-stage').classList.contains('popup-below'),name:getComputedStyle(document.querySelector('#pet-label')).visibility};})()",
  );
  assert.equal(geometry.x, work.x);
  assert.equal(geometry.y, work.y);
  assert.equal(geometry.width, 110);
  assert.equal(geometry.below, true);
  assert.equal(geometry.name, "hidden");
  pet.webContents.send("quick-add");
  await delay(120);
  const topBubble = await evaluate(
    pet,
    "(()=>{const r=document.querySelector('#bubble').getBoundingClientRect();return {top:r.top,bottom:r.bottom,center:window.screenY+(r.top+r.bottom)/2};})()",
  );
  assert.ok(Math.abs(topBubble.center - (work.y + work.height / 2)) <= 1);
  assert.ok(topBubble.bottom <= 440);
  await writeFile(
    join(output, "pet-top-popup.png"),
    (await pet.webContents.capturePage()).toPNG(),
  );
  await evaluate(
    pet,
    "document.querySelector('.quick-actions button').click()",
  );
  await delay(120);
  assert.equal(
    (await evaluate(pet, "window.butler.snapshot()")).petLayout.centered,
    undefined,
  );
  const beforeHover = pet.getPosition();
  await evaluate(
    pet,
    "document.querySelector('#pet').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,buttons:0,screenX:500,screenY:500}))",
  );
  await delay(80);
  assert.deepEqual(pet.getPosition(), beforeHover);
  await evaluate(
    pet,
    `window.butler.move(${work.x + work.width - 110},${work.y + work.height - 125})`,
  );
  await delay(150);
  assert.equal(
    await evaluate(
      pet,
      "document.querySelector('.pet-stage').classList.contains('popup-below')",
    ),
    false,
  );
  const quickDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const advance = async (value?: string) => {
    await evaluate(
      pet,
      `(()=>{const field=document.querySelector('#quick-field');${value === undefined ? "" : `field.value=${JSON.stringify(value)};`}document.querySelector('#quick-form').requestSubmit();})()`,
    );
    await delay(60);
  };
  pet.webContents.send("quick-add");
  await delay(100);
  assert.equal(
    await evaluate(pet, "document.querySelector('.quick-prompt').textContent"),
    "how can i help u boss",
  );
  await advance("task");
  assert.equal(
    await evaluate(pet, "document.querySelector('.quick-prompt').textContent"),
    "enter the title boss",
  );
  await advance("Popup task");
  await advance(quickDate);
  assert.equal(
    await evaluate(pet, "document.querySelector('#quick-field').type"),
    "time",
  );
  await advance("10:30");
  await advance("0");
  await advance("two");
  assert.equal(events.size, 0);
  assert.equal(
    await evaluate(pet, "document.querySelector('.quick-prompt').textContent"),
    "ready to save boss?",
  );
  pet.showInactive();
  await writeFile(
    join(output, "quick-review.png"),
    (await pet.webContents.capturePage()).toPNG(),
  );
  await advance();
  await delay(250);
  assert.equal(events.size, 1);
  assert.equal(
    (await evaluate(pet, "window.butler.snapshot()")).petLayout.centered,
    undefined,
  );
  assert.deepEqual(store.settings.position, {
    x: work.x + work.width - 110,
    y: work.y + work.height - 125,
  });
  assert.equal(
    await evaluate(pet, "document.querySelector('#pet').dataset.state"),
    "wink",
  );
  assert.match(
    await evaluate(pet, "document.querySelector('#message').textContent"),
    /^aye aye boss/,
  );
  await writeFile(
    join(output, "pet-wink.png"),
    (await pet.webContents.capturePage()).toPNG(),
  );
  const quickEvent = (await evaluate(pet, "window.butler.snapshot()"))
    .upcoming[0];
  assert.equal(quickEvent.calendarId, scopedCalendar("two", "tasks"));
  pet.webContents.send("quick-add");
  await delay(120);
  await advance("calendar");
  assert.equal(
    await evaluate(
      pet,
      "document.querySelector('#popup-agenda .popup-event strong').textContent",
    ),
    "Popup task",
  );
  await evaluate(
    pet,
    "document.querySelector('#agenda-search').value='no-match';document.querySelector('#agenda-search').dispatchEvent(new Event('input'))",
  );
  assert.equal(
    await evaluate(pet, "document.querySelector('.popup-event').hidden"),
    true,
  );
  await evaluate(
    pet,
    "document.querySelector('#agenda-search').value='popup';document.querySelector('#agenda-search').dispatchEvent(new Event('input'))",
  );
  assert.equal(
    await evaluate(pet, "document.querySelector('.popup-event').hidden"),
    false,
  );
  await writeFile(
    join(output, "calendar-agenda.png"),
    (await pet.webContents.capturePage()).toPNG(),
  );
  await evaluate(pet, "document.querySelector('.popup-event').click()");
  await delay(120);
  assert.equal(
    await evaluate(
      pet,
      "Array.from(document.querySelectorAll('#quick-add button')).some(b=>b.textContent==='View in calendar')",
    ),
    true,
  );
  await evaluate(
    pet,
    "Array.from(document.querySelectorAll('#quick-add button')).find(b=>b.textContent==='Edit').click()",
  );
  await evaluate(
    pet,
    "document.querySelector('#edit-title').value='Edited popup task';document.querySelector('#popup-edit-form').requestSubmit()",
  );
  await delay(120);
  assert.equal(Array.from(events.values())[0].summary, "Popup task");
  await writeFile(
    join(output, "calendar-edit-preview.png"),
    (await pet.webContents.capturePage()).toPNG(),
  );
  await evaluate(
    pet,
    "Array.from(document.querySelectorAll('#quick-add button')).find(b=>b.textContent==='Save changes').click()",
  );
  await delay(200);
  assert.equal(Array.from(events.values())[0].summary, "Edited popup task");
  assert.equal(
    (await evaluate(pet, "window.butler.snapshot()")).petLayout.centered,
    undefined,
  );
  const quickDelete = await evaluate(
    pet,
    `window.butler.previewDelete(${JSON.stringify(quickEvent.calendarId)},${JSON.stringify(quickEvent.id)},'instance')`,
  );
  await evaluate(
    pet,
    `window.butler.confirmDelete(${JSON.stringify(quickDelete.ticket)})`,
  );
  assert.equal(events.size, 0);
  pet.webContents.send("quick-add");
  await delay(100);
  await advance("date");
  await advance("Popup birthday");
  await advance(quickDate);
  assert.equal(
    await evaluate(pet, "document.querySelector('#quick-field').type"),
    "checkbox",
  );
  assert.equal(
    await evaluate(pet, "document.querySelector('#quick-field').checked"),
    true,
  );
  await evaluate(
    pet,
    "document.querySelector('.quick-actions button:last-child').click()",
  );
  assert.equal(
    await evaluate(pet, "document.querySelector('#quick-add').hidden"),
    true,
  );
  assert.equal(events.size, 0);
  // Its previous-day 9 AM reminder must also remain in the future.
  const futureDate = new Date(Date.now() + 3 * 86400000)
    .toISOString()
    .slice(0, 10);
  const added = await evaluate(
    settings,
    `window.butler.createManual(${JSON.stringify({ accountId: "two", category: "date", title: "Annual date", start: futureDate, allDay: true, yearly: true, reminders: [900] })})`,
  );
  assert.equal(added.success, true);
  assert.equal(
    added.snapshot.upcoming[0].calendarId,
    scopedCalendar("two", "dates"),
  );
  assert.equal(events.size, 1);
  assert.deepEqual(Array.from(events.values())[0].recurrence, [
    "RRULE:FREQ=YEARLY",
  ]);
  const e = added.snapshot.upcoming[0];
  const preview = await evaluate(
    settings,
    `window.butler.previewDelete(${JSON.stringify(e.calendarId)},${JSON.stringify(e.id)},'series')`,
  );
  assert.equal(events.size, 1);
  await evaluate(
    settings,
    `window.butler.cancelDelete(${JSON.stringify(preview.ticket)})`,
  );
  assert.match(
    await evaluate(
      settings,
      `window.butler.confirmDelete(${JSON.stringify(preview.ticket)}).catch(e=>e.message)`,
    ),
    /expired/,
  );
  assert.equal(events.size, 1);
  const reviewed = await evaluate(
    settings,
    `window.butler.previewDelete(${JSON.stringify(e.calendarId)},${JSON.stringify(e.id)},'series')`,
  );
  assert.equal(
    (
      await evaluate(
        settings,
        `window.butler.confirmDelete(${JSON.stringify(reviewed.ticket)})`,
      )
    ).success,
    true,
  );
  assert.equal(events.size, 0);
  await evaluate(settings, "document.querySelector('#ai-enabled').click()");
  await delay(200);
  assert.equal(
    await evaluate(settings, "document.querySelector('#ai-form').hidden"),
    false,
  );
  assert.equal(pet.isVisible(), true);
  assert.equal(
    (await evaluate(settings, "window.butler.snapshot()")).setupReady,
    true,
  );
  await evaluate(settings, "document.querySelector('dialog button').click()");
  await delay(150);
  await evaluate(settings, "document.querySelector('#ai-enabled').click()");
  await delay(200);
  await evaluate(settings, "document.querySelector('dialog button').click()");
  // Close the settings pane before exercising the separate pet workflow.
  settings.hide();
  await delay(150);
  pet.webContents.send("quick-add");
  await delay(120);
  assert.equal(
    await evaluate(
      pet,
      "document.querySelector('#quick-settings').textContent",
    ),
    "Settings",
  );
  const settingsButton = await evaluate(
    pet,
    "(() => { const r = document.querySelector('#quick-settings').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()",
  );
  pet.webContents.sendInputEvent({ type: "mouseMove", ...settingsButton });
  pet.webContents.sendInputEvent({
    type: "mouseDown",
    button: "left",
    clickCount: 1,
    ...settingsButton,
  });
  pet.webContents.sendInputEvent({
    type: "mouseUp",
    button: "left",
    clickCount: 1,
    ...settingsButton,
  });
  await delay(150);
  assert.equal(settings.isVisible(), true);
  assert.equal(
    await evaluate(
      pet,
      "document.querySelector('#bubble').classList.contains('hidden')",
    ),
    true,
  );
  assert.equal(
    (await evaluate(pet, "window.butler.snapshot()")).petLayout.centered,
    undefined,
  );
  assert.equal(await evaluate(pet, "window.butler.beginQuick()"), false);
  pet.webContents.send("quick-add");
  pet.webContents.send("reply", {
    text: "Pending confirmation",
    state: "idle",
  });
  await delay(100);
  assert.equal(
    await evaluate(
      pet,
      "document.querySelector('#bubble').classList.contains('hidden')",
    ),
    true,
  );
  settings.hide();
  await delay(120);
  assert.equal(
    (await evaluate(pet, "window.butler.snapshot()")).panelOpen,
    false,
  );
  settings.showInactive();
  await delay(250);
  await writeFile(
    join(output, "settings.png"),
    (await settings.webContents.capturePage()).toPNG(),
  );
  await evaluate(settings, "window.scrollTo(0,document.body.scrollHeight)");
  await delay(150);
  await writeFile(
    join(output, "settings-bottom.png"),
    (await settings.webContents.capturePage()).toPNG(),
  );
  await evaluate(
    pet,
    "document.querySelector('#pet').dispatchEvent(new PointerEvent('pointerup',{bubbles:true}))",
  );
  await delay(150);
  await writeFile(
    join(output, "pet.png"),
    (await pet.webContents.capturePage()).toPNG(),
  );
  assert.equal(pet.isAlwaysOnTop(), true);
  provider.add("one", "one@example.test", {
    async listCalendars() {
      throw new Error("invalid_grant");
    },
  } as unknown as CalendarProvider);
  const partial = await evaluate(
    settings,
    "window.butler.sync().catch(e=>e.message)",
  );
  assert.match(partial, /1 account/);
  const snapshot = await evaluate(settings, "window.butler.snapshot()");
  assert.equal(
    snapshot.accounts.find((a: { id: string }) => a.id === "two").connected,
    true,
  );
  assert.equal(
    snapshot.accounts.find((a: { id: string }) => a.id === "one").connected,
    false,
  );
  const readsBeforePreferences = readCount;
  await evaluate(
    settings,
    "document.querySelector('#hotkey').dispatchEvent(new KeyboardEvent('keydown',{key:'k',code:'KeyK',ctrlKey:true,shiftKey:true,bubbles:true}))",
  );
  assert.equal(
    await evaluate(settings, "document.querySelector('#hotkey').value"),
    "Ctrl+Shift+K",
  );
  await evaluate(
    settings,
    "document.querySelector('#preferences').requestSubmit()",
  );
  await delay(150);
  assert.equal(store.settings.hotkey, "Ctrl+Shift+K");
  assert.equal(readCount, readsBeforePreferences);
  await evaluate(settings, "document.querySelector('dialog button').click()");
  await delay(100);
  await evaluate(settings, "window.butler.save({hotkey:''})");
  assert.equal(store.settings.hotkey, "");
  store.save({
    googleClientId: "123-test.apps.googleusercontent.com",
    aiEnabled: true,
    sound: true,
  });
  store.setSecret("googleClientSecret", "developer-config");
  store.setSecret("reset-ai-key", "personal-key");
  const rawStore = await readFile(
    join(app.getPath("userData"), "butler.json"),
    "utf8",
  );
  assert.deepEqual(Object.keys(JSON.parse(rawStore)), ["vault"]);
  for (const privateText of [
    "personal-key",
    "developer-config",
    "123-test.apps.googleusercontent.com",
    "mock-one@example.com",
  ])
    assert.equal(rawStore.includes(privateText), false);
  const restoredStore = new (store.constructor as typeof SettingsStore)();
  assert.equal(restoredStore.secret("reset-ai-key"), "personal-key");
  assert.equal(
    restoredStore.settings.googleClientId,
    store.settings.googleClientId,
  );
  store.fired = { "old-reminder": Date.now() };
  events.set("remote-kept", {
    id: "remote-kept",
    calendarId: "tasks",
    summary: "Keep in Google",
  });
  const reset = await evaluate(settings, "window.butler.resetSetup()");
  assert.equal(reset.success, true);
  assert.equal(reset.snapshot.accounts.length, 0);
  assert.equal(reset.snapshot.setupReady, false);
  assert.equal(reset.snapshot.settings.aiEnabled, false);
  assert.equal(reset.snapshot.settings.sound, false);
  assert.equal(
    reset.snapshot.settings.googleClientId,
    "123-test.apps.googleusercontent.com",
  );
  assert.equal(store.secret("googleClientSecret"), "developer-config");
  assert.equal(store.secret("reset-ai-key"), undefined);
  assert.equal(store.secret("googleRefreshToken:one"), undefined);
  assert.equal(store.cache.length, 0);
  assert.deepEqual(store.fired, {});
  assert.equal(events.size, 1);
  assert.equal(pet.isVisible(), false);
  const previousId = process.env.BUTLER_GOOGLE_CLIENT_ID;
  const previousSecret = process.env.BUTLER_GOOGLE_CLIENT_SECRET;
  try {
    process.env.BUTLER_GOOGLE_CLIENT_ID =
      "999-publicdefault.apps.googleusercontent.com";
    process.env.BUTLER_GOOGLE_CLIENT_SECRET = "default-client-only";
    const defaultSnapshot = await evaluate(
      settings,
      "window.butler.restoreDefaultOAuth()",
    );
    assert.equal(defaultSnapshot.settings.googleClientId, "");
    assert.equal(defaultSnapshot.usingDefaultOAuth, true);
    assert.equal(store.secret("googleClientSecret"), "default-client-only");
    await evaluate(
      settings,
      "window.butler.save({googleClientId:'555-custom.apps.googleusercontent.com'})",
    );
    assert.equal(store.secret("googleClientSecret"), undefined);
    const reverted = await evaluate(
      settings,
      "window.butler.restoreDefaultOAuth()",
    );
    assert.equal(reverted.usingDefaultOAuth, true);
    assert.equal(reverted.settings.googleClientId, "");
  } finally {
    if (previousId === undefined) delete process.env.BUTLER_GOOGLE_CLIENT_ID;
    else process.env.BUTLER_GOOGLE_CLIENT_ID = previousId;
    if (previousSecret === undefined)
      delete process.env.BUTLER_GOOGLE_CLIENT_SECRET;
    else process.env.BUTLER_GOOGLE_CLIENT_SECRET = previousSecret;
  }
  console.log(
    "Electron smoke passed: Google-first setup, two accounts, optional AI, manual writes, confirmation tickets, isolated sync and screenshots.",
  );
}
