import assets from "../assets/manifest.json";
import { addSiteLinks } from "./site-links";
import type { Snapshot, Category } from "../shared/types";
import { captureHotkey } from "../shared/hotkey";
import { aiFields, bindAI } from "./ai-form";
import { choiceDialog, confirmDialog, resultDialog } from "./dialogs";
export function setupDashboard(root: HTMLElement) {
  root.innerHTML = `<main class="settings-shell"><header class="header"><img src="../assets/${assets.branding.logo}" alt="MISO"><div><h1>MISO</h1><p>MISO - Your Little Butler</p><p>Tasks, important dates and reminders. AI is optional.</p></div></header><p id="feedback" class="status-bar" role="status"></p><section class="card"><h2>Google accounts</h2><div id="accounts"></div><div class="button-row"><button id="add-account" class="primary">Add Google account</button><button id="refresh">Sync now</button><button id="enable-calendar-api" hidden>Enable Calendar API</button></div><label class="field"><span>Default account</span><select id="default-account"></select></label><h2>Calendars to remind you about</h2><div id="calendar-list" class="calendar-list"></div><div class="button-row"><button id="save-calendars">Save calendar selection</button></div></section><div class="settings-grid"><section class="card"><h2>Add a task or important date</h2><p>No AI or API key needed. MISO saves events to your Google Calendar.</p><form id="manual-form"><label class="field"><span>Account</span><select id="event-account" required></select></label><label class="field"><span>Type</span><select id="event-category"><option value="task">Task</option><option value="date">Important date</option><option value="reminder">Reminder</option></select></label><label class="field"><span>Title</span><input id="event-title" required maxlength="300"></label><div class="row"><label class="field"><span>Date</span><input id="event-date" type="date" required></label><label class="field" id="time-field"><span>Time</span><input id="event-time" type="time" value="09:00" required></label></div><label class="check-field"><input id="event-all-day" type="checkbox">All day</label><label class="check-field"><input id="event-yearly" type="checkbox">Repeat every year</label><label class="field"><span>Reminder</span><select id="event-reminder"></select></label><div class="button-row"><button class="primary">Review & add</button></div></form></section><section class="card"><h2>Next 7 days</h2><p>Deletion also removes the event from Google Calendar and other synced devices.</p><div id="upcoming" class="agenda-list"></div></section></div><section class="card"><h2>Optional AI assistant</h2><p>AI is off by default. When enabled, your typed commands are sent to the provider or local server you choose. Manual calendar features do not send commands to an AI provider.</p><label class="check-field"><input id="ai-enabled" type="checkbox">Enable AI</label><form id="ai-form" hidden>${aiFields("settings-ai")}<div class="button-row"><button>Save & test model</button></div></form></section><section class="card"><h2>Reminder preferences</h2><form id="preferences"><label class="check-field"><input id="hotkey-enabled" type="checkbox">Enable global quick-entry hotkey</label><label class="field"><span>Hotkey combination</span><input id="hotkey" readonly aria-label="Press your hotkey combination" placeholder="Click here, then press your combination"><small>Click the field and press Ctrl, Alt or Shift with a letter, number or function key. Save preferences to apply. The shortcut opens the same popup as clicking the cat.</small></label><div class="row"><label class="field"><span>Meeting reminder (minutes before)</span><input id="lead" type="number" min="0" max="10080" required></label><label class="field"><span>Sync interval (minutes)</span><input id="poll" type="number" min="2" max="5" required></label></div><div class="row"><label class="field"><span>Quiet hours start</span><input id="quiet-start" type="time"></label><label class="field"><span>Quiet hours end</span><input id="quiet-end" type="time"></label></div><label class="check-field"><input id="sound" type="checkbox">Play reminder sound</label><label class="check-field"><input id="login" type="checkbox">Start at login</label><label class="check-field"><input id="paused" type="checkbox">Pause reminders</label><label class="field"><span>Pet appearance</span><select id="skin"><option value="ginger">Ginger</option><option value="midnight">Midnight</option></select></label><div class="button-row"><button>Save preferences</button></div></form></section></main>`;
  const api = window.butler;
  root
    .querySelector("#ai-enabled")!
    .parentElement!.insertAdjacentHTML(
      "afterend",
      `<label class="field" id="assistant-mode-field" hidden><span>Scheduling workflow</span><select id="assistant-mode"><option value="ai">AI-assisted · describe what to schedule</option><option value="manual">User-assisted · enter each detail</option></select></label>`,
    );
  addSiteLinks(root);
  const get = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const input = (id: string) => get<HTMLInputElement>(id);
  let current: Snapshot;
  let busy = false,
    watchDirty = false,
    aiDirty = false,
    preferencesDirty = false;
  const ai = bindAI("settings-ai", () => (aiDirty = true));
  const node = (tag: string, value: string) => {
    const n = document.createElement(tag);
    n.textContent = value;
    return n;
  };
  function choices(id: string, s: Snapshot) {
    const select = get<HTMLSelectElement>(id),
      previous = select.value;
    select.replaceChildren(
      ...s.accounts.map((a) => {
        const o = document.createElement("option");
        o.value = a.id;
        o.textContent = a.email;
        return o;
      }),
    );
    select.value = s.accounts.some((a) => a.id === previous)
      ? previous
      : s.settings.defaultAccountId;
  }
  function update(s: Snapshot) {
    current = s;
    get("enable-calendar-api").hidden = !s.accounts.some((a) =>
      a.status.includes("Calendar API is disabled"),
    );
    get("feedback").textContent = s.status;
    get("accounts").replaceChildren(
      ...s.accounts.map((a) => {
        const row = node("div", `${a.email} · ${a.status}`);
        row.className = "account-row";
        const copy = node("span", row.textContent ?? "");
        copy.className = "account-copy";
        row.replaceChildren(copy);
        const remove = node("button", "Remove account") as HTMLButtonElement;
        remove.disabled = busy;
        remove.onclick = () =>
          void run(async () => {
            if (
              !(await confirmDialog(
                "Remove Google account?",
                `Remove ${a.email} from MISO? Google events stay in your calendar. Other connected accounts remain connected.`,
                "Remove account",
              ))
            )
              return;
            const result = await api.removeAccount(a.id);
            update(result.snapshot);
            await resultDialog("Account removed", result.message);
          });
        row.append(remove);
        return row;
      }),
    );
    choices("event-account", s);
    choices("default-account", s);
    get<HTMLSelectElement>("default-account").value =
      s.settings.defaultAccountId;
    if (!watchDirty) {
      get("calendar-list").replaceChildren();
      if (!s.calendars.length)
        get("calendar-list").textContent =
          "Connect Google to choose calendars.";
      for (const c of s.calendars) {
        const label = document.createElement("label");
        label.className = "calendar-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = c.id;
        const own = s.accounts.some((a) =>
          Object.values(a.petCalendars).includes(c.id),
        );
        checkbox.checked = own || s.settings.selectedCalendars.includes(c.id);
        checkbox.disabled = own;
        checkbox.onchange = () => (watchDirty = true);
        label.append(
          checkbox,
          node("span", `${c.title} · ${c.accountEmail ?? ""}`),
        );
        get("calendar-list").append(label);
      }
    }
    input("ai-enabled").checked = s.settings.aiEnabled;
    get("ai-form").hidden = !s.settings.aiEnabled;
    get("assistant-mode-field").hidden = !s.settings.aiEnabled;
    get<HTMLSelectElement>("assistant-mode").value = s.settings.assistantMode;
    ai.update(s, !aiDirty);
    if (!preferencesDirty) {
      input("hotkey-enabled").checked = !!s.settings.hotkey;
      input("hotkey").value = s.settings.hotkey;
      input("hotkey").disabled = !s.settings.hotkey;
      input("lead").value = String(s.settings.meetingLead);
      input("poll").value = String(s.settings.pollMinutes);
      input("quiet-start").value = s.settings.quietStart;
      input("quiet-end").value = s.settings.quietEnd;
      input("sound").checked = s.settings.sound;
      input("login").checked = s.settings.startAtLogin;
      input("paused").checked = s.settings.paused;
      get<HTMLSelectElement>("skin").value = s.settings.skin;
    }
    get("upcoming").replaceChildren();
    if (!s.upcoming.length)
      get("upcoming").textContent =
        "No upcoming events. Add a task or date to get started.";
    for (const event of s.upcoming) {
      const row = document.createElement("div");
      row.className = "agenda-event";
      const info = node("div", event.summary ?? "Untitled");
      const calendar = s.calendars.find((c) => c.id === event.calendarId);
      info.append(
        node(
          "small",
          `${event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : (event.start?.date ?? "")} · ${calendar?.accountEmail ?? ""}`,
        ),
      );
      row.append(info);
      if (event.id && calendar && ["owner", "writer"].includes(calendar.role)) {
        const remove = node("button", "Delete") as HTMLButtonElement;
        remove.disabled = busy;
        remove.onclick = () =>
          void run(async () => {
            let scope: "instance" | "series" = "instance";
            if (event.recurringEventId || event.recurrence?.length) {
              const picked = await choiceDialog(
                "Delete repeating event",
                "Choose what to delete.",
                [
                  { label: "This occurrence", value: "instance" },
                  { label: "Entire series", value: "series" },
                ],
              );
              if (!picked) return;
              scope = picked as typeof scope;
            }
            const preview = await api.previewDelete(
              event.calendarId,
              event.id!,
              scope,
            );
            if (
              !(await confirmDialog(
                "Delete from Google Calendar?",
                `${preview.title}\n${preview.calendar}\nThis removes it from other synced devices too.`,
                "Delete",
              ))
            ) {
              await api.cancelDelete(preview.ticket);
              return;
            }
            const result = await api.confirmDelete(preview.ticket);
            update(result.snapshot);
            await resultDialog("Deleted", result.message);
          });
        row.append(remove);
      }
      get("upcoming").append(row);
    }
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    busy = true;
    root
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((b) => (b.disabled = true));
    try {
      await fn();
    } catch (e) {
      get("feedback").textContent = (e as Error).message;
      await resultDialog("Could not finish", (e as Error).message);
    } finally {
      busy = false;
      root
        .querySelectorAll<HTMLButtonElement>("button")
        .forEach((b) => (b.disabled = false));
    }
  }
  get("enable-calendar-api").onclick = () => void api.help("google-calendar");
  get("add-account").onclick = () =>
    void run(async () => {
      update(await api.connect());
      await resultDialog("Google account connected", current.status);
    });
  get("refresh").onclick = () =>
    void run(async () => {
      update(await api.sync());
      await resultDialog("Sync complete", current.status);
    });
  get("default-account").onchange = () =>
    void run(async () => {
      update(
        await api.save({
          defaultAccountId: get<HTMLSelectElement>("default-account").value,
        }),
      );
      await resultDialog(
        "Default account saved",
        "New AI-created events use this account. Manual events use the account selected in the form.",
      );
    });
  get("save-calendars").onclick = () =>
    void run(async () => {
      const selected = Array.from(
        get("calendar-list").querySelectorAll<HTMLInputElement>(
          "input:checked",
        ),
      ).map((c) => c.value);
      const s = await api.save({ selectedCalendars: selected });
      watchDirty = false;
      update(s);
      await resultDialog(
        "Calendar selection saved",
        "MISO will remind you about events in the selected calendars.",
      );
    });
  function reminderOptions() {
    const all = input("event-all-day").checked;
    get("time-field").hidden = all;
    input("event-time").required = !all;
    if (!all) input("event-yearly").checked = false;
    input("event-yearly").disabled = !all;
    const values = all
      ? [
          [0, "At midnight"],
          [900, "Previous day at 9 AM"],
          [9540, "One week before at 9 AM"],
        ]
      : [
          [0, "At event time"],
          [10, "10 minutes before"],
          [60, "One hour before"],
          [1440, "One day before"],
        ];
    get("event-reminder").replaceChildren(
      ...[...values, [-1, "No reminder"]].map(([v, label]) => {
        const o = document.createElement("option");
        o.value = String(v);
        o.textContent = String(label);
        return o;
      }),
    );
    if (all) get<HTMLSelectElement>("event-reminder").value = "900";
  }
  input("event-date").value = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 10);
  input("event-all-day").onchange = reminderOptions;
  get("event-category").onchange = () => {
    const important = get<HTMLSelectElement>("event-category").value === "date";
    input("event-all-day").checked = important;
    reminderOptions();
    input("event-yearly").checked = important;
  };
  reminderOptions();
  get("manual-form").onsubmit = (e) => {
    e.preventDefault();
    void run(async () => {
      const accountId = get<HTMLSelectElement>("event-account").value;
      const allDay = input("event-all-day").checked;
      const start =
        input("event-date").value +
        (allDay ? "" : `T${input("event-time").value}`);
      const reminder = Number(get<HTMLSelectElement>("event-reminder").value);
      const title = input("event-title").value.trim();
      if (
        !(await confirmDialog(
          "Add to Google Calendar?",
          `${title}\n${start.replace("T", " at ")}${allDay ? " · All day" : ""}${input("event-yearly").checked ? " · Every year" : ""}\n${current.accounts.find((a) => a.id === accountId)?.email ?? ""}\nReminder: ${get<HTMLSelectElement>("event-reminder").selectedOptions[0].textContent}`,
          "Add event",
        ))
      )
        return;
      const result = await api.createManual({
        accountId,
        category: get<HTMLSelectElement>("event-category").value as Category,
        title,
        start,
        allDay,
        yearly: input("event-yearly").checked,
        reminders: reminder < 0 ? [] : [reminder],
      });
      update(result.snapshot);
      input("event-title").value = "";
      await resultDialog("Event added", result.message);
    });
  };
  input("ai-enabled").onchange = () =>
    void run(async () => {
      update(await api.save({ aiEnabled: input("ai-enabled").checked }));
      await resultDialog(
        current.settings.aiEnabled ? "AI enabled" : "AI disabled",
        current.settings.aiEnabled
          ? "Your typed AI commands will be sent to your selected provider or local server. Configure and test your model below. Manual calendar features continue to work."
          : "Your calendars and reminders keep working without AI.",
      );
    });
  get("assistant-mode").onchange = () =>
    void run(async () => {
      update(
        await api.save({
          assistantMode: get<HTMLSelectElement>("assistant-mode").value as
            "ai" | "manual",
        }),
      );
    });
  get("ai-form").onsubmit = (e) => {
    e.preventDefault();
    void run(async () => {
      const value = ai.read();
      const s = await api.configureAI(value);
      aiDirty = false;
      ai.clearKey();
      update(s);
      await resultDialog(
        "AI assistant ready",
        `Using ${s.settings.model}. Click MISO to schedule in natural language, or switch to User-assisted mode for the manual steps.`,
      );
    });
  };
  input("hotkey").onkeydown = (e) => {
    e.preventDefault();
    const combo = captureHotkey(e);
    if (combo) {
      input("hotkey").value = combo;
      preferencesDirty = true;
    }
  };
  input("hotkey-enabled").onchange = () => {
    preferencesDirty = true;
    input("hotkey").disabled = !input("hotkey-enabled").checked;
    if (input("hotkey-enabled").checked && !input("hotkey").value)
      input("hotkey").value = "Ctrl+Alt+B";
  };
  get("preferences").oninput = () => (preferencesDirty = true);
  get("preferences").onsubmit = (e) => {
    e.preventDefault();
    void run(async () => {
      if (input("hotkey-enabled").checked && !input("hotkey").value)
        throw new Error("Choose a hotkey first.");
      const s = await api.save({
        hotkey: input("hotkey-enabled").checked ? input("hotkey").value : "",
        meetingLead: Number(input("lead").value),
        pollMinutes: Number(input("poll").value),
        quietStart: input("quiet-start").value,
        quietEnd: input("quiet-end").value,
        sound: input("sound").checked,
        startAtLogin: input("login").checked,
        paused: input("paused").checked,
        skin: get<HTMLSelectElement>("skin").value as "ginger" | "midnight",
      });
      preferencesDirty = false;
      update(s);
      await resultDialog(
        "Preferences saved",
        s.settings.paused
          ? "Reminders are paused."
          : "Your reminder preferences are active.",
      );
    });
  };
  api.onSnapshot(update);
  void api.snapshot().then(update);
}
