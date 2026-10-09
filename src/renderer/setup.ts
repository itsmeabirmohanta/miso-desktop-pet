import assets from "../assets/manifest.json";
import type { Snapshot } from "../shared/types";
import { confirmDialog, resultDialog } from "./dialogs";
export function setupWizard(root: HTMLElement) {
  document.body.className = "settings-view";
  root.innerHTML = `<main class="settings-shell"><header class="header"><img src="../assets/${assets.branding.logo}" alt="MISO"><div><h1>First, connect Google.</h1><p>MISO - Your Little Butler</p><p>Sign in or create a Google account to connect your calendars.</p></div></header><section class="card"><h2>Your Google accounts</h2><p>Google opens in your browser to ask for calendar permissions. You can connect several accounts. AI is optional and can be enabled later in Settings.</p><div id="setup-accounts"></div><div class="button-row"><button id="enable-calendar-api" hidden>Enable Calendar API</button><button id="retry-sync">Retry sync</button></div><button id="google-connect" class="primary">Continue with Google</button><details id="developer-config" class="setup-details"><summary>Advanced developer configuration</summary><p id="oauth-mode"></p><p>Use your own Google Desktop OAuth configuration, or restore the default configuration included with this build. Remove connected accounts before switching.</p><form id="developer-form"><label class="field"><span>Desktop OAuth client ID</span><input id="google-client" required></label><label class="field"><span>Client secret</span><input id="google-secret" type="password" autocomplete="off"></label><div class="button-row"><button type="submit">Save configuration</button><button type="button" id="google-help">Google setup help</button><button type="button" id="restore-oauth">Restore default</button></div></form></details></section><p id="feedback" class="feedback" role="status"></p><div class="button-row"><button id="start-butler" class="primary" disabled>Start MISO</button><button id="start-scratch" class="danger">Start from scratch</button></div></main>`;
  const api = window.butler;
  const get = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  let current: Snapshot;
  let busy = false;
  function update(s: Snapshot) {
    current = s;
    get("oauth-mode").textContent = s.usingDefaultOAuth
      ? "Using MISO's default Google sign-in configuration."
      : s.oauthConfigured
        ? "Using your custom Google sign-in configuration."
        : "Google sign-in configuration is required.";
    get("restore-oauth").hidden = !s.defaultOAuthAvailable;
    get("enable-calendar-api").hidden = !s.accounts.some((a) =>
      a.status.includes("Calendar API is disabled"),
    );
    get("setup-accounts").replaceChildren(
      ...s.accounts.map((a) => {
        const p = document.createElement("div");
        p.className = "account-row";
        p.textContent = `${a.email} · ${a.status}`;
        const copy = document.createElement("span");
        copy.className = "account-copy";
        copy.textContent = p.textContent;
        p.replaceChildren(copy);
        const remove = document.createElement("button");
        remove.textContent = "Remove account";
        remove.className = "danger";
        remove.disabled = busy;
        remove.onclick = () =>
          void run(async () => {
            if (
              !(await confirmDialog(
                "Remove Google account?",
                `Remove ${a.email} from MISO? Its Google calendars and events will stay intact. Other accounts remain connected.`,
                "Remove account",
              ))
            ) {
              get("feedback").textContent = "Account removal cancelled.";
              return;
            }
            const result = await api.removeAccount(a.id);
            update(result.snapshot);
            get("feedback").textContent = result.message;
            await resultDialog("Account removed", result.message);
          });
        p.append(remove);
        return p;
      }),
    );
    get("google-connect").textContent = s.accounts.length
      ? "Add another Google account"
      : "Continue with Google";
    get<HTMLInputElement>("google-client").value = s.settings.googleClientId;
    get<HTMLButtonElement>("start-butler").disabled = busy || !s.setupReady;
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    busy = true;
    root
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((b) => (b.disabled = true));
    get("feedback").textContent = "Working…";
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
      if (current) update(current);
    }
  }
  get("google-connect").onclick = () =>
    void run(async () => {
      if (!current.oauthConfigured) {
        get<HTMLDetailsElement>("developer-config").open = true;
        throw new Error(
          "Google sign-in needs the app developer’s Desktop OAuth configuration. Configure it here or use a configured build.",
        );
      }
      update(await api.connect());
      get("feedback").textContent = current.status;
      await resultDialog("Google account connected", current.status);
    });
  get("restore-oauth").onclick = () =>
    void run(async () => {
      if (
        !(await confirmDialog(
          "Restore default Google sign-in?",
          "Replace your custom OAuth configuration with MISO's default? Remove connected accounts first. Your Google events remain intact.",
          "Restore default",
        ))
      )
        return;
      update(await api.restoreDefaultOAuth());
      get<HTMLInputElement>("google-secret").value = "";
      await resultDialog(
        "Default restored",
        "MISO's default Google sign-in is ready. Continue with Google to reconnect.",
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
      await resultDialog("Configuration saved", get("feedback").textContent!);
    });
  };
  get("start-scratch").onclick = () =>
    void run(async () => {
      if (
        !(await confirmDialog(
          "Start MISO from scratch?",
          "Remove all connected accounts, saved AI keys, cached reminders and personal preferences from this device? Your Google calendars and events will stay intact. The app?s Google sign-in configuration is kept so you can reconnect. Google account permissions are not revoked by this local reset.",
          "Reset MISO",
        ))
      ) {
        get("feedback").textContent = "Reset cancelled. Nothing was cleared.";
        return;
      }
      const result = await api.resetSetup();
      update(result.snapshot);
      get("feedback").textContent = result.message;
      await resultDialog("MISO reset", result.message);
    });
  get("enable-calendar-api").onclick = () => void api.help("google-calendar");
  get("retry-sync").onclick = () =>
    void run(async () => {
      update(await api.sync());
      get("feedback").textContent = current.status;
      await resultDialog("Sync complete", current.status);
    });
  get("google-help").onclick = () => void api.help("google");
  get("start-butler").onclick = () =>
    void run(async () => {
      await api.finishSetup();
    });
  api.onSnapshot(update);
  void api.snapshot().then(update);
}
