// Code signing changes the installer's bytes after electron-builder wrote
// latest.yml and the blockmap. Rebuild both from the signed installer, the
// same way electron-builder does, so installed copies accept the download.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const {
  buildBlockMap,
} = require("app-builder-lib/out/targets/blockmap/blockmap");
const releaseDir = process.env.MISO_RELEASE_DIR || "release";
const installer = "MISO-Setup.exe";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const previous = await readFile(join(releaseDir, "latest.yml"), "utf8");
assert.match(
  previous,
  new RegExp(`^version: ${version.replaceAll(".", "\\.")}$`, "m"),
  "latest.yml belongs to a different version",
);
const file = join(releaseDir, installer);
const { size, sha512 } = await buildBlockMap(file, "gzip", `${file}.blockmap`);
const releaseDate =
  previous.match(/^releaseDate: '([^']+)'$/m)?.[1] ?? new Date().toISOString();
await writeFile(
  join(releaseDir, "latest.yml"),
  [
    `version: ${version}`,
    "files:",
    `  - url: ${installer}`,
    `    sha512: ${sha512}`,
    `    size: ${size}`,
    `path: ${installer}`,
    `sha512: ${sha512}`,
    `releaseDate: '${releaseDate}'`,
    "",
  ].join("\n"),
);
console.log(`Update manifest refreshed for ${installer} ${version}.`);
