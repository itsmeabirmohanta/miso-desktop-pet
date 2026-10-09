import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const packaged = process.argv.includes("--packaged");
const asar = packaged ? require("@electron/asar") : undefined;
const archive = "release/win-unpacked/resources/app.asar";
const packageConfig = JSON.parse(await readFile("package.json", "utf8"));
if (packageConfig.build?.nsis?.runAfterFinish !== false)
  throw new Error(
    "Installer auto-launch must remain disabled to avoid blocking Finish.",
  );
const installerScript = await readFile(
  packageConfig.build.nsis.include,
  "utf8",
);
for (const mode of ["safe-mode", "recovery-profile"]) {
  if (
    !installerScript
      .split(/\r?\n/)
      .some(
        (line) =>
          /^\s*CreateShortCut\s/.test(line) && line.includes(`"--${mode}"`),
      )
  )
    throw new Error(`Installer is missing its ${mode} shortcut.`);
}
async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const target = join(path, entry.name);
        return entry.isDirectory()
          ? walk(target)
          : [target.replaceAll("\\", "/")];
      }),
    )
  ).flat();
}
const paths = packaged
  ? asar
      .listPackage(archive)
      .map((name) => name.replaceAll("\\", "/").replace(/^\//, ""))
  : await walk("dist");
const firstParty = paths.filter((name) => name.startsWith("dist/"));
const allowed =
  /^dist\/(?:main\/(?:index|preload)\.cjs|renderer\/(?:app\.js|index\.html|style\.css|setup\.css)|assets\/(?:[^/]+\.(?:svg|png|ico)|skins\.json|manifest\.json|oauth-client\.json))$/;
for (const name of firstParty) {
  // ASAR lists directories as well as files.
  if (
    ["dist/main", "dist/renderer", "dist/assets", "dist/assets/fonts"].includes(
      name,
    )
  )
    continue;
  if (
    !allowed.test(name) &&
    !/^dist\/assets\/fonts\/(?:Inter|Baloo2)(?:\.ttf|-OFL\.txt)$/.test(name) &&
    !/^dist\/assets\/(?:branding|mascot\/(?:idle|walk|sleep|alert|happy|thinking|wink))\/[^/]+\.(?:svg|png|ico|webp|gif)$/.test(
      name,
    ) &&
    !/^dist\/assets\/(?:branding|mascot|mascot\/(?:idle|walk|sleep|alert|happy|thinking|wink))$/.test(
      name,
    )
  )
    throw new Error(`Unexpected first-party release file: ${name}`);
}
if (
  packaged &&
  paths.some((name) =>
    /^(?:src|tests|artifacts|scripts|attachments|\.env)(?:\/|$)/.test(name),
  )
)
  throw new Error("Development or personal files entered the package.");
const get = async (path) =>
  packaged
    ? asar.extractFile(archive, join(...path.split("/")))
    : readFile(path);
const forbidden = [
  ...(process.env.MISO_PRIVATE_RELEASE_MARKERS ?? "")
    .split(";")
    .filter(Boolean),
  "secure-roundtrip",
  "smoke-only",
  "Electron smoke passed",
  "butler-smoke-",
  "@example.test",
];
for (const name of firstParty.filter((name) =>
  /\.(?:cjs|js|json|html|css)$/.test(name),
)) {
  const contents = (await get(name)).toString("utf8");
  // Do not print matched material: an audit must not leak what it discovers.
  if (forbidden.some((value) => contents.includes(value)))
    throw new Error(`Private/test marker found in ${name}`);
  for (const variable of [
    "BUTLER_GOOGLE_CLIENT_ID",
    "BUTLER_GOOGLE_CLIENT_SECRET",
  ]) {
    const value = process.env[variable];
    if (value && contents.includes(value))
      throw new Error(`Developer credential found in ${name}`);
  }
}
const oauth = JSON.parse(
  (await get("dist/assets/oauth-client.json")).toString(),
);
if (
  process.argv.includes("--require-oauth") &&
  (!oauth.clientId || !oauth.clientSecret)
)
  throw new Error(
    "Publisher release is missing its default Desktop OAuth configuration. Configure both GitHub release secrets before shipping.",
  );
if (
  oauth.clientId &&
  !/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(oauth.clientId)
)
  throw new Error("Invalid public Desktop OAuth configuration.");
if (oauth.clientSecret && !oauth.clientId)
  throw new Error("OAuth secret without a public client ID.");
if (packaged) {
  const { getCurrentFuseWire, FuseV1Options } = require("@electron/fuses");
  const { FuseState } = require("@electron/fuses/dist/constants");
  const wire = await getCurrentFuseWire("release/win-unpacked/MISO.exe");
  for (const option of [
    FuseV1Options.RunAsNode,
    FuseV1Options.EnableNodeOptionsEnvironmentVariable,
    FuseV1Options.EnableNodeCliInspectArguments,
  ])
    if (wire[option] !== FuseState.DISABLE)
      throw new Error("An unsafe runtime fuse is enabled.");
  for (const option of [
    FuseV1Options.EnableCookieEncryption,
    FuseV1Options.EnableEmbeddedAsarIntegrityValidation,
    FuseV1Options.OnlyLoadAppFromAsar,
  ])
    if (wire[option] !== FuseState.ENABLE)
      throw new Error("A required protection fuse is disabled.");
  const releaseFiles = await readdir("release");
  const version = packageConfig.version;
  const installer = `MISO Setup ${version}.exe`;
  if (releaseFiles.includes(installer)) {
    const sha256 = createHash("sha256")
      .update(await readFile(join("release", installer)))
      .digest("hex");
    await writeFile(
      join("release", `${installer}.sha256`),
      `${sha256}  ${installer}\n`,
    );
  }
}
console.log(
  `Release audit passed: ${packaged ? "packaged archive and runtime fuses" : "clean build"}; default Google login ${oauth.clientId ? "configured with public release credentials" : "requires user-supplied configuration"}.`,
);
