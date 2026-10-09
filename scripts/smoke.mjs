import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const packaged = process.argv.includes("--packaged");
const executable = packaged
  ? resolve("release/win-unpacked/MISO.exe")
  : require("electron");
const child = spawn(
  executable,
  packaged ? ["--smoke-test"] : [".", "--smoke-test"],
  { stdio: "inherit", windowsHide: true, env },
);
const timer = setTimeout(() => {
  child.kill();
  process.exitCode = 1;
}, 45000);
child.on("exit", (code) => {
  clearTimeout(timer);
  process.exitCode = code ?? 1;
});
