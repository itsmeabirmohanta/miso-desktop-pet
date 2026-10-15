import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  readFile,
  access,
  rm,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

if (process.platform !== "win32")
  throw new Error("Installer policy execution tests require Windows.");
const require = createRequire(import.meta.url);
const {
  getMakeNsisPath,
  getNsisPluginsPath,
} = require("app-builder-lib/out/toolsets/windows");
const compiler = await getMakeNsisPath();
const plugins = await getNsisPluginsPath();
const root = await mkdtemp(join(tmpdir(), "miso-installer-policy-"));
const testRegistryKey = `Software\\MisoInstallerTests\\${randomUUID()}`;
assert.equal(dirname(resolve(root)), resolve(tmpdir()));
const run = (exe, args, env = process.env) =>
  new Promise((done, reject) => {
    const child = spawn(exe, args, { env, windowsHide: true });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Installer policy fixture timed out."));
    }, 20000);
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      done({ code, output });
    });
  });

const scenarios = [
  { name: "fresh", machine: 0 },
  { name: "existing-machine-directory", location: "C:\\MISO", machine: 1 },
  {
    name: "machine-registration-only",
    uninstaller: "old-uninstaller",
    machine: 1,
  },
  { name: "successful-current-user-removal", current: 1, machine: 0 },
  { name: "failed-removal", result: 1, expected: 2, machine: 0 },
  { name: "reboot-required", result: 3010, expected: 2, machine: 0 },
  { name: "missing-uninstaller", launchError: 1, expected: 2, machine: 0 },
  {
    name: "failed-current-user-removal",
    current: 1,
    result: 1,
    expected: 2,
    machine: 0,
  },
  {
    name: "missing-current-user-uninstaller",
    current: 1,
    launchError: 1,
    expected: 2,
    machine: 0,
  },
];
try {
  for (const scenario of scenarios) {
    const exe = join(root, `${scenario.name}.exe`);
    const marker = join(root, `${scenario.name}.txt`);
    const definitions = {
      TEST_EXE: exe,
      SUCCESS_MARKER: marker,
      POLICY_FILE: resolve("scripts/installer-upgrade.nsh"),
      OLD_LOCATION: scenario.location || "",
      OLD_UNINSTALLER: scenario.uninstaller || "",
      EXPECTED_MACHINE: scenario.machine,
      UNINSTALL_RESULT: scenario.result || 0,
      LAUNCH_ERROR: scenario.launchError || 0,
      CURRENT_USER_CHECK: scenario.current || 0,
    };
    const compile = await run(
      compiler.path,
      [
        "/V2",
        ...Object.entries(definitions).map(
          ([key, value]) => `/D${key}=${value}`,
        ),
        resolve("tests/installer/upgrade-policy.nsi"),
      ],
      { ...process.env, ...compiler.env },
    );
    assert.equal(compile.code, 0, compile.output);
    const result = await run(exe, ["/S"]);
    assert.equal(result.code, scenario.expected || 0, scenario.name);
    if (scenario.expected) await assert.rejects(access(marker));
    else
      assert.equal(
        await readFile(marker, "utf8"),
        "previous-install-removal-succeeded",
      );
    console.log(`PASS ${scenario.name}`);
  }
  for (const changeDirectory of [false, true]) {
    const name = changeDirectory ? "changed-directory" : "same-directory";
    const oldDirectory = join(root, `${name}-old`);
    const newDirectory = changeDirectory
      ? join(root, `${name}-new`)
      : oldDirectory;
    const oldUninstaller = join(oldDirectory, "old-uninstaller.exe");
    const profileMarker = join(root, `${name}-saved-profile.txt`);
    const exe = join(root, `${name}.exe`);
    await mkdir(oldDirectory);
    await writeFile(join(oldDirectory, "old-app.txt"), "old-version");
    await writeFile(profileMarker, "saved-account-settings");
    for (const [source, definitions] of [
      [
        "old-uninstaller.nsi",
        {
          OLD_UNINSTALLER: oldUninstaller,
          OLD_DIRECTORY: oldDirectory,
          TEST_REGISTRY_KEY: testRegistryKey,
        },
      ],
      [
        "reinstall.nsi",
        {
          TEST_EXE: exe,
          OLD_DIRECTORY: oldDirectory,
          NEW_DIRECTORY: newDirectory,
          OLD_UNINSTALLER: oldUninstaller,
          PROFILE_MARKER: profileMarker,
          TEST_REGISTRY_KEY: testRegistryKey,
          POLICY_FILE: resolve("scripts/installer-upgrade.nsh"),
          NSIS_TEMPLATE_DIR: resolve(
            "node_modules/app-builder-lib/templates/nsis",
          ),
          PLUGIN_DIRECTORY: plugins,
        },
      ],
    ]) {
      const result = await run(
        compiler.path,
        [
          "/V2",
          ...Object.entries(definitions).map(
            ([key, value]) => `/D${key}=${value}`,
          ),
          resolve("tests/installer", source),
        ],
        { ...process.env, ...compiler.env },
      );
      assert.equal(result.code, 0, result.output);
    }
    const result = await run(exe, ["/S"]);
    assert.equal(result.code, 0, `${name}: ${result.output}`);
    await assert.rejects(access(join(oldDirectory, "old-app.txt")));
    await assert.rejects(access(oldUninstaller));
    assert.equal(
      await readFile(join(newDirectory, "new-app.txt"), "utf8"),
      "new-version",
    );
    assert.equal(
      await readFile(profileMarker, "utf8"),
      "saved-account-settings",
    );
    console.log(
      `PASS ${name}: previous files and registration removed; saved profile preserved`,
    );
  }
  console.log(
    `${scenarios.length + 2} compiled NSIS scenarios passed; production app registrations and user profiles were untouched.`,
  );
} finally {
  // Only this run's generated test namespace is eligible for registry cleanup.
  assert.match(
    testRegistryKey,
    /^Software\\MisoInstallerTests\\[a-f0-9-]{36}$/,
  );
  const cleanup = await run("reg.exe", [
    "delete",
    `HKCU\\${testRegistryKey}`,
    "/f",
  ]);
  assert.ok([0, 1].includes(cleanup.code));
  // Only the newly-created, resolved test directory may be removed recursively.
  assert.equal(dirname(resolve(root)), resolve(tmpdir()));
  await rm(root, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 200,
  });
}
