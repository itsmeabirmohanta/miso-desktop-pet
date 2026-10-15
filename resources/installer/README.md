# MISO installer artwork

`sidebar.bmp` (164×314) and `header.bmp` (150×57) are 24-bit BMPs for the assisted NSIS wizard. They reuse MISO's supplied mascot/icon, warm cream, butter yellow, charcoal, and bundled Baloo 2/Inter fonts. Both installer and uninstaller use the branding ICO in `src/assets/branding`.

To regenerate the bitmaps after changing the artwork, run on Windows from the repository root:

```powershell
powershell.exe -NoProfile -NonInteractive -File scripts/prepare-installer.ps1
```

Commit the BMPs so packaging on other platforms does not require Windows drawing APIs. The files are build resources and are not copied into the installed app. `scripts/installer.nsh` supplies the product copy; `package.json` selects the resources. The release audit checks dimensions, bit depth, custom pages, actual executable metadata, and embedded icon bytes.

`scripts/installer-upgrade.nsh` keeps an existing machine-wide installation in that scope and stops setup when a previous uninstaller fails. Standard electron-builder removal replaces the old registered files before installing the new version. Keep the app ID and NSIS GUID stable and `deleteAppDataOnUninstall` false. Run `npm run test:installer` on Windows to verify the upgrade hooks and isolated reinstall scenarios, including preserved profile data.

The custom finish page defines the **Launch MISO** checkbox explicitly; overriding the stock page means `runAfterFinish` alone is insufficient. Its callback mirrors electron-builder's assisted finish callback: `StdUtils.ExecShellAsUser` opens the installed shortcut, passing `--updated` only for an update, without waiting for the app to exit or inheriting the elevated installer context. Do not expand the `StartApp` macro here: the stock install section already expands it and its global variable cannot be declared twice. First launch opens onboarding; existing completed profiles open the pet.
