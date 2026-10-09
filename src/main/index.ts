import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  nativeImage,
  Notification,
  powerMonitor,
  screen,
  shell,
  globalShortcut,
  dialog,
} from "electron";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import assets from "../assets/manifest.json";
import { APP_NAME, APP_FULL_NAME } from "../shared/brand";
import { z } from "zod";
import { SettingsStore } from "./settings/store";
import { makeAuth, connectGoogle } from "./calendar/auth";
import { GoogleCalendarProvider } from "./calendar/google";
import { InputService, AICredentialError } from "./nlu/input";
import { aiConfig, aiSecretName, normalizeBaseUrl } from "../shared/ai";
import { CommandController } from "./controller";
import { mapLimited } from "./sync/concurrency";
import { SyncService } from "./sync/sync";
import { ReminderEngine, eventStart } from "./sync/reminders";
import { statusCode, calendarErrorMessage } from "./calendar/provider";
import type { CalendarInfo, Reminder, Reply, Snapshot } from "../shared/types";
import { hotkeyPattern } from "../shared/hotkey";
import { petPlacement } from "../shared/pet-layout";
import { setStartAtLogin } from "./settings/login";
import {
  AccountCalendarProvider,
  scopedCalendar,
  unpackCalendar,
} from "./calendar/accounts";
import { ManualCalendarService } from "./calendar/manual";
import { loadOAuthConfig, defaultOAuthConfig } from "./calendar/oauth-config";
import type { CalendarProvider } from "./calendar/provider";
import type { GoogleAccount } from "../shared/types";
declare const __BUTLER_RELEASE__: boolean;
const isSmoke = !__BUTLER_RELEASE__ && process.argv.includes("--smoke-test");
// A standard explicit profile override also permits isolated release verification.
const profileDirectory = app.commandLine.getSwitchValue("user-data-dir");
const profilePath = profileDirectory
  ? resolve(profileDirectory)
  : join(app.getPath("appData"), "butler-desktop");
let startupPhase = "profile initialization";
let reportingStartupFailure = false;
function startupFailure(error: unknown) {
  if (reportingStartupFailure) return;
  reportingStartupFailure = true;
  const rawCode = (error as { code?: unknown })?.code;
  const code =
    typeof rawCode === "string" && /^[A-Z0-9_-]{1,40}$/.test(rawCode)
      ? rawCode
      : "STARTUP_FAILED";
  try {
    writeFileSync(
      join(profilePath, "startup-status.json"),
      JSON.stringify(
        {
          version: app.getVersion(),
          platform: process.platform,
          architecture: process.arch,
          phase: startupPhase,
          code,
        },
        null,
        2,
      ),
    );
  } catch {}
  dialog.showErrorBox(
    "MISO could not start",
    `MISO stopped during ${startupPhase}. Support code: ${code}.\n\nTry the MISO (Safe Mode) shortcut if the window is blank or closes. Check Windows security notifications for a blocked application. If the problem continues, share startup-status.json from %APPDATA%\\butler-desktop. It contains only startup diagnostics, not your keys or calendar data.\n\nYour saved data has not been reset. Encrypted data copied from another Windows account or laptop cannot be unlocked here; reconnect using a fresh profile instead.`,
  );
  app.exit(1);
}
process.on("uncaughtException", startupFailure);
if (process.argv.includes("--safe-mode")) app.disableHardwareAcceleration();
try {
  mkdirSync(profilePath, { recursive: true });
} catch (error) {
  startupFailure(error);
}
// Keep the original profile and encryption context across the branding change.
app.setPath("userData", profilePath);
app.setName(APP_NAME);
if (!__BUTLER_RELEASE__ && isSmoke)
  app.setPath(
    "userData",
    join(app.getPath("temp"), `butler-smoke-${process.pid}`),
  );
let pet: BrowserWindow;
let settingsWindow: BrowserWindow | undefined;
let setupWindow: BrowserWindow | undefined;
let tray: Tray;
let store: SettingsStore;
let registeredHotkey = "";
let workflowHome: { x: number; y: number } | undefined;
let petDragging = false;
let petAnchor = { x: 0, y: 0 };
let petLayout: import("../shared/types").PetLayout = {
  x: 135,
  y: 320,
  above: true,
};
let accountGeneration = 0;
let testingAI = false;
let calendarWriting = false;
let lastCalendarRefresh = 0;
let syncQueue: Promise<void> = Promise.resolve();
let backgroundSync = false;
let ignoredMouse: boolean | undefined;
let provider: AccountCalendarProvider | undefined;
const syncServices = new Map<string, SyncService>();
const rawProviders = new Map<string, CalendarProvider>();
let calendars: CalendarInfo[] = [];
let engine: ReminderEngine;
let controller: CommandController;
let status = "Connect Google Calendar to get started.";
let poll: ReturnType<typeof setInterval> | undefined;
let cursorPoll: ReturnType<typeof setInterval> | undefined;
let connecting = false;
let quitting = false;
const patchSchema = z
  .object({
    hotkey: z
      .string()
      .max(100)
      .refine(
        (v) => v === "" || hotkeyPattern.test(v),
        "Use modifier keys plus a letter, number, Space or function key.",
      ),
    googleClientId: z.string().max(500),
    model: z.string().trim().min(1).max(100),
    selectedCalendars: z.array(z.string().max(500)).max(100),
    aiProvider: z.enum([
      "anthropic",
      "openai",
      "gemini",
      "compatible",
      "ollama",
    ]),
    aiBaseUrl: z.string().max(1000),
    aiKeyRequired: z.boolean(),
    aiEnabled: z.boolean(),
    defaultAccountId: z.string().max(300),
    meetingLead: z.number().int().min(0).max(40320),
    pollMinutes: z.number().int().min(2).max(5),
    sound: z.boolean(),
    startAtLogin: z.boolean(),
    skin: z.enum(["ginger", "midnight"]),
    quietStart: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/),
    quietEnd: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/),
    paused: z.boolean(),
  })
  .partial()
  .strict();
