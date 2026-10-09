import { access, copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
export const mascotStates = [
  "idle",
  "walk",
  "sleep",
  "alert",
  "happy",
  "thinking",
  "wink",
];
const imageExtensions = ["webp", "png", "gif", "svg"];
export async function selectImage(root, folder, basename, fallback) {
  for (const extension of imageExtensions) {
    const relative = `${folder}/${basename}.${extension}`;
    try {
      await access(join(root, relative));
      return relative;
    } catch {}
  }
  return fallback;
}
export async function prepareAssets(root = "src/assets") {
  const mascot = {};
  for (const state of mascotStates)
    mascot[state] = await selectImage(
      root,
      `mascot/${state}`,
      "mascot",
      state === "wink" ? "cat-wink.svg" : "cat.svg",
    );
  const branding = {
    logo: await selectImage(root, "branding", "logo", "cat.svg"),
    tray: "branding/tray.png",
  };
  // Legacy root icons remain fallbacks; supplied branding icons are never regenerated.
  for (const file of ["icon.ico", "icon.png"])
    try {
      await access(join(root, "branding", file));
    } catch {
      await copyFile(join(root, file), join(root, "branding", file));
    }
  const manifest = { branding, mascot };
  await writeFile(
    join(root, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return manifest;
}
