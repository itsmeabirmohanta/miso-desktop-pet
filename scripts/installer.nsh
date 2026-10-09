!macro customInstall
  CreateShortCut "$SMPROGRAMS\MISO (Safe Mode).lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--safe-mode"
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\MISO (Safe Mode).lnk"
!macroend
