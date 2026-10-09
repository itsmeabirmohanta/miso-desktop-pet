import Store from "electron-store";
import { safeStorage } from "electron";
import type { Settings, CalendarEvent } from "../../shared/types";
export const defaults: Settings = {
  googleClientId: "",
  model: "claude-sonnet-4-6",
  selectedCalendars: [],
  petCalendars: {},
  meetingLead: 10,
  aiProvider: "anthropic",
  aiBaseUrl: "",
  aiKeyRequired: true,
  aiValidationFingerprint: "",
  aiEnabled: false,
  accounts: [],
  defaultAccountId: "",
  hotkey: "Ctrl+Alt+B",
  pollMinutes: 3,
  sound: false,
  startAtLogin: false,
  skin: "ginger",
  quietStart: "",
  quietEnd: "",
  paused: false,
};
interface Data {
  settings: Settings;
  secrets: Record<string, string>;
  cache: CalendarEvent[];
  fired: Record<string, number>;
}
export class SettingsStore {
  private store = new Store<Data & { vault?: string }>({
    name: "butler",
  });
  private data: Data;
  constructor() {
    this.assertSecure();
    const existing = this.store.store;
    // Decryption failure must never silently replace a user's data.
    this.data = existing.vault
      ? JSON.parse(
          safeStorage.decryptString(Buffer.from(existing.vault, "base64")),
        )
      : {
          settings: { ...defaults, ...existing.settings },
          secrets: existing.secrets ?? {},
          cache: existing.cache ?? [],
          fired: existing.fired ?? {},
        };
    this.persist();
  }
  private persist() {
    this.assertSecure();
    // Replace the entire file so migration leaves no plaintext personal fields.
    this.store.store = {
      vault: safeStorage
        .encryptString(JSON.stringify(this.data))
        .toString("base64"),
    } as Data & { vault: string };
  }
  get settings(): Settings {
    return { ...defaults, ...this.data.settings };
  }
  save(patch: Partial<Settings>) {
    const current = this.settings;
    const next = { ...current, ...patch };
    if (JSON.stringify(current) !== JSON.stringify(next)) {
      this.data.settings = next;
      this.persist();
    }
  }
  resetPersonalData() {
    const googleClientId = this.settings.googleClientId;
    const clientSecret = this.data.secrets.googleClientSecret;
    this.data = {
      settings: { ...defaults, googleClientId },
      secrets: clientSecret ? { googleClientSecret: clientSecret } : {},
      cache: [],
      fired: {},
    };
    this.persist();
  }
  get cache(): CalendarEvent[] {
    return this.data.cache;
  }
  set cache(value: CalendarEvent[]) {
    const normalized = value.slice(0, 2000).map((e) => ({
      id: e.id,
      calendarId: e.calendarId,
      calendarZone: e.calendarZone,
      defaultOffsets: e.defaultOffsets,
      summary: e.summary,
      start: e.start,
      end: e.end,
      status: e.status,
      recurringEventId: e.recurringEventId,
      recurrence: e.recurrence,
      reminders: e.reminders,
      extendedProperties: {
        private: Object.fromEntries(
          Object.entries({
            petApp: e.extendedProperties?.private?.petApp,
            petCategory: e.extendedProperties?.private?.petCategory,
          }).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        ),
      },
    }));
    if (JSON.stringify(this.cache) !== JSON.stringify(normalized)) {
      this.data.cache = normalized;
      this.persist();
    }
  }
  get fired(): Record<string, number> {
    return this.data.fired;
  }
  set fired(value: Record<string, number>) {
    this.data.fired = value;
    this.persist();
  }
  private assertSecure() {
    if (
      !safeStorage.isEncryptionAvailable() ||
      (process.platform === "linux" &&
        safeStorage.getSelectedStorageBackend() === "basic_text")
    )
      throw new Error(
        "No secure OS credential storage is available. Enable your system keyring and restart MISO.",
      );
  }
  secret(name: string): string | undefined {
    const value = this.data.secrets[name];
    if (!value) return undefined;
    this.assertSecure();
    return safeStorage.decryptString(Buffer.from(value, "base64"));
  }
  setSecret(name: string, value: string) {
    const secrets = { ...this.data.secrets };
    if (value) {
      this.assertSecure();
      secrets[name] = safeStorage.encryptString(value).toString("base64");
    } else delete secrets[name];
    this.data.secrets = secrets;
    this.persist();
  }
}
