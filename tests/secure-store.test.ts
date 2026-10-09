import { beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  disk: {} as Record<string, any>,
  available: true,
}));
vi.mock("electron-store", () => ({
  default: class {
    get store() {
      return fixture.disk;
    }
    set store(value: Record<string, any>) {
      fixture.disk = value;
    }
  },
}));
vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => fixture.available,
    getSelectedStorageBackend: () => "gnome_libsecret",
    encryptString: (value: string) => Buffer.from("protected:" + value),
    decryptString: (value: Buffer) => {
      if (!value.toString().startsWith("protected:"))
        throw new Error("Cannot decrypt");
      return value.toString().slice(10);
    },
  },
}));
import { SettingsStore } from "../src/main/settings/store";
beforeEach(() => {
  fixture.disk = {};
  fixture.available = true;
});
describe("protected local store", () => {
  it("migrates legacy personal fields into a single protected vault", () => {
    fixture.disk = {
      settings: {
        accounts: [
          { id: "account", email: "private@example.com", petCalendars: {} },
        ],
      },
      cache: [{ calendarId: "cal", summary: "Private appointment" }],
      secrets: {},
      fired: { private: 1 },
    };
    const store = new SettingsStore();
    expect(Object.keys(fixture.disk)).toEqual(["vault"]);
    expect(store.settings.accounts[0].email).toBe("private@example.com");
    const reloaded = new SettingsStore();
    expect(reloaded.cache[0].summary).toBe("Private appointment");
    expect(reloaded.fired).toEqual({ private: 1 });
  });
  it("persists keys without exposing a secret getter to a snapshot", () => {
    const store = new SettingsStore();
    store.setSecret("api", "private-key");
    expect(new SettingsStore().secret("api")).toBe("private-key");
    expect(Object.keys(fixture.disk)).toEqual(["vault"]);
    store.resetPersonalData();
    expect(new SettingsStore().secret("api")).toBeUndefined();
  });
  it("fails closed without a secure keyring", () => {
    fixture.disk = { settings: { sound: true } };
    const original = structuredClone(fixture.disk);
    fixture.available = false;
    expect(() => new SettingsStore()).toThrow(
      "No secure OS credential storage",
    );
    expect(fixture.disk).toEqual(original);
  });
  it("does not overwrite a vault that belongs to another OS account or is damaged", () => {
    fixture.disk = { vault: Buffer.from("unreadable").toString("base64") };
    const original = structuredClone(fixture.disk);
    expect(() => new SettingsStore()).toThrow("Cannot decrypt");
    expect(fixture.disk).toEqual(original);
  });
});
