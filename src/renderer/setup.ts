import assets from "../assets/manifest.json";
import { addSiteLinks } from "./site-links";
import type { Snapshot } from "../shared/types";
import { confirmDialog, resultDialog } from "./dialogs";
import { aiFields, bindAI } from "./ai-form";

type Slide = "welcome" | "google" | "assistant" | "ai" | "sync" | "ready";

export function setupWizard(root: HTMLElement) {
  document.body.className = "settings-view onboarding-view";
  root.innerHTML = `<main class="settings-shell onboarding-shell">
    <aside class="onboarding-story" aria-label="Your MISO onboarding">
      <div class="onboarding-brand"><img src="../assets/branding/icon.png" alt=""><span>MISO<span>Your little butler</span></span></div>
      <div class="onboarding-art"><span class="onboarding-orbit" aria-hidden="true"></span><img id="onboarding-mascot" src="../assets/${assets.mascot.idle}" alt="MISO, your desktop cat companion"></div>
      <p class="onboarding-story-title">A little company.<br>A little less to remember.</p>
      <ol class="onboarding-progress"><li data-progress="1"><span>1</span>Connect Google</li><li data-progress="2"><span>2</span>Make it yours</li><li data-progress="3"><span>3</span>Sync your calendars</li><li data-progress="4"><span>4</span>Meet your companion</li></ol>
      <p class="onboarding-local">Your calendar stays in Google.<br>Your local profile stays encrypted.</p>
    </aside>
    <div class="onboarding-content">
      <header class="onboarding-top"><span id="slide-caption">A SMALL HELLO</span><span id="slide-count">Welcome</span></header>
      <fieldset id="onboarding-controls" class="onboarding-controls" disabled>
        <section class="onboarding-slide" data-slide="welcome" aria-labelledby="welcome-title">
          <span class="onboarding-eyebrow">MEET YOUR DESKTOP COMPANION</span>
          <h1 id="welcome-title" tabindex="-1">Welcome to MISO.</h1><p class="onboarding-lead">A small cat with a soft spot for keeping you on time.</p>
          <div class="onboarding-benefits"><p><span aria-hidden="true">01</span>Your Google Calendar, close at paw.</p><p><span aria-hidden="true">02</span>Gentle reminders and a little company.</p><p><span aria-hidden="true">03</span>Optional AI for the way you naturally type.</p></div>
          <button id="start-onboarding" class="primary onboarding-primary">Start onboarding <span aria-hidden="true">→</span></button><p class="onboarding-note">Connect Google to get started. AI is entirely up to you.</p>
        </section>
        <section class="onboarding-slide" data-slide="google" aria-labelledby="google-title" hidden>
          <span class="onboarding-eyebrow">STEP 1 · YOUR CALENDAR</span><h1 id="google-title" tabindex="-1">First, connect Google.</h1><p class="onboarding-lead">Give your little butler a calendar to look after.</p>
          <div class="onboarding-info"><span class="onboarding-badge">Required</span><h2>Sign in with Google</h2><p>Google opens in your browser to ask for calendar permissions. MISO saves your events to Google Calendar.</p><div id="setup-accounts"></div><button id="google-connect" class="primary onboarding-primary">Continue with Google</button><button id="connected-continue" hidden>Continue with this account →</button></div>
          <label class="onboarding-option"><input id="setup-enable-ai" type="checkbox"><span><strong>Enable AI Assistant <small>Optional</small></strong><span>Turn it on to turn natural language into events and reminders. You can configure your AI provider after signing in.</span></span></label>
          <div class="onboarding-actions"><button id="back-welcome">Back</button><span>Google sign-in is required to continue.</span></div>
        </section>
        <section class="onboarding-slide" data-slide="assistant" aria-labelledby="assistant-title" hidden>
          <div class="onboarding-success"><span aria-hidden="true">✓</span><div><strong>Google sign-in completed</strong><p id="signed-in-account"></p></div></div>
          <span class="onboarding-eyebrow">STEP 2 · A LITTLE EXTRA HELP</span><h1 id="assistant-title" tabindex="-1">Make room for AI?</h1><p class="onboarding-lead">Would you like to enable the AI Assistant?</p><p class="onboarding-description">Turn natural language into calendar events and reminders. Type something like “remind me to call Mum tomorrow at 6” and MISO interprets it.</p>
          <div class="onboarding-toggle" role="group" aria-label="Enable AI Assistant"><button id="ai-choice-yes" aria-pressed="false">Yes, enable AI</button><button id="ai-choice-no" aria-pressed="true">No, thanks</button></div><p id="ai-choice-description" class="onboarding-note">Manual events, your calendar and reminders work without AI. You can enable it later in Settings.</p>
          <div class="onboarding-actions"><button id="back-google">Back</button><button id="assistant-continue" class="primary">Continue to sync →</button></div>
        </section>
        <section class="onboarding-slide" data-slide="ai" aria-labelledby="ai-title" hidden>
          <span class="onboarding-eyebrow">STEP 2 · YOUR AI ASSISTANT</span><h1 id="ai-title" tabindex="-1">Choose your AI.</h1><p class="onboarding-description">Connect a provider or local model for natural-language events and reminders. Typed commands and clarification text go to the service you choose. Provider charges may apply.</p>
          <form id="setup-ai-form" class="onboarding-ai-form">${aiFields("setup-ai")}<div class="onboarding-actions"><button id="back-assistant" type="button">Back</button><button id="verify-ai" type="submit" class="primary">Save & test AI →</button></div></form><button id="skip-ai" class="onboarding-text-button">Continue without AI</button>
        </section>
        <section class="onboarding-slide" data-slide="sync" aria-labelledby="sync-title" hidden>
          <span class="onboarding-eyebrow">STEP 3 · GETTING THINGS READY</span><h1 id="sync-title" tabindex="-1">A moment to catch up.</h1><p class="onboarding-lead">MISO is syncing your calendars.</p><div id="sync-animation" class="onboarding-sync" aria-hidden="true"><span></span><span></span><span></span></div><p id="sync-detail" class="onboarding-description">Preparing your task, important date and reminder calendars, then checking upcoming events.</p><div class="onboarding-actions"><button id="sync-back" hidden>Back</button><button id="retry-sync" class="primary" hidden>Retry sync</button><button id="enable-calendar-api" hidden>Enable Calendar API</button></div>
        </section>
        <section class="onboarding-slide" data-slide="ready" aria-labelledby="ready-title" hidden>
          <div class="onboarding-success"><span aria-hidden="true">✓</span><div><strong>Sync completed</strong><p>Your calendars are ready.</p></div></div><span class="onboarding-eyebrow">ALL SET, BOSS</span><h1 id="ready-title" tabindex="-1">Your little butler awaits.</h1><p class="onboarding-lead">MISO is ready to join your desktop.</p><div class="onboarding-summary"><p><span>Google Calendar</span><strong>Connected & synced</strong></p><p><span>AI Assistant</span><strong id="ready-ai">Off · enable anytime</strong></p></div><button id="start-butler" class="primary onboarding-primary" disabled>Start MISO <span aria-hidden="true">→</span></button><button id="ready-back" class="onboarding-text-button">Review my choices</button><p class="onboarding-note">Click the cat to add a reminder or see your calendar. Settings are always a paw away.</p>
        </section>
        <details id="setup-advanced" class="onboarding-advanced" hidden><summary>Connection help & advanced options</summary><details id="developer-config" class="setup-details"><summary>Advanced developer configuration</summary><p id="oauth-mode"></p><p>Use your own Google Desktop OAuth configuration, or restore the default included with this build. Remove connected accounts before switching.</p><form id="developer-form"><label class="field"><span>Desktop OAuth client ID</span><input id="google-client" required></label><label class="field"><span>Client secret</span><input id="google-secret" type="password" autocomplete="off"></label><div class="button-row"><button type="submit">Save configuration</button><button type="button" id="google-help">Google setup help</button><button type="button" id="restore-oauth">Restore default</button></div></form></details><button id="start-scratch" class="danger">Start from scratch</button></details>
      </fieldset>
      <p id="feedback" class="onboarding-feedback" role="status" aria-live="polite"></p>
    </div>
  </main>`;
  const api = window.butler;
  addSiteLinks(root);
  root
    .querySelector(".onboarding-content")!
    .append(root.querySelector(".site-links")!);
  const get = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  let current: Snapshot;
  let busy = false;
  let slide: Slide = "welcome";
  let wantsAI = false;
  let aiDirty = false;
  let initialized = false;
  let seenSetupNotice = 0;
  const ai = bindAI("setup-ai", () => (aiDirty = true));

  function show(next: Slide) {
    slide = next;
    for (const section of Array.from(
      root.querySelectorAll<HTMLElement>("[data-slide]"),
    ))
      section.hidden = section.dataset.slide !== slide;
    const step = {
      welcome: 0,
      google: 1,
      assistant: 2,
      ai: 2,
      sync: 3,
      ready: 4,
    }[slide];
    get("slide-caption").textContent = step
      ? "LET’S GET ACQUAINTED"
      : "A SMALL HELLO";
    get("slide-count").textContent = step ? `Step ${step} of 4` : "Welcome";
    for (const item of Array.from(
      root.querySelectorAll<HTMLElement>("[data-progress]"),
    )) {
      const index = Number(item.dataset.progress);
      item.classList.toggle("current", index === step);
      item.classList.toggle("complete", index < step);
      if (index === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    }
    get<HTMLImageElement>("onboarding-mascot").src =
      `../assets/${assets.mascot[slide === "sync" ? "thinking" : slide === "ready" ? "happy" : "idle"]}`;
    get("setup-advanced").hidden = slide !== "google";
    get("feedback").textContent = "";
    root.querySelector<HTMLElement>(`[data-slide="${slide}"] h1`)?.focus();
    get("onboarding-controls").scrollTop = 0;
  }

  function chooseAI(enabled: boolean) {
    wantsAI = enabled;
    get<HTMLInputElement>("setup-enable-ai").checked = enabled;
    get("ai-choice-yes").setAttribute("aria-pressed", String(enabled));
    get("ai-choice-no").setAttribute("aria-pressed", String(!enabled));
    get("assistant-continue").textContent = enabled
      ? "Set up AI →"
      : "Continue to sync →";
    get("ai-choice-description").textContent = enabled
      ? "Next, choose a provider and test your model. You can also use a local model."
      : "Manual events, your calendar and reminders work without AI. You can enable it later in Settings.";
  }

  function update(s: Snapshot) {
    const lostLastAccount = !!current?.accounts.length && !s.accounts.length;
    current = s;
    if (!initialized) {
      initialized = true;
      chooseAI(s.settings.aiEnabled);
    }
    get<HTMLFieldSetElement>("onboarding-controls").disabled = busy;
    ai.update(s, !aiDirty);
    get("oauth-mode").textContent = s.usingDefaultOAuth
      ? "Using MISO’s default Google sign-in configuration."
      : s.oauthConfigured
        ? "Using your custom Google sign-in configuration."
        : "Google sign-in configuration is required.";
    get("restore-oauth").hidden = !s.defaultOAuthAvailable;
    get("enable-calendar-api").hidden = !s.accounts.some((a) =>
      a.status.includes("Calendar API is disabled"),
    );
    get("setup-accounts").replaceChildren(
      ...s.accounts.map((a) => {
        const row = document.createElement("div");
        row.className = "account-row";
        const copy = document.createElement("span");
        copy.className = "account-copy";
        copy.textContent = `${a.email} · ${a.status}`;
        const remove = document.createElement("button");
        remove.textContent = "Remove account";
        remove.className = "danger";
        remove.onclick = () =>
          void run(async () => {
            if (
              !(await confirmDialog(
                "Remove Google account?",
                `Remove ${a.email} from MISO? Its Google calendars and events will stay intact. ${current.accounts.length === 1 ? "This is your last Google account. MISO will return to the welcome screen and require onboarding again." : "Other accounts remain connected."}`,
                "Remove account",
              ))
            )
              return;
            const result = await api.removeAccount(a.id);
            update(result.snapshot);
            get("feedback").textContent = result.message;
            if (result.snapshot.accounts.length)
              await resultDialog("Google account removed", result.message);
          });
        row.append(copy, remove);
        return row;
      }),
    );
    get("google-connect").textContent = s.accounts.length
      ? "Add another Google account"
      : "Continue with Google";
    get("connected-continue").hidden = !s.accounts.length;
    get("signed-in-account").textContent = s.accounts
      .map((a) => a.email)
      .join(", ");
    if (document.activeElement !== get("google-client"))
      get<HTMLInputElement>("google-client").value = s.settings.googleClientId;
    get<HTMLButtonElement>("start-butler").disabled =
      slide !== "ready" ||
      !s.setupReady ||
      (s.settings.aiEnabled && !s.aiVerified);
    get("ready-ai").textContent =
      s.settings.aiEnabled && s.aiVerified
        ? "On · model verified"
        : "Off · enable anytime";
    if (
      lostLastAccount ||
      (!s.accounts.length && !["welcome", "google"].includes(slide))
    )
      show("welcome");
    if (s.setupNotice && s.setupNotice.id !== seenSetupNotice && !busy) {
      seenSetupNotice = s.setupNotice.id;
      void resultDialog(s.setupNotice.title, s.setupNotice.message);
    }
  }

  async function run(fn: () => Promise<void>) {
    if (busy || !current) return;
    busy = true;
    get<HTMLFieldSetElement>("onboarding-controls").disabled = true;
    try {
      await fn();
    } catch (error) {
      get("feedback").textContent = (error as Error).message;
      await resultDialog("Could not finish", (error as Error).message);
    } finally {
      busy = false;
      update(current);
    }
  }

  async function syncCalendars() {
    show("sync");
    get("sync-animation").hidden = false;
    get("retry-sync").hidden = true;
    get("sync-back").hidden = true;
    get("sync-detail").textContent =
      "Preparing your task, important date and reminder calendars, then checking upcoming events.";
    try {
      update(await api.sync());
      if (!current.setupReady || !current.connected)
        throw new Error(
          "Your Google calendars are not ready yet. Retry sync, or go back to reconnect Google.",
        );
      show("ready");
      update(current);
    } catch (error) {
      get("sync-animation").hidden = true;
      get("retry-sync").hidden = false;
      get("sync-back").hidden = false;
      get("sync-detail").textContent =
        "Sync did not finish. Your Google events are safe. Check your connection and try again.";
      throw error;
    }
  }

  get("start-onboarding").onclick = () =>
    show(current.accounts.length ? "assistant" : "google");
  get("back-welcome").onclick = () => show("welcome");
  get("back-google").onclick = () => show("google");
  get("ready-back").onclick = () => show("assistant");
  get("connected-continue").onclick = () => show("assistant");
  get<HTMLInputElement>("setup-enable-ai").onchange = (e) =>
    chooseAI((e.target as HTMLInputElement).checked);
  get("ai-choice-yes").onclick = () => chooseAI(true);
  get("ai-choice-no").onclick = () => chooseAI(false);
  get("google-connect").onclick = () =>
    void run(async () => {
      if (!current.oauthConfigured) {
        get<HTMLDetailsElement>("setup-advanced").open = true;
        get<HTMLDetailsElement>("developer-config").open = true;
        throw new Error(
          "Google sign-in needs the app developer’s Desktop OAuth configuration. Configure it here or use a configured build.",
        );
      }
      get("feedback").textContent =
        "Complete Google sign-in in your browser. MISO will wait here.";
      update(await api.connect());
      if (!current.accounts.length)
        throw new Error("Google sign-in did not finish. Please try again.");
      show("assistant");
    });
  get("assistant-continue").onclick = () =>
    void run(async () => {
      if (wantsAI) {
        show("ai");
        return;
      }
      update(await api.save({ aiEnabled: false }));
      await syncCalendars();
    });
  get("back-assistant").onclick = () => show("assistant");
  get("setup-ai-form").onsubmit = (e) => {
    e.preventDefault();
    void run(async () => {
      const value = ai.read();
      get("feedback").textContent = "Finding and checking your AI model…";
      update(await api.configureAI(value));
      aiDirty = false;
      ai.clearKey();
      await syncCalendars();
    });
  };
  get("skip-ai").onclick = () =>
    void run(async () => {
      update(await api.save({ aiEnabled: false }));
      chooseAI(false);
      ai.clearKey();
      await syncCalendars();
    });
  get("sync-back").onclick = () =>
    show(current.setupReady ? "assistant" : "google");
  get("retry-sync").onclick = () => void run(syncCalendars);
  get("enable-calendar-api").onclick = () =>
    void api
      .help("google-calendar")
      .catch((e) => resultDialog("Could not open help", e.message));
  get("start-butler").onclick = () =>
    void run(async () => {
      await api.finishSetup();
    });
  get("restore-oauth").onclick = () =>
    void run(async () => {
      if (
        !(await confirmDialog(
          "Restore default Google sign-in?",
          "Replace your custom OAuth configuration with MISO’s default? Remove connected accounts first. Your Google events remain intact.",
          "Restore default",
        ))
      )
        return;
      update(await api.restoreDefaultOAuth());
      get<HTMLInputElement>("google-secret").value = "";
      get("feedback").textContent =
        "Default sign-in restored. Continue with Google.";
      await resultDialog(
        "Google sign-in restored",
        "Default sign-in restored. Continue with Google.",
      );
    });
  get("developer-form").onsubmit = (e) => {
    e.preventDefault();
    void run(async () => {
      update(
        await api.save(
          {
            googleClientId: get<HTMLInputElement>("google-client").value.trim(),
          },
          { clientSecret: get<HTMLInputElement>("google-secret").value.trim() },
        ),
      );
      get<HTMLInputElement>("google-secret").value = "";
      get("feedback").textContent =
        "Configuration saved. Continue with Google to sign in.";
      await resultDialog(
        "Google configuration saved",
        "Continue with Google to sign in. Your configuration stays on this device.",
      );
    });
  };
  get("google-help").onclick = () =>
    void api
      .help("google")
      .catch((e) => resultDialog("Could not open help", e.message));
  get("start-scratch").onclick = () =>
    void run(async () => {
      if (
        !(await confirmDialog(
          "Start MISO from scratch?",
          "Remove all connected accounts, saved AI keys, cached reminders and personal preferences from this device? Your Google calendars and events stay intact. The app’s Google sign-in configuration is kept. Google account permissions are not revoked by this local reset.",
          "Reset MISO",
        ))
      )
        return;
      const result = await api.resetSetup();
      aiDirty = false;
      ai.clearKey();
      update(result.snapshot);
      chooseAI(false);
      show("welcome");
    });
  api.onSnapshot(update);
  void api
    .snapshot()
    .then(update)
    .catch((error: Error) => {
      get("feedback").textContent =
        `Could not load setup. Please restart MISO. ${error.message}`;
    });
  show("welcome");
}
