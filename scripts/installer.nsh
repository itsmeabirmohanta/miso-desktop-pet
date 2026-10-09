!macro customInstall
  CreateShortCut "$SMPROGRAMS\MISO (Safe Mode).lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--safe-mode"
  CreateShortCut "$DESKTOP\MISO (Safe Mode).lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--safe-mode"
  CreateShortCut "$SMPROGRAMS\MISO (Recovery Profile).lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--recovery-profile"
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\MISO (Safe Mode).lnk"
  Delete "$DESKTOP\MISO (Safe Mode).lnk"
  Delete "$SMPROGRAMS\MISO (Recovery Profile).lnk"
!macroend
