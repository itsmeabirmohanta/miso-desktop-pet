import { OAuth2Client } from "google-auth-library";
import { createServer } from "node:http";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { shell } from "electron";
import type { SettingsStore } from "../settings/store";
import {
  GoogleSignInError,
  signInError,
  type SignInStage,
} from "./auth-errors";
export function makeAuth(
  store: SettingsStore,
  accountId?: string,
): OAuth2Client {
  const client = new OAuth2Client({
    clientId: store.settings.googleClientId,
    clientSecret: store.secret("googleClientSecret"),
  });
  const name = accountId
    ? `googleRefreshToken:${accountId}`
    : "googleRefreshToken";
  const token = store.secret(name);
  if (token) client.setCredentials({ refresh_token: token });
  client.on("tokens", (tokens) => {
    if (
      tokens.refresh_token &&
      (!accountId || store.settings.accounts.some((a) => a.id === accountId))
    )
      store.setSecret(name, tokens.refresh_token);
  });
  return client;
}
export async function connectGoogle(store: SettingsStore): Promise<{
  client: OAuth2Client;
  id: string;
  email: string;
  refreshToken: string;
}> {
  if (!store.settings.googleClientId.endsWith(".apps.googleusercontent.com"))
    throw new Error(
      "Google sign-in is not configured in this build. Ask the app developer to configure its Desktop OAuth client, or use Advanced developer setup.",
    );
  const verifier = randomBytes(48).toString("base64url");
  const state = randomBytes(32).toString("hex");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Could not start local sign-in callback.");
  const redirectUri = `http://127.0.0.1:${address.port}/oauth/callback`;
  const client = new OAuth2Client({
    clientId: store.settings.googleClientId,
    clientSecret: store.secret("googleClientSecret"),
    redirectUri,
  });
  let stage: SignInStage = "browser sign-in";
  try {
    const code = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new GoogleSignInError("timeout", stage)),
        180000,
      );
      server.on("request", (req, res) => {
        const url = new URL(req.url ?? "/", redirectUri);
        if (url.pathname !== "/oauth/callback") {
          res.writeHead(404);
          res.end();
          return;
        }
        const received = Buffer.from(url.searchParams.get("state") ?? "");
        const expected = Buffer.from(state);
        if (
          received.length !== expected.length ||
          !timingSafeEqual(received, expected)
        ) {
          res.writeHead(400);
          res.end("Invalid sign-in state.");
          return;
        }
        clearTimeout(timer);
        const authCode = url.searchParams.get("code");
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(
          authCode
            ? "Sign-in received. You can close this tab and return to MISO."
            : "Sign-in cancelled. Return to MISO.",
        );
        if (authCode) resolve(authCode);
        else
          reject(
            new GoogleSignInError(
              url.searchParams.get("error") === "access_denied"
                ? "access_denied"
                : "cancelled",
              stage,
            ),
          );
      });
      const url = client.generateAuthUrl({
        access_type: "offline",
        prompt: "select_account consent",
        scope: [
          "openid",
          "email",
          "https://www.googleapis.com/auth/calendar.app.created",
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
        ],
        state,
        code_challenge: challenge,
        code_challenge_method: "S256" as never,
      });
      void shell.openExternal(url).catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    stage = "token exchange";
    const { tokens } = await client.getToken({
      code,
      codeVerifier: verifier,
      redirect_uri: redirectUri,
    });
    if (!tokens.refresh_token)
      throw new GoogleSignInError("missing_refresh_token", stage);
    if (!tokens.id_token)
      throw new GoogleSignInError("missing_identity", stage);
    stage = "account verification";
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: store.settings.googleClientId,
    });
    const identity = ticket.getPayload();
    if (!identity?.sub || !identity.email || !identity.email_verified)
      throw new GoogleSignInError("missing_identity", stage);
    client.setCredentials(tokens);
    return {
      client,
      id: identity.sub,
      email: identity.email,
      refreshToken: tokens.refresh_token,
    };
  } catch (error) {
    throw signInError(error, stage);
  } finally {
    server.close();
    server.closeAllConnections();
  }
}