const secretSchema = z
  .object({
    apiKey: z.string().max(1000).optional(),
    clientSecret: z.string().max(1000).optional(),
  })
  .strict();
function aiKey(): string | undefined {
  const config = aiConfig(store.settings);
  if (!config.baseUrl) return undefined;
  return (
    store.secret(aiSecretName(config)) ??
    (config.provider === "anthropic" &&
    normalizeBaseUrl(config.baseUrl) === "https://api.anthropic.com/v1"
      ? store.secret("anthropicKey")
      : undefined)
  );
}
function fingerprint(): string {
  try {
    const config = aiConfig(store.settings);
    if (!config.model || (config.keyRequired && !aiKey())) return "";
    return createHash("sha256")
      .update(
        JSON.stringify({
          ...config,
          baseUrl: normalizeBaseUrl(config.baseUrl),
          key: aiKey() ?? "",
        }),
      )
      .digest("hex");
  } catch {
    return "";
  }
}
function aiVerified() {
  const value = fingerprint();
  return !!value && store.settings.aiValidationFingerprint === value;
}
function setupReady() {
  return store.settings.accounts.some(
    (a) =>
      !!store.secret(`googleRefreshToken:${a.id}`) &&
      ["task", "date", "reminder"].every(
        (c) => !!a.petCalendars[c as "task" | "date" | "reminder"],
      ),
  );
}
function agendaEvents() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = Date.now();
  const today = new Date(now).setHours(0, 0, 0, 0);
  return store.cache
    .map((event) => ({ event, start: eventStart(event, zone) }))
    .filter((item) => item.start >= today && item.start < now + 7 * 86400000)
    .sort((a, b) => a.start - b.start)
    .slice(0, 100)
    .map((item) => item.event);
}
function snapshot(): Snapshot {
  const defaultClient = defaultOAuthConfig().clientId;
  const usingDefaultOAuth =
    !!defaultClient && store.settings.googleClientId === defaultClient;
  return {
    panelOpen: panelsVisible(),
    petLayout,
    settings: {
      ...store.settings,
      googleClientId: usingDefaultOAuth ? "" : store.settings.googleClientId,
    },
    usingDefaultOAuth,
    defaultOAuthAvailable: defaultClient.endsWith(
      ".apps.googleusercontent.com",
    ),
    connected: !!provider
      ?.statuses(store.settings.accounts)
      .some((a) => a.connected),
    accounts:
      provider?.statuses(store.settings.accounts) ??
      store.settings.accounts.map((a) => ({
        ...a,
        connected: false,
        status: "Not connected",
      })),
    oauthConfigured: store.settings.googleClientId.endsWith(
      ".apps.googleusercontent.com",
    ),
    hasApiKey: !!aiKey(),
    hasClientSecret: !!store.secret("googleClientSecret"),
    aiVerified: aiVerified(),
    setupReady: setupReady(),
    calendars,
    upcoming: agendaEvents(),
    status,
  };
}
function publish() {
  const value = snapshot();
  for (const w of [pet, settingsWindow, setupWindow])
    if (w && !w.isDestroyed()) w.webContents.send("snapshot-changed", value);
}
function panelsVisible() {
  return !!(
    (settingsWindow &&
      !settingsWindow.isDestroyed() &&
      settingsWindow.isVisible()) ||
    (setupWindow && !setupWindow.isDestroyed() && setupWindow.isVisible())
  );
}
function closePetPopup() {
  if (workflowHome) {
    const home = workflowHome;
    workflowHome = undefined;
    pet.setSize(380, 440);
    placePet(home.x, home.y);
  }
  pet?.webContents.send("close-popup");
}
function reply(value: Reply) {
  if (pet && !pet.isDestroyed()) {
    if (!panelsVisible()) pet.showInactive();
    pet.webContents.send("reply", value);
  }
}
function selected() {
  const settings = store.settings;
  const ids = new Set([
    ...settings.selectedCalendars,
    ...settings.accounts.flatMap((a) => Object.values(a.petCalendars)),
  ]);
  return calendars.filter((c) => ids.has(c.id));
}
function sync(force = false): Promise<void> {
  const next = syncQueue.then(() => performSync(force));
  syncQueue = next.catch(() => {});
  return next;
}
async function performSync(force = false) {
  if (!provider || !store.settings.accounts.length) return;
  if (
    force ||
    !calendars.length ||
    Date.now() - lastCalendarRefresh > 15 * 60000 ||
    provider.statuses(store.settings.accounts).some((a) => !a.connected)
  ) {
    const generation = accountGeneration;
    const refreshed = await provider.listCalendars();
    if (generation !== accountGeneration) return;
    lastCalendarRefresh = Date.now();
    const freshAccounts = new Set(refreshed.map((c) => c.accountId));
    calendars = [
      ...refreshed,
      ...calendars.filter((c) => !freshAccounts.has(c.accountId)),
    ];
  }
  let failed = 0;
  const merged = store.cache.slice();
  await mapLimited(store.settings.accounts, 2, async (account) => {
    if (!provider!.statuses([account])[0].connected) {
      failed++;
      return;
    }
    let service = syncServices.get(account.id);
    if (!service) {
      service = new SyncService(
        provider!,
        merged.filter(
          (e) => unpackCalendar(e.calendarId).accountId === account.id,
        ),
        () => {},
      );
      syncServices.set(account.id, service);
    }
    try {
      const events = await service.run(
        selected().filter((c) => c.accountId === account.id),
        force,
      );
      if (syncServices.get(account.id) !== service) return;
      for (let i = merged.length - 1; i >= 0; i--)
        if (unpackCalendar(merged[i].calendarId).accountId === account.id)
          merged.splice(i, 1);
      merged.push(...events);
    } catch {
      failed++;
    }
  });
  const enabledIds = new Set([
    ...store.settings.selectedCalendars,
    ...store.settings.accounts.flatMap((a) => Object.values(a.petCalendars)),
  ]);
  store.cache = merged.filter((e) => enabledIds.has(e.calendarId));
  engine.rebuild(store.cache);
  status = failed
    ? `${failed} account(s) could not sync. Cached reminders remain available. Check each account status for the cause.`
    : `All accounts synced at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  publish();
  if (failed) throw new Error(status);
}
function polling() {
  if (poll) clearInterval(poll);
  poll = setInterval(() => {
    if (backgroundSync) return;
    backgroundSync = true;
    void initializeGoogle(false)
      .catch(() => {})
      .finally(() => (backgroundSync = false));
  }, store.settings.pollMinutes * 60000);
}
async function initializeGoogle(force = true) {
  if (!provider) return;
  const generation = accountGeneration;
  let accounts = store.settings.accounts;
  for (const account of accounts) {
    let raw = rawProviders.get(account.id);
    if (!raw) {
      raw = new GoogleCalendarProvider(makeAuth(store, account.id));
      rawProviders.set(account.id, raw);
      provider.add(account.id, account.email, raw);
    }
    const petCalendars = { ...account.petCalendars };
    let email = account.email;
    if (account.id === "legacy" && email === "Saved Google account") {
      try {
        email = (await raw.listCalendars()).find((c) => c.primary)?.id ?? email;
        provider.add(account.id, email, raw);
      } catch {}
    }
    for (const category of ["task", "date", "reminder"] as const)
      if (!petCalendars[category]) {
        try {
          petCalendars[category] = scopedCalendar(
            account.id,
            await raw.ensureCalendar(
              category,
              Intl.DateTimeFormat().resolvedOptions().timeZone,
            ),
          );
        } catch {
          break;
        }
      }
    if (generation !== accountGeneration) return;
    accounts = accounts.map((a) =>
      a.id === account.id ? { ...a, email, petCalendars } : a,
    );
    store.save({ accounts });
  }
  const target =
    accounts.find((a) => a.id === store.settings.defaultAccountId) ??
    accounts[0];
  if (target)
    store.save({
      defaultAccountId: target.id,
      petCalendars: target.petCalendars,
    });
  await sync(force);
}
function deliver(reminder: Reminder) {
  reply({
    text: `${reminder.missed ? "Missed reminder" : "Time for"}: ${reminder.title}`,
    state: "alert",
    reminder,
  });
  if (Notification.isSupported())
    new Notification({
      title: "MISO",
      body: `${reminder.missed ? "Missed: " : ""}${reminder.title}`,
      silent: !store.settings.sound,
    }).show();
}
function openSettings() {
  closePetPopup();
  if (setupWindow && !setupWindow.isDestroyed() && setupWindow.isVisible()) {
    if (!setupReady()) {
      setupWindow.focus();
      publish();
      return;
    }
    setupWindow.close();
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    publish();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 860,
    height: 800,
    minWidth: 660,
    minHeight: 600,
    title: `${APP_FULL_NAME} · Settings`,
    backgroundColor: "#f8f6f1",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !__BUTLER_RELEASE__,
    },
  });
  secureWindow(settingsWindow);
  const openingWindow = settingsWindow;
  openingWindow.once("ready-to-show", () => {
    if (openingWindow.isDestroyed() || isSmoke) return;
    openingWindow.show();
    openingWindow.focus();
    publish();
  });
  void settingsWindow.loadFile(join(__dirname, "../renderer/index.html"), {
    query: { view: "settings" },
  });
  settingsWindow.on("show", () => {
    closePetPopup();
    publish();
  });
  settingsWindow.on("hide", publish);
  settingsWindow.on("closed", () => {
    settingsWindow = undefined;
    publish();
  });
  publish();
}
function openSetup() {
  closePetPopup();
  pet?.hide();
  engine?.stop();
  settingsWindow?.hide();
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.show();
    setupWindow.focus();
    publish();
    return;
  }
  setupWindow = new BrowserWindow({
    width: 670,
    height: Math.min(900, screen.getPrimaryDisplay().workArea.height - 40),
    minWidth: 580,
    minHeight: 600,
    resizable: true,
    title: "Set up MISO",
    backgroundColor: "#f8f6f1",
    autoHideMenuBar: true,
    show: !isSmoke,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !__BUTLER_RELEASE__,
    },
  });
  secureWindow(setupWindow);
  void setupWindow.loadFile(join(__dirname, "../renderer/index.html"), {
    query: { view: "setup" },
  });
  setupWindow.on("show", () => {
    closePetPopup();
    publish();
  });
  setupWindow.on("hide", publish);
  publish();
  setupWindow.on("closed", () => {
    setupWindow = undefined;
    publish();
    if (!setupReady() && !quitting) app.quit();
  });
}
function setHotkey(value: string) {
  if (value === registeredHotkey) return;
  if (value && !isSmoke) {
    let registered = false;
    try {
      registered = globalShortcut.register(value, openQuickAdd);
    } catch {}
    if (!registered)
      throw new Error(
        "This hotkey is unavailable or already in use. Choose another combination. Your previous hotkey was kept.",
      );
  }
  if (registeredHotkey && !isSmoke) globalShortcut.unregister(registeredHotkey);
  registeredHotkey = value;
}
function ignoreMouse(value: boolean) {
  if (ignoredMouse === value) return;
  ignoredMouse = value;
  pet.setIgnoreMouseEvents(value, { forward: true });
}
function openQuickAdd() {
  if (panelsVisible()) {
    const panel = setupWindow?.isVisible() ? setupWindow : settingsWindow;
    panel?.focus();
    return;
  }
  if (!setupReady()) {
    openSetup();
    return;
  }
  pet.show();
  pet.focus();
  ignoreMouse(false);
  pet.webContents.send("quick-add");
}
function showPet() {
  if (!setupReady()) {
    openSetup();
    return;
  }
  pet.showInactive();
  engine.start();
  engine.rebuild(store.cache);
  trayMenu();
}
function secureWindow(window: BrowserWindow) {
  window.webContents.on("render-process-gone", () => {
    if (!quitting) {
      startupPhase = "window rendering";
      startupFailure({ code: "RENDERER_FAILED" });
    }
  });
  window.webContents.on(
    "did-fail-load",
    (_event, _code, _description, _url, mainFrame) => {
      if (mainFrame && !quitting) {
        startupPhase = "window loading";
        startupFailure({ code: "WINDOW_LOAD_FAILED" });
      }
    },
  );
  window.setIcon(join(__dirname, "../assets/branding/icon.png"));
  window.on("page-title-updated", (event) => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) =>
    event.preventDefault(),
  );
}
function trayMenu() {
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: pet.isVisible() ? "Hide MISO" : "Show MISO",
        click: () => {
          pet.isVisible() ? pet.hide() : showPet();
          trayMenu();
        },
      },
      { label: "Setup / credentials", click: openSetup },
      { label: "Settings", click: openSettings },
      {
        label: "Pause reminders",
        type: "checkbox",
        checked: store.settings.paused,
        click: (item) => {
          store.save({ paused: item.checked });
          engine.tick();
          publish();
        },
      },
      { type: "separator" },
      { label: "Quit MISO", click: () => app.quit() },
    ]),
  );
}
function placePet(x: number, y: number) {
  const area = screen.getDisplayNearestPoint({
    x: Math.round(x),
    y: Math.round(y),
  }).workArea;
  const placed = petPlacement(x, y, area);
  petAnchor = placed.anchor;
  petLayout = placed.layout;
  if (pet && !pet.isDestroyed()) {
    pet.setPosition(placed.window.x, placed.window.y);
    pet.webContents.send("pet-layout", petLayout);
  }
  return placed.window;
}
function errorMessage(error: unknown): string {
  if (statusCode(error) === 412)
    return "The event changed on Google. Please enter the command again.";
  if (statusCode(error) === 401 || String(error).includes("invalid_grant"))
    return "Google access expired. Reconnect in Settings.";
  if (statusCode(error) === 403) return calendarErrorMessage(error);
  if (statusCode(error) === 429)
    return "Google is rate limited. Wait a moment and retry.";
  // Never surface remote request objects, headers, tokens or credential-bearing URLs.
  if (
    error instanceof Error &&
    !statusCode(error) &&
    !/https?:|request|fetch failed|ECONN|ENOTFOUND/i.test(error.message)
  )
    return error.message.slice(0, 600);
  return "The service could not complete this action. Nothing is queued. Check your calendar before retrying a write.";
}
function handle(channel: string, fn: (...args: any[]) => any) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const trusted = [pet, settingsWindow, setupWindow].some(
        (window) =>
          window &&
          !window.isDestroyed() &&
          window.webContents === event.sender,
      );
      if (
        !trusted ||
        event.sender.isDestroyed() ||
        event.senderFrame !== event.sender.mainFrame
      )
        return { ok: false, error: "Untrusted caller." };
      return { ok: true, value: await fn(...args) };
    } catch (error) {
      if (error instanceof AICredentialError) {
        store.save({ aiValidationFingerprint: "" });
        openSettings();
        publish();
      }
      return { ok: false, error: errorMessage(error) };
    }
  });
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (store) showPet();
  });
  app
    .whenReady()
    .then(async () => {
      startupPhase = "secure local storage";
      store = new SettingsStore();
      if (!isSmoke) loadOAuthConfig(store);
      if (
        !store.settings.accounts.length &&
        store.secret("googleRefreshToken")
      ) {
        const id = "legacy";
        store.setSecret(
          `googleRefreshToken:${id}`,
          store.secret("googleRefreshToken")!,
        );
        const petCalendars = Object.fromEntries(
          Object.entries(store.settings.petCalendars).map(([category, raw]) => [
            category,
            scopedCalendar(id, raw!),
          ]),
        );
        store.save({
          accounts: [{ id, email: "Saved Google account", petCalendars }],
          defaultAccountId: id,
          petCalendars,
          selectedCalendars: store.settings.selectedCalendars.map((raw) =>
            scopedCalendar(id, raw),
          ),
        });
        store.cache = store.cache.map((e) => ({
          ...e,
          calendarId: scopedCalendar(id, e.calendarId),
        }));
        store.setSecret("googleRefreshToken", "");
      }
      startupPhase = "desktop initialization";
      provider = new AccountCalendarProvider(
        () => store.settings.defaultAccountId,
      );
      const area = screen.getPrimaryDisplay().workArea;
      const position = store.settings.position ?? {
        x: area.x + area.width - 400,
        y: area.y + area.height - 460,
      };
      pet = new BrowserWindow({
        width: 380,
        height: 440,
        ...placePet(position.x, position.y),
        transparent: true,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        show: false,
        webPreferences: {
          preload: join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          devTools: !__BUTLER_RELEASE__,
        },
      });
      secureWindow(pet);
      pet.setAlwaysOnTop(true, "floating");
      pet.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      ignoreMouse(true);
      void pet.loadFile(join(__dirname, "../renderer/index.html"));
      pet.on("show", () => pet.webContents.send("pet-visible", true));
      pet.on("hide", () => pet.webContents.send("pet-visible", false));
      pet.webContents.on("did-finish-load", () =>
        pet.webContents.send("pet-visible", pet.isVisible()),
      );
      pet.on("close", (event) => {
        if (!quitting) {
          event.preventDefault();
          pet.hide();
          trayMenu();
        }
      });
      let hitRegions: {
        x: number;
        y: number;
        width: number;
        height: number;
      }[] = [];
      const regionSchema = z
        .array(
          z.object({
            x: z.number().min(0).max(380),
            y: z.number().min(0).max(600),
            width: z.number().min(0).max(380),
            height: z.number().min(0).max(600),
          }),
        )
        .max(4);
      ipcMain.on("regions", (event, value) => {
        if (event.sender.id !== pet.webContents.id) return;
        const parsed = regionSchema.safeParse(value);
        if (parsed.success) hitRegions = parsed.data;
      });
      // Global cursor sampling also works where ignored windows do not forward mouse movement (notably Linux).
      let cursorDelay = 80;
      const sampleCursor = () => {
        if (pet.isDestroyed()) return;
        if (!pet.isVisible() || petDragging) {
          cursorDelay = 250;
        } else {
          const point = screen.getCursorScreenPoint();
          const [x, y] = pet.getPosition();
          const inside = hitRegions.some(
            (r) =>
              point.x >= x + r.x &&
              point.x <= x + r.x + r.width &&
              point.y >= y + r.y &&
              point.y <= y + r.y + r.height,
          );
          ignoreMouse(!inside);
          const nearby =
            point.x >= x - 100 &&
            point.x <= x + 480 &&
            point.y >= y - 100 &&
            point.y <= y + pet.getBounds().height + 100;
          cursorDelay = nearby ? 80 : 200;
        }
        cursorPoll = setTimeout(sampleCursor, cursorDelay);
      };
      cursorPoll = setTimeout(sampleCursor, cursorDelay);
      let positionTimer: ReturnType<typeof setTimeout> | undefined;
      pet.on("move", () => {
        if (positionTimer) clearTimeout(positionTimer);
        positionTimer = setTimeout(() => {
          if (!pet.isDestroyed() && !workflowHome) {
            store.save({ position: petAnchor });
          }
        }, 150);
      });
      const image = nativeImage.createFromPath(
        join(__dirname, "../assets", assets.branding.tray),
      );
      try {
        setHotkey(store.settings.hotkey);
      } catch {
        status =
          "Saved hotkey is unavailable. Click the cat or choose another hotkey in Settings.";
      }
      tray = new Tray(image);
      tray.setToolTip(APP_FULL_NAME);
      tray.on("click", showPet);
      trayMenu();
      engine = new ReminderEngine(
        () => ({
          ...store.settings,
          paused: store.settings.paused || !setupReady() || !!setupWindow,
        }),
        store.fired,
        (value) => {
          store.fired = value;
        },
        deliver,
      );
      const input = new InputService(
        aiKey,
        () => store.settings.model,
        fetch,
        () => aiConfig(store.settings),
      );
      controller = new CommandController(
        () => provider,
        input,
        store,
        selected,
        () => sync(true),
      );
      const manual = new ManualCalendarService(
        () => provider!,
        store,
        () => calendars,
        () => sync(true),
      );
      handle("begin-quick", () => {
        if (panelsVisible()) return false;
        if (workflowHome) return true;
        workflowHome = { ...petAnchor };
        const area = screen.getDisplayNearestPoint(petAnchor).workArea;
        petLayout = { x: 135, y: 440, above: true, centered: true };
        pet.setSize(380, 600);
        pet.setPosition(
          Math.round(area.x + (area.width - 380) / 2),
          Math.round(
            Math.max(
              area.y,
              Math.min(
                area.y + area.height - 600,
                area.y + area.height / 2 - 210,
              ),
            ),
          ),
        );
        pet.webContents.send("pet-layout", petLayout);
        pet.focus();
        ignoreMouse(false);
        return true;
      });
      handle("end-quick", () => {
        if (!workflowHome) return;
        const home = workflowHome;
        workflowHome = undefined;
        pet.setSize(380, 440);
        placePet(home.x, home.y);
      });
      handle("snapshot", snapshot);
      handle("settings", openSettings);
      handle("restore-default-oauth", () => {
        if (connecting || calendarWriting || controller.isBusy || testingAI)
          throw new Error(
            "Finish the current operation before changing Google configuration.",
          );
        if (store.settings.accounts.length)
          throw new Error(
            "Remove connected accounts before switching Google configuration. Your Google events will remain intact.",
          );
        const config = defaultOAuthConfig();
        if (!config.clientId.endsWith(".apps.googleusercontent.com"))
          throw new Error(
            "This build does not include a default Google configuration.",
          );
        store.setSecret("googleClientSecret", config.clientSecret);
        store.save({ googleClientId: config.clientId });
        publish();
        return snapshot();
      });
      handle("help", async (topic: unknown, p: unknown) => {
        const choice = z.enum(["google", "google-calendar", "ai"]).parse(topic);
        const which = z
          .enum(["anthropic", "openai", "gemini", "compatible", "ollama"])
          .parse(p ?? store.settings.aiProvider);
        const urls = {
          anthropic: "https://console.anthropic.com/",
          gemini: "https://aistudio.google.com/apikey",
          openai: "https://platform.openai.com/api-keys",
          ollama: "https://ollama.com/",
          compatible:
            "https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create",
        };
        if (choice === "google-calendar") {
          const project = /^(\d+)-/.exec(store.settings.googleClientId)?.[1];
          await shell.openExternal(
            "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" +
              (project ? `?project=${project}` : ""),
          );
          return;
        }
        await shell.openExternal(
          choice === "google"
            ? "https://console.cloud.google.com/apis/credentials"
            : urls[which],
        );
      });
      handle("test-ai", async () => {
        if (testingAI || controller.isBusy)
          throw new Error("Wait for your current AI request to finish.");
        testingAI = true;
        try {
          const before = fingerprint();
          if (!before)
            throw new AICredentialError(
              "Enter your model, API URL and required API key first.",
            );
          await input.parse("Remind me to drink water tomorrow at 9am");
          if (before !== fingerprint())
            throw new Error(
              "AI settings changed during the test. Test the new configuration again.",
            );
          store.save({ aiValidationFingerprint: before });
          publish();
          return snapshot();
        } finally {
          testingAI = false;
        }
      });
      handle("finish-setup", () => {
        if (!setupReady())
          throw new Error("Connect Google Calendar first. AI is optional.");
        setTimeout(() => {
          setupWindow?.close();
          setupWindow = undefined;
          showPet();
          publish();
        }, 30);
        return snapshot();
      });
      handle("command", (value: unknown) => {
        if (calendarWriting)
          throw new Error("Finish the calendar change first.");
        if (!store.settings.aiEnabled)
          throw new Error(
            "AI is optional and currently off. Use Add task / date in the calendar dashboard, or enable AI in Settings.",
          );
        if (!aiVerified())
          throw new Error(
            "Configure and test your AI model in Settings first. Calendars work without AI.",
          );
        if (!setupReady() && !isSmoke) {
          openSetup();
          throw new Error("Connect Google Calendar first.");
        }
        if (connecting)
          throw new Error("Finish Google sign-in before issuing commands.");
        return controller.command(
          z.string().trim().min(1).max(2000).parse(value),
        );
      });
      handle("choose", (id: unknown) => {
        if (calendarWriting || !store.settings.aiEnabled)
          throw new Error("This AI action is unavailable.");
        if (connecting)
          throw new Error("Finish Google sign-in before issuing commands.");
        return controller.choose(z.string().max(30).parse(id));
      });
      handle("sync", async () => {
        if (isSmoke) await sync(true);
        else await initializeGoogle();
        return snapshot();
      });
      handle("save", async (patch: unknown, secrets: unknown) => {
        const parsed = patchSchema.parse(patch);
        const sensitive = secretSchema.parse(secrets ?? {});
        if (connecting)
          throw new Error("Finish Google sign-in before changing settings.");
        if (controller.isBusy || calendarWriting)
          throw new Error(
            "Finish your current command before changing settings.",
          );
        if (testingAI)
          throw new Error("Wait for the model connection test to finish.");
        if (
          parsed.googleClientId !== undefined &&
          parsed.googleClientId !== store.settings.googleClientId &&
          store.settings.accounts.length
        )
          throw new Error(
            "Remove connected accounts before changing the app’s OAuth client ID.",
          );
        if (
          parsed.defaultAccountId !== undefined &&
          !store.settings.accounts.some((a) => a.id === parsed.defaultAccountId)
        )
          throw new Error("Choose one of your connected accounts.");
        const nextConfig = aiConfig({ ...store.settings, ...parsed });
        if (
          (parsed.aiEnabled ?? store.settings.aiEnabled) &&
          nextConfig.baseUrl
        )
          normalizeBaseUrl(nextConfig.baseUrl);
        if (sensitive.apiKey !== undefined)
          store.setSecret(aiSecretName(nextConfig), sensitive.apiKey.trim());
        if (sensitive.clientSecret !== undefined)
          store.setSecret("googleClientSecret", sensitive.clientSecret.trim());
        else if (
          parsed.googleClientId !== undefined &&
          parsed.googleClientId !== store.settings.googleClientId
        )
          store.setSecret("googleClientSecret", "");
        if (
          parsed.startAtLogin !== undefined &&
          parsed.startAtLogin !== store.settings.startAtLogin
        )
          await setStartAtLogin(parsed.startAtLogin);
        if (parsed.hotkey !== undefined) setHotkey(parsed.hotkey);
        store.save(parsed);
        if (parsed.aiEnabled === false || parsed.defaultAccountId)
          controller.clear();
        polling();
        trayMenu();
        if (parsed.defaultAccountId)
          store.save({
            petCalendars: store.settings.accounts.find(
              (a) => a.id === parsed.defaultAccountId,
            )!.petCalendars,
          });
        const watched = new Set([
          ...store.settings.selectedCalendars,
          ...store.settings.accounts.flatMap((a) =>
            Object.values(a.petCalendars),
          ),
        ]);
        store.cache = store.cache.filter((e) => watched.has(e.calendarId));
        engine.rebuild(store.cache);
        if (syncServices.size && parsed.selectedCalendars !== undefined)
          await sync(true).catch(() => {});
        if (!setupReady() && !isSmoke) openSetup();
        publish();
        return snapshot();
      });
      handle("connect", async () => {
        if (connecting)
          throw new Error("Google sign-in is already open in your browser.");
        if (controller.isBusy || calendarWriting)
          throw new Error("Finish your current command before reconnecting.");
        connecting = true;
        try {
          const auth = await connectGoogle(store);
          const existing = store.settings.accounts.find(
            (a) => a.id === auth.id,
          );
          const legacy = store.settings.accounts.find(
            (a) => a.id === "legacy" && a.email === auth.email,
          );
          if (legacy) {
            const remap = (id: string) =>
              unpackCalendar(id).accountId === legacy.id
                ? scopedCalendar(auth.id, unpackCalendar(id).calendarId)
                : id;
            store.save({
              selectedCalendars: store.settings.selectedCalendars.map(remap),
            });
            store.cache = store.cache.map((e) => ({
              ...e,
              calendarId: remap(e.calendarId),
            }));
            syncServices.get(legacy.id)?.stop();
            syncServices.delete(legacy.id);
            rawProviders.delete(legacy.id);
            provider!.remove(legacy.id);
            store.setSecret(`googleRefreshToken:${legacy.id}`, "");
          }
          store.setSecret(`googleRefreshToken:${auth.id}`, auth.refreshToken);
          auth.client.on("tokens", (t) => {
            if (
              t.refresh_token &&
              store.settings.accounts.some((a) => a.id === auth.id)
            )
              store.setSecret(`googleRefreshToken:${auth.id}`, t.refresh_token);
          });
          const account: GoogleAccount = {
            id: auth.id,
            email: auth.email,
            petCalendars:
              existing?.petCalendars ??
              (legacy
                ? Object.fromEntries(
                    Object.entries(legacy.petCalendars).map(([k, v]) => [
                      k,
                      scopedCalendar(auth.id, unpackCalendar(v!).calendarId),
                    ]),
                  )
                : {}),
          };
          store.save({
            accounts: [
              ...store.settings.accounts.filter(
                (a) => a.id !== auth.id && a.id !== legacy?.id,
              ),
              account,
            ],
            defaultAccountId:
              store.settings.defaultAccountId &&
              store.settings.defaultAccountId !== legacy?.id
                ? store.settings.defaultAccountId
                : auth.id,
          });
          const raw = new GoogleCalendarProvider(auth.client);
          rawProviders.set(auth.id, raw);
          provider!.add(auth.id, auth.email, raw);
          syncServices.get(auth.id)?.stop();
          syncServices.delete(auth.id);
          controller.clear();
          let partial = false;
          try {
            await initializeGoogle();
          } catch {
            partial = true;
          }
          const configured = store.settings.accounts.find(
            (a) => a.id === auth.id,
          )!;
          status =
            `Signed in as ${auth.email}. ${store.settings.accounts.length} account(s) connected. ` +
            (partial
              ? "Some calendars could not sync; check account status and retry sync."
              : "Calendars synced.");
          if (Object.values(configured.petCalendars).length < 3)
            status +=
              " This account?s MISO calendars still need setup; sign in again to retry.";
          publish();
          return snapshot();
        } finally {
          connecting = false;
          if (setupReady() && !setupWindow && !isSmoke) showPet();
          publish();
        }
      });
      handle("disconnect", () => {
        throw new Error(
          "Use Remove next to the specific account you want to disconnect. Other accounts will stay connected.",
        );
      });
      handle("remove-account", async (value: unknown) => {
        const id = z.string().min(1).max(300).parse(value);
        if (connecting || controller.isBusy || calendarWriting)
          throw new Error(
            "Finish the current operation before removing an account.",
          );
        const account = store.settings.accounts.find((a) => a.id === id);
        if (!account) throw new Error("This account was already removed.");
        const auth = makeAuth(store, id);
        accountGeneration++;
        syncServices.get(id)?.stop();
        syncServices.delete(id);
        rawProviders.delete(id);
        provider!.remove(id);
        calendars = calendars.filter((c) => c.accountId !== id);
        controller.clear();
        store.setSecret(`googleRefreshToken:${id}`, "");
        const accounts = store.settings.accounts.filter((a) => a.id !== id);
        const defaultAccount =
          accounts.find((a) => a.id === store.settings.defaultAccountId) ??
          accounts[0];
        store.save({
          accounts,
          defaultAccountId: defaultAccount?.id ?? "",
          petCalendars: defaultAccount?.petCalendars ?? {},
          selectedCalendars: store.settings.selectedCalendars.filter(
            (c) => unpackCalendar(c).accountId !== id,
          ),
        });
        store.cache = store.cache.filter(
          (e) => unpackCalendar(e.calendarId).accountId !== id,
        );
        engine.rebuild(store.cache);
        let message = `Removed ${account.email} from MISO. Its Google events were kept. Other accounts are unchanged.`;
        try {
          await auth.revokeCredentials();
        } catch {
          message +=
            " Local access was removed, but Google could not confirm revocation. You can remove MISO in Google account permissions.";
        }
        status = message;
        if (!accounts.length) {
          pet.hide();
          engine.stop();
          trayMenu();
        }
        publish();
        return { success: true, message, snapshot: snapshot() };
      });
      handle("reset-setup", async () => {
        if (connecting || testingAI || controller.isBusy || calendarWriting)
          throw new Error(
            "Finish the current operation before resetting MISO.",
          );
        calendarWriting = true;
        try {
          if (store.settings.startAtLogin) await setStartAtLogin(false);
          accountGeneration++;
          engine.stop();
          engine.clear(true);
          pet.hide();
          controller.clear();
          manual.clear();
          for (const service of syncServices.values()) service.stop();
          syncServices.clear();
          rawProviders.clear();
          for (const account of store.settings.accounts)
            provider!.remove(account.id);
          calendars = [];
          store.resetPersonalData();
          try {
            setHotkey(store.settings.hotkey);
          } catch {
            store.save({ hotkey: registeredHotkey });
          }
          polling();
          trayMenu();
          status =
            "MISO reset. All local accounts, AI keys, cached reminders and personal preferences were cleared. Google calendars and events were kept. Continue with Google to reconnect.";
          openSetup();
          publish();
          return { success: true, message: status, snapshot: snapshot() };
        } finally {
          calendarWriting = false;
        }
      });
      handle("create-manual", async (value: unknown) => {
        if (connecting || controller.isBusy || calendarWriting)
          throw new Error("Finish the current operation first.");
        calendarWriting = true;
        try {
          const message = await manual.create(value);
          publish();
          reply({ text: "aye aye boss\n" + message, state: "wink" });
          return { success: true, message, snapshot: snapshot() };
        } finally {
          calendarWriting = false;
        }
      });
      const readEvent = async (c: unknown, e: unknown) => {
        const id = z.string().max(600).parse(c);
        if (!calendars.some((cal) => cal.id === id))
          throw new Error("This calendar is no longer connected.");
        return provider!.getEvent(id, z.string().min(1).max(1000).parse(e));
      };
      handle("get-calendar-event", readEvent);
      handle("open-calendar-event", async (c: unknown, e: unknown) => {
        const event = await readEvent(c, e);
        if (!event.htmlLink)
          throw new Error(
            "Google did not provide an event link. Open Google Calendar to locate this event.",
          );
        const url = new URL(event.htmlLink);
        if (
          url.protocol !== "https:" ||
          !["calendar.google.com", "www.google.com"].includes(url.hostname) ||
          url.username ||
          url.password ||
          !/^\/calendar(?:\/|$)/.test(url.pathname)
        )
          throw new Error("Google returned an unsupported calendar link.");
        await shell.openExternal(url.toString());
      });
      handle("preview-edit", (c: unknown, e: unknown, v: unknown) =>
        manual.previewEdit(
          z.string().max(600).parse(c),
          z.string().max(1000).parse(e),
          v,
        ),
      );
      handle("cancel-edit", (t: unknown) =>
        manual.cancelEdit(z.string().uuid().parse(t)),
      );
      handle("confirm-edit", async (t: unknown) => {
        if (connecting || controller.isBusy || calendarWriting)
          throw new Error("Finish the current operation first.");
        calendarWriting = true;
        try {
          const message = await manual.confirmEdit(z.string().uuid().parse(t));
          publish();
          return { success: true, message, snapshot: snapshot() };
        } finally {
          calendarWriting = false;
        }
      });
      handle(
        "preview-delete",
        (calendarId: unknown, eventId: unknown, scope: unknown) =>
          manual.preview(
            z.string().max(600).parse(calendarId),
            z.string().max(1000).parse(eventId),
            z.enum(["instance", "series"]).parse(scope),
          ),
      );
      handle("confirm-delete", async (ticket: unknown) => {
        if (connecting || controller.isBusy || calendarWriting)
          throw new Error("Finish the current operation first.");
        calendarWriting = true;
        try {
          const message = await manual.confirm(z.string().uuid().parse(ticket));
          publish();
          return { success: true, message, snapshot: snapshot() };
        } finally {
          calendarWriting = false;
        }
      });
      handle("cancel-delete", (ticket: unknown) =>
        manual.cancel(z.string().uuid().parse(ticket)),
      );
      handle("snooze", (key: unknown, minutes: unknown) =>
        engine.snooze(
          z.string().max(2000).parse(key),
          z.number().parse(minutes),
        ),
      );
      handle("done", (key: unknown) =>
        engine.done(z.string().max(2000).parse(key)),
      );
      ipcMain.on("interactive", (event, value) => {
        if (
          event.sender.id === pet.webContents.id &&
          typeof value === "boolean"
        )
          ignoreMouse(!value);
      });
      ipcMain.on("dragging", (event, value) => {
        if (
          event.sender.id === pet.webContents.id &&
          typeof value === "boolean"
        ) {
          petDragging = value;
          if (value) ignoreMouse(false);
        }
      });
      ipcMain.on("move", (event, x, y) => {
        if (
          event.sender.id === pet.webContents.id &&
          !workflowHome &&
          Number.isFinite(x) &&
          Number.isFinite(y)
        ) {
          placePet(x, y);
          if (positionTimer) clearTimeout(positionTimer);
          positionTimer = setTimeout(
            () => store.save({ position: petAnchor }),
            150,
          );
        }
      });
      powerMonitor.on("resume", () => {
        void sync(true).catch(() => {});
        engine.tick();
      });
      screen.on("display-removed", () => {
        placePet(petAnchor.x, petAnchor.y);
      });
      app.on("activate", () => {
        if (engine) showPet();
      });
      if (!setupReady()) openSetup();
      else if (!isSmoke) showPet();
      startupPhase = "calendar connection";
      try {
        if (store.settings.accounts.length && !isSmoke)
          await initializeGoogle();
      } catch {
        status =
          "Some accounts could not reconnect. Check account status; other calendars remain available.";
        publish();
      }
      polling();
      startupPhase = "running";
      if (isSmoke) {
        openSettings();
        openSetup();
      } else if (setupReady()) {
        showPet();
        if (process.argv.includes("--settings")) openSettings();
      } else openSetup();
      if (!__BUTLER_RELEASE__ && isSmoke) {
        try {
          const { smoke } = await import("./smoke");
          await smoke(pet, settingsWindow!, store, setupWindow!, provider!);
          app.exit(0);
        } catch (error) {
          console.error("Electron smoke failed:", error);
          app.exit(1);
        }
      }
    })
    .catch(startupFailure);
}
app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  quitting = true;
  globalShortcut.unregisterAll();
  if (pet && !pet.isDestroyed() && store) {
    store.save({ position: petAnchor });
  }
  if (poll) clearInterval(poll);
  if (cursorPoll) clearTimeout(cursorPoll);
  engine?.stop();
  for (const service of syncServices.values()) service.stop();
});
