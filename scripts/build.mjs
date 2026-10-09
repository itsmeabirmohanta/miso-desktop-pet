import { build } from "esbuild";
import { mkdir, cp, writeFile, rm } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { prepareAssets } from "./prepare-assets.mjs";
const release = process.argv.includes("--release");
const target = resolve("dist");
if (target !== resolve(process.cwd(), "dist"))
  throw new Error("Invalid build directory");
await rm(target, {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 200,
});
await import("./make-icon.mjs");
await prepareAssets();
await mkdir("dist/main", { recursive: true });
await build({
  entryPoints: ["src/main/index.ts", "src/main/preload.ts"],
  outdir: "dist/main",
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  external: ["electron"],
  sourcemap: !release,
  minify: release,
  define: { __BUTLER_RELEASE__: JSON.stringify(release) },
});
await build({
  entryPoints: ["src/renderer/app.ts"],
  outfile: "dist/renderer/app.js",
  bundle: true,
  platform: "browser",
  target: "chrome130",
  sourcemap: !release,
  minify: release,
});
await cp("src/renderer/index.html", "dist/renderer/index.html");
await cp("src/renderer/style.css", "dist/renderer/style.css");
await cp("src/renderer/setup.css", "dist/renderer/setup.css");
await cp("src/assets", "dist/assets", {
  recursive: true,
  filter: (path) => {
    const name = relative("src/assets", path).replaceAll("\\", "/");
    return (
      name === "" ||
      /^(?:branding|mascot|mascot\/(?:idle|walk|sleep|alert|happy|thinking|wink))$/.test(
        name,
      ) ||
      /^(?:[^/]+\.(?:svg|png|ico)|skins\.json|manifest\.json)$/.test(name) ||
      /^(?:branding|mascot\/(?:idle|walk|sleep|alert|happy|thinking|wink))\/[^/]+\.(?:svg|png|ico|webp|gif)$/.test(
        name,
      )
    );
  },
});
await writeFile(
  "dist/assets/oauth-client.json",
  JSON.stringify({
    // Private developer credentials never automatically enter a release.
    clientId: release
      ? (process.env.BUTLER_PUBLIC_GOOGLE_CLIENT_ID ?? "")
      : (process.env.BUTLER_GOOGLE_CLIENT_ID ?? ""),
    clientSecret: release
      ? (process.env.BUTLER_PUBLIC_GOOGLE_CLIENT_SECRET ?? "")
      : (process.env.BUTLER_GOOGLE_CLIENT_SECRET ?? ""),
  }),
);
