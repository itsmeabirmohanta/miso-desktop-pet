# MISO installer artwork

`sidebar.bmp` (164×314) and `header.bmp` (150×57) are 24-bit BMPs for the assisted NSIS wizard. They reuse MISO's supplied mascot/icon, warm cream, butter yellow, charcoal, and bundled Baloo 2/Inter fonts. Both installer and uninstaller use the branding ICO in `src/assets/branding`.

To regenerate the bitmaps after changing the artwork, run on Windows from the repository root:

```powershell
powershell.exe -NoProfile -NonInteractive -File scripts/prepare-installer.ps1
```

Commit the BMPs so packaging on other platforms does not require Windows drawing APIs. The files are build resources and are not copied into the installed app. `scripts/installer.nsh` supplies the product copy; `package.json` selects the resources. The release audit checks dimensions, bit depth, custom pages, actual executable metadata, and embedded icon bytes.
