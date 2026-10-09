# MISO - Your Little Butler: artwork drop-in guide

Edit **src/assets**, not dist/assets. The build recreates dist.

## Branding

Put your artwork in `branding/` using these exact base names:

| File | Used for | Suggested size |
| --- | --- | --- |
| `logo.svg` (or logo.png / logo.webp) | Settings and connection-page header | Square transparent artwork, 512×512 or scalable SVG |
| `icon.ico` | Windows application, shortcuts and installer | ICO with 16, 32, 48 and 256 px variants |
| `icon.png` | Application icon for Linux/macOS builds | Square PNG, ideally 1024×1024 |
| `tray.png` | System tray icon | Transparent 32×32; keep details clear at 16×16 |

The existing files are placeholders. Replace them with your own artwork. The icon generator does **not** overwrite supplied files. The full display name is **MISO - Your Little Butler**; the short product name is **MISO**.

## Mascot actions

Each action has its own folder with a working `mascot.svg` placeholder:

| Folder | Trigger |
| --- | --- |
| `mascot/idle/` | Normal resting position |
| `mascot/walk/` | Dragging the mascot |
| `mascot/sleep/` | Reminders paused |
| `mascot/alert/` | A reminder is shown |
| `mascot/thinking/` | Processing a command |
| `mascot/happy/` | Happy response state; normal save acknowledgements use wink |
| `mascot/wink/` | “aye aye boss” acknowledgement after saving |

In each folder, replace `mascot.svg`, or add **mascot.png**, **mascot.webp**, or **mascot.gif**. Animated GIF/WebP files can contain their own frame animation. A sprite sheet is not automatically split into frames. Files added under another name are not selected.

When multiple formats have the same base name, priority is **WebP → PNG → GIF → SVG**. Remove superseded files if you switch formats and want to avoid ambiguity.

Use a transparent background and the same square canvas and scale for every action (512×512 suggested). Keep the mascot centered with consistent padding so it does not jump between states. On-screen size remains about 110×105 px. The Midnight appearance applies the existing color filter to the same action artwork.

The current placeholder poses mostly reuse the original cat; they establish file locations and working fallbacks for your own drawings. If an action file is absent, its original cat image is used. A failed image load also falls back to the original cat.

## Use your replacements

1. Add or replace the named files above.
2. Run `npm start` to rebuild and preview, or `npm run dist` to produce the MISO installer.
3. `manifest.json` is generated automatically; do not edit it manually.

README files, design source files, and arbitrary credential JSON files are excluded from built assets. Keep private photos, account data, credentials, and personal files outside this folder. Artwork used by the app is public in the installer.
