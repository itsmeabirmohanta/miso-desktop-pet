import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Explicitly exports only the owner's app OAuth configuration for a public
// desktop release. Account tokens, API keys and calendar data are never copied.
if (!process.versions.electron) {
  const require = createRequire(import.meta.url);
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(require("electron"), [fileURLToPath(import.meta.url)], {
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
} else {
  const { app, safeStorage } = await import("electron");
  const root = app.getPath("appData");
  const profile = join(
    root,
    existsSync(join(root, "miso-recovery-selected"))
      ? "miso-recovery"
      : "butler-desktop",
  );
  app.setPath("userData", profile);
  app.whenReady().then(() => {
    try {
      const disk = JSON.parse(
        readFileSync(join(profile, "butler.json"), "utf8"),
      );
      const data = disk.vault
        ? JSON.parse(
            safeStorage.decryptString(Buffer.from(disk.vault, "base64")),
          )
        : disk;
      const clientId = data.settings?.googleClientId;
      if (!clientId?.endsWith(".apps.googleusercontent.com")) throw new Error();
      const encrypted = data.secrets?.googleClientSecret;
      const clientSecret = encrypted
        ? safeStorage.decryptString(Buffer.from(encrypted, "base64"))
        : "";
      const env = {
        ...process.env,
        BUTLER_PUBLIC_GOOGLE_CLIENT_ID: clientId,
        BUTLER_PUBLIC_GOOGLE_CLIENT_SECRET: clientSecret,
      };
      delete env.ELECTRON_RUN_AS_NODE;
      delete env.BUTLER_GOOGLE_CLIENT_ID;
      delete env.BUTLER_GOOGLE_CLIENT_SECRET;
      if (!env.npm_node_execpath || !env.npm_execpath) throw new Error();
      console.log(
        "Building with the saved Desktop OAuth app configuration; personal data stays local.",
      );
      const child = spawn(
        env.npm_node_execpath,
        [env.npm_execpath, "run", "dist"],
        { env, stdio: "inherit", windowsHide: true },
      );
      child.on("exit", (code) => app.exit(code ?? 1));
      child.on("error", () => app.exit(1));
    } catch {
      console.error(
        "Could not load the local app OAuth configuration. Configure the Desktop client in MISO first.",
      );
      app.exit(1);
    }
  });
}
