import { capturePerformance } from "./performance";
import { IDLE_POSE_INTERVAL } from "../renderer/idle-poses";
import { app, screen, shell, BrowserWindow } from "electron";
import { OAuth2Client } from "google-auth-library";
import { APP_NAME, APP_LINKS, type AppLink } from "../shared/brand";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
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
  assert.equal(app.getName(), APP_NAME);
  assert.equal(pet.getTitle(), APP_NAME);
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
  const captureSetup = async (name: string) => {
    // Let the slide transition and Chromium compositor finish before visual QA.
    await delay(250);
    await writeFile(
      join(output, name),
      (await setup.webContents.capturePage()).toPNG(),
    );
  };
  const waitForView = async (view: BrowserWindow, expression: string) => {
    for (let i = 0; i < 120; i++) {
      if (await evaluate(view, expression)) return;
      await delay(25);
    }
    throw new Error(`View did not reach: ${expression}`);
  };
  const dismissResult = async (view: BrowserWindow, title: string) => {
    await waitForView(view, "!!document.querySelector('dialog')");
    assert.match(
      await evaluate(view, "document.querySelector('dialog h2').textContent"),
      new RegExp(title),
    );
    assert.equal(
      await evaluate(view, "document.querySelectorAll('dialog button').length"),
      1,
    );
    assert.equal(
      await evaluate(
        view,
        "document.querySelector('dialog button').textContent",
      ),
      "OK",
    );
    assert.equal(
      await evaluate(
        view,
        "document.querySelector('dialog').getAttribute('aria-labelledby') === document.querySelector('dialog h2').id && document.querySelector('dialog').getAttribute('aria-describedby') === document.querySelector('dialog p').id",
      ),
      true,
    );
    await evaluate(view, "document.querySelector('dialog button').click()");
    await waitForView(view, "!document.querySelector('dialog')");
  };
  assert.equal(
    await evaluate(settings, "document.querySelector('h1').textContent"),
    "MISO",
  );
  assert.equal(await evaluate(settings, "typeof require"), "undefined");
  const openedPages: string[] = [];
  const originalOpenExternal = shell.openExternal;
  shell.openExternal = async (url) => {
    openedPages.push(url);
  };
  try {
    for (const view of [setup, settings]) {
      assert.equal(
        await evaluate(
          view,
          "document.querySelectorAll('[data-app-link]').length",
        ),
        3,
      );
      for (const topic of Object.keys(APP_LINKS) as AppLink[]) {
        await evaluate(
          view,
          `document.querySelector('[data-app-link="${topic}"]').click()`,
        );
        await delay(50);
        assert.equal(openedPages.at(-1), APP_LINKS[topic]);
      }
    }
    const openedCount = openedPages.length;
    for (const forbidden of ["https://example.test/", "javascript:alert(1)"]) {
      await evaluate(
        settings,
        `window.butler.help(${JSON.stringify(forbidden)}).then(()=>{throw new Error('Arbitrary help URL accepted')},()=>true)`,
      );
    }
    assert.equal(openedPages.length, openedCount);
    assert.equal(openedCount, 6);
  } finally {
    shell.openExternal = originalOpenExternal;
  }
  assert.equal(
    await evaluate(setup, "document.querySelector('h1').textContent"),
    "Welcome to MISO.",
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
    /Connect Google/,
  );
  setup.showInactive();
  await delay(250);
  await captureSetup("setup.png");
  await evaluate(setup, "document.querySelector('#start-onboarding').click()");
  assert.equal(
    await evaluate(
      setup,
      "document.querySelector('[data-slide=google]').hidden",
    ),
    false,
  );
  assert.equal(
    await evaluate(setup, "document.querySelector('#setup-enable-ai').checked"),
    false,
  );
  await captureSetup("onboarding-google.png");
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
  let failReads = false;
  let syncGate: Promise<void> | undefined;
  let syncSawBusy = false;
  let syncCheckedBlockedStart = false;
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
        if (
          store.settings.aiEnabled &&
          !store.settings.onboardingCompleted &&
          !syncCheckedBlockedStart
        ) {
          syncCheckedBlockedStart = true;
          syncSawBusy = await evaluate(
            setup,
            "!document.querySelector('[data-slide=sync]').hidden && document.querySelector('#onboarding-controls').disabled && document.querySelector('#start-butler').disabled",
          );
          assert.match(
            await evaluate(
              setup,
              "window.butler.finishSetup().catch(e=>e.message)",
            ),
            /Sync your Google calendars/,
          );
        }
        if (syncGate) await syncGate;
        if (failReads) throw new Error("Synthetic offline calendar");
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
  assert.equal(store.settings.onboardingCompleted, false);
  assert.match(
    await evaluate(setup, "window.butler.finishSetup().catch(e=>e.message)"),
    /Sync your Google calendars/,
  );
  const synced = await evaluate(settings, "window.butler.sync()");
  assert.equal(synced.accounts.length, 2);
  assert.equal(synced.calendars.length, 6);
  assert.equal(synced.setupReady, true);
  assert.equal(synced.hasApiKey, false);
  assert.match(
    await evaluate(
      setup,
      "window.butler.save({onboardingCompleted:true}).catch(e=>e.message)",
    ),
    /Unrecognized|onboardingCompleted/i,
  );
  // Reload an unfinished setup with saved Google credentials: resume onboarding.
  setup.webContents.reload();
  await delay(400);
  assert.equal(
    await evaluate(
      setup,
      "document.querySelector('[data-slide=welcome]').hidden",
    ),
    false,
  );
  await evaluate(setup, "document.querySelector('#start-onboarding').click()");
  assert.equal(
    await evaluate(
      setup,
      "document.querySelector('[data-slide=assistant]').hidden",
    ),
    false,
  );
  await evaluate(setup, "document.querySelector('#back-google').click()");
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
  // Exercise both optional-AI branches through the real renderer and IPC.
  const waitForSetup = async (expression: string) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(setup, expression)) return;
      await delay(25);
    }
    throw new Error(`Onboarding did not reach: ${expression}`);
  };
  await evaluate(
    setup,
    "document.querySelector('#setup-enable-ai').click(); document.querySelector('#connected-continue').click()",
  );
  assert.equal(
    await evaluate(
      setup,
      "document.querySelector('#ai-choice-yes').getAttribute('aria-pressed')",
    ),
    "true",
  );
  await captureSetup("onboarding-ai-choice.png");
  await evaluate(
    setup,
    "document.querySelector('#assistant-continue').click()",
  );
  await waitForSetup(
    "!document.querySelector('[data-slide=ai]').hidden && !document.querySelector('#onboarding-controls').disabled",
  );
  await evaluate(
    setup,
    "document.querySelector('#setup-ai-provider').value='gemini'; document.querySelector('#setup-ai-provider').dispatchEvent(new Event('change'))",
  );
  assert.equal(
    await evaluate(
      setup,
      "document.querySelector('#setup-ai-key-field').hidden",
    ),
    false,
  );
  assert.equal(
    await evaluate(
      setup,
      "document.querySelector('#setup-ai-needs-key').checked",
    ),
    true,
  );
  let aiRequests = 0;
  let rejectAI = true;
  const aiFailures: { status: number; message: string }[] = [];
  const aiStub = (req: IncomingMessage, res: ServerResponse) => {
    aiRequests++;
    res.setHeader("Content-Type", "application/json");
    if (rejectAI) {
      res.writeHead(401);
      res.end("{}");
      return;
    }
    if (req.method === "GET") {
      assert.match(req.url ?? "", /^\/v1beta\/models\?pageSize=1000/);
      assert.equal(req.headers["x-goog-api-key"], "AIzaSyntheticOnly");
      res.end(
        JSON.stringify({
          models: [
            {
              name: "models/gemini-synthetic-flash",
              displayName: "Synthetic Flash",
              supportedGenerationMethods: ["generateContent"],
            },
            {
              name: "models/gemini-synthetic-pro",
              supportedGenerationMethods: ["generateContent"],
            },
            {
              name: "models/embedding-synthetic",
              supportedGenerationMethods: ["embedContent"],
            },
          ],
        }),
      );
      return;
    }
    const failure = aiFailures.shift();
    if (failure) {
      res.writeHead(failure.status, { "retry-after": "0" });
      res.end(JSON.stringify({ error: { message: failure.message } }));
      return;
    }
    assert.match(
      req.url ?? "",
      /^\/v1beta\/models\/(?:synthetic-model|gemini-synthetic-flash):generateContent$/,
    );
    assert.equal(req.headers["x-goog-api-key"], "AIzaSyntheticOnly");
    const parsed = {
      action: "create",
      category: "reminder",
      title: "Drink water",
      start: "2030-01-01T09:00:00+05:30",
      duration_minutes: 60,
      all_day: false,
      recurrence: null,
      reminders_minutes_before: [0],
      target_query: "",
      changes: {},
      confidence: 1,
      clarification_needed: null,
    };
    res.end(
      JSON.stringify({
        candidates: [
          {
            content: { parts: [{ text: JSON.stringify(parsed) }] },
            finishReason: "STOP",
          },
        ],
      }),
    );
  };
  const aiServer = createServer(aiStub);
  await new Promise<void>((resolve) =>
    aiServer.listen(0, "127.0.0.1", resolve),
  );
  const aiAddress = aiServer.address();
  assert.ok(aiAddress && typeof aiAddress !== "string");
  try {
    await evaluate(
      setup,
      `document.querySelector('#setup-ai-key').value='AIzaSyntheticOnly'; document.querySelector('#setup-ai-key').dispatchEvent(new Event('input')); document.querySelector('#setup-ai-url').value='http://127.0.0.1:${aiAddress.port}/v1beta'; document.querySelector('#setup-ai-url').dispatchEvent(new Event('input')); document.querySelector('#setup-ai-model').value='synthetic-model'; document.querySelector('#setup-ai-model').dispatchEvent(new Event('input'))`,
    );
    await captureSetup("onboarding-ai-details.png");
    await evaluate(setup, "document.querySelector('#verify-ai').click()");
    await dismissResult(setup, "Could not finish");
    await waitForSetup(
      "document.querySelector('#feedback').textContent.includes('rejected access') && !document.querySelector('#onboarding-controls').disabled",
    );
    assert.equal(store.settings.aiEnabled, false);
    assert.equal(
      await evaluate(setup, "document.querySelector('[data-slide=ai]').hidden"),
      false,
    );
    rejectAI = false;
    aiFailures.push(
      { status: 503, message: "Synthetic overloaded provider" },
      { status: 400, message: "responseJsonSchema is not supported" },
    );
    await evaluate(setup, "document.querySelector('#verify-ai').click()");
    await waitForSetup(
      "!document.querySelector('[data-slide=ready]').hidden && !document.querySelector('#onboarding-controls').disabled",
    );
    assert.equal(aiRequests, 4);
    assert.equal(
      syncSawBusy,
      true,
      "AI Yes must show mandatory sync before ready",
    );
    assert.equal(store.settings.aiEnabled, true);
    assert.equal(
      (await evaluate(setup, "window.butler.snapshot()")).aiVerified,
      true,
    );
    assert.equal(store.settings.onboardingCompleted, false);
    assert.equal(pet.isVisible(), false);
    await captureSetup("onboarding-ai-ready.png");
  } finally {
    await new Promise<void>((resolve) => aiServer.close(() => resolve()));
  }
  await evaluate(
    setup,
    "document.querySelector('#ready-back').click(); document.querySelector('#ai-choice-no').click()",
  );
  failReads = true;
  await evaluate(
    setup,
    "document.querySelector('#assistant-continue').click()",
  );
  await dismissResult(setup, "Could not finish");
  await waitForSetup(
    "!document.querySelector('#retry-sync').hidden && !document.querySelector('#onboarding-controls').disabled",
  );
  assert.equal(
    await evaluate(setup, "document.querySelector('[data-slide=sync]').hidden"),
    false,
  );
  assert.equal(
    await evaluate(setup, "document.querySelector('#start-butler').disabled"),
    true,
  );
  assert.equal(store.settings.aiEnabled, false);
  assert.match(
    await evaluate(setup, "window.butler.finishSetup().catch(e=>e.message)"),
    /Sync your Google calendars/,
  );
  failReads = false;
  let releaseSync!: () => void;
  syncGate = new Promise<void>((resolve) => {
    releaseSync = resolve;
  });
  await evaluate(setup, "document.querySelector('#retry-sync').click()");
  await waitForSetup("document.querySelector('#onboarding-controls').disabled");
  assert.match(
    await evaluate(setup, "window.butler.finishSetup().catch(e=>e.message)"),
    /Sync your Google calendars/,
  );
  assert.equal(pet.isVisible(), false);
  await captureSetup("onboarding-sync.png");
  releaseSync();
  syncGate = undefined;
  await waitForSetup(
    "!document.querySelector('[data-slide=ready]').hidden && !document.querySelector('#onboarding-controls').disabled",
  );
  await captureSetup("onboarding-ready.png");
  assert.equal(store.settings.onboardingCompleted, false);
  await evaluate(setup, "document.querySelector('#start-butler').click()");
  await delay(100);
  assert.equal(store.settings.onboardingCompleted, true);
  assert.equal(
    new (store.constructor as typeof SettingsStore)().settings
      .onboardingCompleted,
    true,
  );
  assert.equal(settings.isVisible(), false);
  assert.equal(setup.isDestroyed(), true);
  assert.equal(pet.isVisible(), true);
  assert.equal(
    await evaluate(pet, "document.querySelector('#command-form').hidden"),
    true,
  );
  // Configure Gemini from its live-shaped model catalog, then exercise both modes.
  const workflowServer = createServer(aiStub);
  await new Promise<void>((resolve) =>
    workflowServer.listen(0, "127.0.0.1", resolve),
  );
  const workflowAddress = workflowServer.address();
  assert.ok(workflowAddress && typeof workflowAddress !== "string");
  try {
    await evaluate(pet, "window.butler.settings()");
    await evaluate(settings, "document.querySelector('#ai-enabled').click()");
    await waitForView(settings, "!!document.querySelector('dialog')");
    await evaluate(settings, "document.querySelector('dialog button').click()");
    await evaluate(
      settings,
      `document.querySelector('#settings-ai-provider').value='gemini'; document.querySelector('#settings-ai-provider').dispatchEvent(new Event('change')); document.querySelector('#settings-ai-key').value='AIzaSyntheticOnly'; document.querySelector('#settings-ai-key').dispatchEvent(new Event('input')); document.querySelector('#settings-ai-url').value='http://127.0.0.1:${workflowAddress.port}/v1beta'; document.querySelector('#settings-ai-url').dispatchEvent(new Event('input')); document.querySelector('#settings-ai-load-models').click()`,
    );
    await waitForView(
      settings,
      "document.querySelector('#settings-ai-models-status').textContent.includes('2 text models')",
    );
    assert.equal(
      await evaluate(
        settings,
        "document.querySelector('#settings-ai-selection').value",
      ),
      "auto",
    );
    assert.equal(
      await evaluate(
        settings,
        "document.querySelector('#settings-ai-model').required",
      ),
      false,
    );
    await evaluate(
      settings,
      "document.querySelector('#ai-form').requestSubmit()",
    );
    await waitForView(settings, "!!document.querySelector('dialog')");
    assert.match(
      await evaluate(settings, "document.querySelector('dialog').textContent"),
      /AI assistant ready/,
    );
    await evaluate(settings, "document.querySelector('dialog button').click()");
    assert.equal(store.settings.model, "gemini-synthetic-flash");
    assert.equal(store.settings.assistantMode, "ai");
    assert.equal(
      (await evaluate(settings, "window.butler.snapshot()")).aiVerified,
      true,
    );
    assert.equal(
      (
        await readFile(join(app.getPath("userData"), "butler.json"), "utf8")
      ).includes("AIzaSyntheticOnly"),
      false,
    );
    settings.hide();
    pet.webContents.send("quick-add");
    await waitForView(
      pet,
      "!document.querySelector('#command-form').hidden && document.querySelector('#quick-add').hidden",
    );
    assert.equal(
      await evaluate(
        pet,
        "document.querySelector('#ai-assisted-mode').getAttribute('aria-pressed')",
      ),
      "true",
    );
    await evaluate(
      pet,
      "document.querySelector('#command').value='Remind me to drink water on January 1 2030 at 9am for one hour'; document.querySelector('#command-form').requestSubmit()",
    );
    await waitForView(pet, "!!document.querySelector('.event-saved-notice')");
    assert.equal(events.size, 1);
    const scheduled = [...events.values()][0];
    assert.equal(
      Date.parse(scheduled.end!.dateTime!) -
        Date.parse(scheduled.start!.dateTime!),
      3600000,
    );
    await delay(200);
    await writeFile(
      join(output, "ai-scheduled-review.png"),
      (await pet.webContents.capturePage()).toPNG(),
    );
    await evaluate(
      pet,
      "Array.from(document.querySelectorAll('#quick-add button')).find(b=>b.textContent==='Edit').click()",
    );
    await evaluate(
      pet,
      "document.querySelector('#edit-title').value='Drink water (adjusted)'; document.querySelector('#edit-reminders').value='15'; document.querySelector('#popup-edit-form').requestSubmit()",
    );
    await waitForView(
      pet,
      "Array.from(document.querySelectorAll('#quick-add button')).some(b=>b.textContent==='Save changes')",
    );
    await evaluate(
      pet,
      "Array.from(document.querySelectorAll('#quick-add button')).find(b=>b.textContent==='Save changes').click()",
    );
    await waitForView(
      pet,
      "document.querySelector('#quick-add').hidden && !document.querySelector('#user-assisted-mode').disabled",
    );
    assert.equal([...events.values()][0].summary, "Drink water (adjusted)");
    assert.deepEqual([...events.values()][0].reminders?.overrides, [
      { method: "popup", minutes: 15 },
    ]);
    const requestsBeforeManual = aiRequests;
    await evaluate(
      pet,
      "document.querySelector('#user-assisted-mode').click()",
    );
    await waitForView(
      pet,
      "!!document.querySelector('#quick-field') && !document.querySelector('#quick-add').hidden",
    );
    assert.equal(store.settings.assistantMode, "manual");
    assert.equal(
      await evaluate(pet, "document.querySelector('#command-form').hidden"),
      true,
    );
    assert.match(
      await evaluate(
        pet,
        "window.butler.command('Water tomorrow').catch(e=>e.message)",
      ),
      /Switch to AI-assisted/,
    );
    assert.equal(aiRequests, requestsBeforeManual);
    await evaluate(pet, "document.querySelector('#ai-assisted-mode').click()");
    await waitForView(
      pet,
      "!document.querySelector('#command-form').hidden && document.querySelector('#quick-add').hidden",
    );
    assert.equal(store.settings.assistantMode, "ai");
    await evaluate(pet, "window.butler.save({aiEnabled:false})");
    await evaluate(pet, "document.querySelector('#close').click()");
    events.clear();
    await evaluate(settings, "window.butler.sync()");
  } finally {
    await new Promise<void>((resolve) => workflowServer.close(() => resolve()));
  }
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
  // Server runners often disable animations. Exercise both preferences explicitly
  // without changing the user's OS setting or the shipped renderer behaviour.
  pet.webContents.debugger.attach("1.3");
  // A person using the shared desktop can otherwise reset the idle timer by
  // moving the real cursor over MISO while this check waits for its next pose.
  await pet.webContents.debugger.sendCommand("Input.setIgnoreInputEvents", {
    ignore: true,
  });
  const backgroundThrottling = pet.webContents.getBackgroundThrottling();
  pet.webContents.setBackgroundThrottling(false);
  await pet.webContents.debugger.sendCommand("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await delay(100);
  assert.equal(
    await evaluate(pet, "document.querySelector('#pet').dataset.idlePose"),
    "false",
  );
  await pet.webContents.debugger.sendCommand("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  pet.showInactive();
  await delay(150);
  assert.equal(
    await evaluate(pet, "document.querySelector('#pet').dataset.idlePose"),
    "true",
  );
  await delay(IDLE_POSE_INTERVAL + 100);
  for (let attempt = 0; attempt < 15; attempt++) {
    if (
      (await evaluate(pet, "document.querySelector('#pet').dataset.state")) ===
      "happy"
    )
      break;
    await delay(200);
  }
  assert.equal(
    await evaluate(pet, "document.querySelector('#pet').dataset.state"),
    "happy",
    JSON.stringify(
      await evaluate(
        pet,
        "(()=>{const p=document.querySelector('#pet'); return {state:p.dataset.state,enabled:p.dataset.idlePose,hidden:document.hidden,hovered:p.matches(':hover'),focused:p.matches(':focus-visible'),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};})()",
      ),
    ),
  );
  const beforePoseHover = pet.getPosition();
  await pet.webContents.debugger.sendCommand("Input.setIgnoreInputEvents", {
    ignore: false,
  });
  pet.webContents.sendInputEvent({ type: "mouseMove", x: 50, y: 50 });
  await delay(80);
  assert.equal(
    await evaluate(pet, "document.querySelector('#pet').dataset.state"),
    "idle",
  );
  assert.equal(
    await evaluate(pet, "document.querySelector('#pet').dataset.idlePose"),
    "false",
  );
  assert.equal(
    await evaluate(
      pet,
      "document.querySelector('#bubble').classList.contains('hidden')",
    ),
    true,
  );
  assert.deepEqual(pet.getPosition(), beforePoseHover);
  pet.webContents.sendInputEvent({ type: "mouseMove", x: 379, y: 439 });
  await delay(80);
  pet.webContents.debugger.detach();
  pet.webContents.setBackgroundThrottling(backgroundThrottling);
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
  // Exercise the real Settings -> main -> onboarding transition without Google.
  const originalRevoke = OAuth2Client.prototype.revokeToken;
  let revocationGate = Promise.resolve();
  OAuth2Client.prototype.revokeToken = async (token: string) => {
    assert.equal(token, "smoke-only");
    await revocationGate;
    throw new Error("Synthetic revocation failure");
  };
  let releaseRevocation = () => {};
  try {
    assert.equal(store.settings.accounts.length, 2);
    assert.equal(store.settings.onboardingCompleted, true);
    await evaluate(
      settings,
      "document.querySelector('#accounts button').click()",
    );
    await waitForView(settings, "!!document.querySelector('dialog')");
    assert.equal(
      await evaluate(settings, "document.activeElement.textContent"),
      "Cancel",
    );
    await evaluate(
      settings,
      "document.querySelector('dialog button:last-child').click()",
    );
    assert.equal(store.settings.accounts.length, 2);
    await waitForView(
      settings,
      "!document.querySelector('#accounts button').disabled",
    );
    await evaluate(
      settings,
      "document.querySelector('#accounts button').click()",
    );
    await waitForView(settings, "!!document.querySelector('dialog')");
    await evaluate(settings, "document.querySelector('dialog button').click()");
    await dismissResult(settings, "Google account removed");
    assert.equal(store.settings.accounts.length, 1);
    assert.equal(store.settings.accounts[0].id, "two");
    assert.equal(store.settings.onboardingCompleted, true);
    assert.equal(store.secret("googleRefreshToken:two"), "smoke-only");
    assert.equal(settings.isVisible(), true);
    await waitForView(
      settings,
      "!document.querySelector('#accounts button').disabled",
    );
    await evaluate(
      settings,
      "document.querySelector('#accounts button').click()",
    );
    await waitForView(settings, "!!document.querySelector('dialog')");
    assert.match(
      await evaluate(
        settings,
        "document.querySelector('dialog p').textContent",
      ),
      /last Google account.*welcome screen/,
    );
    // Escape has the same safe result as Cancel.
    await evaluate(
      settings,
      "document.querySelector('dialog').dispatchEvent(new Event('cancel',{cancelable:true}))",
    );
    assert.equal(store.settings.accounts.length, 1);
    assert.equal(store.settings.onboardingCompleted, true);
    await waitForView(
      settings,
      "!document.querySelector('#accounts button').disabled",
    );
    revocationGate = new Promise<void>((resolve) => {
      releaseRevocation = resolve;
    });
    await evaluate(
      settings,
      "document.querySelector('#accounts button').click()",
    );
    await waitForView(settings, "!!document.querySelector('dialog')");
    await evaluate(settings, "document.querySelector('dialog button').click()");
    let restartedSetup: BrowserWindow | undefined;
    for (let i = 0; i < 120; i++) {
      restartedSetup = BrowserWindow.getAllWindows().find(
        (w) => w.getTitle() === "Set up MISO",
      );
      if (restartedSetup) break;
      await delay(25);
    }
    assert.ok(restartedSetup);
    await waitForView(
      restartedSetup,
      "!!document.querySelector('#start-onboarding') && !document.querySelector('#onboarding-controls').disabled",
    );
    assert.equal(store.settings.accounts.length, 0);
    assert.equal(store.settings.onboardingCompleted, false);
    assert.equal(
      new (store.constructor as typeof SettingsStore)().settings
        .onboardingCompleted,
      false,
    );
    assert.equal(store.secret("googleRefreshToken:two"), undefined);
    assert.equal(pet.isVisible(), false);
    assert.equal(settings.isVisible(), false);
    // New windows are hidden in smoke mode; production opens setup immediately.
    restartedSetup.showInactive();
    assert.equal(restartedSetup.isVisible(), true);
    assert.equal(
      await evaluate(
        restartedSetup,
        "document.querySelector('[data-slide=welcome]').hidden",
      ),
      false,
    );
    assert.equal(await evaluate(pet, "window.butler.beginQuick()"), false);
    for (const expression of [
      "window.butler.command('add a reminder')",
      "window.butler.createManual({})",
      "window.butler.confirmEdit('expired')",
      "window.butler.confirmDelete('expired')",
      "window.butler.snooze('old-reminder',5)",
    ])
      assert.match(
        await evaluate(pet, `${expression}.catch(e=>e.message)`),
        /Connect Google/,
      );
    assert.match(
      await evaluate(
        restartedSetup,
        "window.butler.finishSetup().catch(e=>e.message)",
      ),
      /Connect Google/,
    );
    releaseRevocation();
    await waitForView(restartedSetup, "!!document.querySelector('dialog')");
    assert.match(
      await evaluate(
        restartedSetup,
        "document.querySelector('dialog p').textContent",
      ),
      /could not confirm revocation/,
    );
    await writeFile(
      join(output, "last-account-welcome.png"),
      (await restartedSetup.webContents.capturePage()).toPNG(),
    );
    await dismissResult(restartedSetup, "Google account removed");
    assert.equal(
      await evaluate(settings, "document.querySelector('dialog')"),
      null,
    );
    assert.equal(store.cache.length, 0);
    assert.deepEqual(store.fired, {});
    await evaluate(
      restartedSetup,
      "document.querySelector('#start-onboarding').click()",
    );
    assert.equal(
      await evaluate(
        restartedSetup,
        "document.querySelector('[data-slide=google]').hidden",
      ),
      false,
    );
    assert.equal(
      await evaluate(
        restartedSetup,
        "document.querySelector('#connected-continue').hidden",
      ),
      true,
    );
    restartedSetup.webContents.reload();
    await waitForView(
      restartedSetup,
      "!!document.querySelector('#start-onboarding') && !document.querySelector('#onboarding-controls').disabled",
    );
    assert.equal(
      await evaluate(
        restartedSetup,
        "document.querySelector('[data-slide=welcome]').hidden",
      ),
      false,
    );
    await dismissResult(restartedSetup, "Google account removed");
  } finally {
    releaseRevocation();
    OAuth2Client.prototype.revokeToken = originalRevoke;
  }
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
    "Electron smoke passed: onboarding, AI scheduling and receipts, sync retry, two accounts, last-account removal/cancellation with delayed failed revocation, accessible dialogs, manual writes and screenshots.",
  );
}
