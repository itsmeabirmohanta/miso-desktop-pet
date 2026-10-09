import { beforeEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  config: {
    clientId: "123-desktop.apps.googleusercontent.com",
    clientSecret: "app-secret",
  },
}));
vi.mock("node:fs", () => ({
  readFileSync: () => JSON.stringify(fixture.config),
}));
import { loadOAuthConfig } from "../src/main/calendar/oauth-config";
import type { SettingsStore } from "../src/main/settings/store";
beforeEach(() => {
  vi.stubGlobal("__BUTLER_RELEASE__", true);
});
function store(clientId: string, secret?: string) {
  const value = {
    settings: { googleClientId: clientId },
    save: vi.fn((patch) => Object.assign(value.settings, patch)),
    secret: () => secret,
    setSecret: vi.fn(),
  };
  return value;
}
it("loads bundled OAuth defaults for a new profile", () => {
  const value = store("");
  loadOAuthConfig(value as unknown as SettingsStore);
  expect(value.settings.googleClientId).toBe(fixture.config.clientId);
  expect(value.setSecret).toHaveBeenCalledWith(
    "googleClientSecret",
    "app-secret",
  );
});
it("refreshes a stale saved secret for the bundled client", () => {
  const value = store(fixture.config.clientId, "outdated-secret");
  loadOAuthConfig(value as unknown as SettingsStore);
  expect(value.setSecret).toHaveBeenCalledWith(
    "googleClientSecret",
    "app-secret",
  );
});
it("preserves the user's custom client configuration", () => {
  const value = store("456-custom.apps.googleusercontent.com", "custom-secret");
  loadOAuthConfig(value as unknown as SettingsStore);
  expect(value.save).not.toHaveBeenCalled();
  expect(value.setSecret).not.toHaveBeenCalled();
});
