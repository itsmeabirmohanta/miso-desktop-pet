import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import assert from "node:assert/strict";
const profileRoot = await mkdtemp(join(tmpdir(), "butler-release-check-"));
const profile = join(profileRoot, "first-run-profile");
assert.equal(dirname(resolve(profileRoot)), resolve(tmpdir()));
const env = {
  ...process.env,
  NODE_OPTIONS: "--require=butler-nonexistent-injection.js",
};
delete env.ELECTRON_RUN_AS_NODE;
delete env.BUTLER_GOOGLE_CLIENT_ID;
delete env.BUTLER_GOOGLE_CLIENT_SECRET;
const child = spawn(
  resolve(
    process.argv.includes("--executable")
      ? process.argv[process.argv.indexOf("--executable") + 1]
      : "release/win-unpacked/MISO.exe",
  ),
  [
    `--user-data-dir=${profile}`,
    ...(process.argv.includes("--safe-mode") ? ["--safe-mode"] : []),
  ],
  { env, cwd: profileRoot, windowsHide: true, stdio: "ignore" },
);
let exited = false;
child.once("exit", () => {
  exited = true;
});
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  let vault;
  for (let i = 0; i < 20; i++) {
    if (exited) throw new Error("Packaged application exited during startup.");
    try {
      vault = JSON.parse(await readFile(join(profile, "butler.json"), "utf8"));
      break;
    } catch {}
    await delay(500);
  }
  assert.ok(vault?.vault, "Fresh profile was not initialized");
  assert.deepEqual(Object.keys(vault), ["vault"]);
  await delay(1500);
  assert.equal(exited, false, "Application failed after initialization");
  if (process.platform === "win32") {
    const window = spawn(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `(Get-Process -Id ${child.pid}).MainWindowTitle`,
      ],
      { windowsHide: true },
    );
    let title = "";
    window.stdout.on("data", (data) => {
      title += data;
    });
    const code = await new Promise((r) => window.once("exit", r));
    assert.equal(code, 0);
    assert.match(title, /Set up MISO/, "Fresh installation did not open setup");
  }
  console.log(
    "Packaged release passed: fresh encrypted profile, setup window, and disabled NODE_OPTIONS injection.",
  );
} finally {
  if (!exited) child.kill();
  for (let i = 0; !exited && i < 20; i++) await delay(100);
  if (exited && dirname(resolve(profileRoot)) === resolve(tmpdir()))
    await rm(profileRoot, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 300,
    });
}
