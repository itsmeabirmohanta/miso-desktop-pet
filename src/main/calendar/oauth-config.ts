import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SettingsStore } from "../settings/store";
export function bundledOAuthConfig() {
  let bundled: { clientId?: string; clientSecret?: string } = {};
  try {
    bundled = JSON.parse(
      readFileSync(join(__dirname, "../assets/oauth-client.json"), "utf8"),
    );
  } catch {
    /* Developer configuration is optional for local builds. */
  }
  return bundled;
}
declare const __BUTLER_RELEASE__: boolean;
export function defaultOAuthConfig() {
  const bundled = bundledOAuthConfig();
  return {
    clientId:
      (!__BUTLER_RELEASE__ && process.env.BUTLER_GOOGLE_CLIENT_ID) ||
      bundled.clientId ||
      "",
    clientSecret:
      (!__BUTLER_RELEASE__ && process.env.BUTLER_GOOGLE_CLIENT_SECRET) ||
      bundled.clientSecret ||
      "",
  };
}
export function loadOAuthConfig(store: SettingsStore) {
  const { clientId, clientSecret: secret } = defaultOAuthConfig();
  if (
    !store.settings.googleClientId &&
    clientId?.endsWith(".apps.googleusercontent.com")
  )
    store.save({ googleClientId: clientId });
  if (
    secret &&
    store.settings.googleClientId === clientId &&
    !store.secret("googleClientSecret")
  )
    store.setSecret("googleClientSecret", secret);
}
