!include "${__FILEDIR__}\installer-upgrade.nsh"

!macro customInstall
  CreateShortCut "$SMPROGRAMS\MISO (Safe Mode).lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--safe-mode"
  WinShell::SetLnkAUMI "$SMPROGRAMS\MISO (Safe Mode).lnk" "${APP_ID}"
  CreateShortCut "$DESKTOP\MISO (Safe Mode).lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--safe-mode"
  WinShell::SetLnkAUMI "$DESKTOP\MISO (Safe Mode).lnk" "${APP_ID}"
  CreateShortCut "$SMPROGRAMS\MISO (Recovery Profile).lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--recovery-profile"
  WinShell::SetLnkAUMI "$SMPROGRAMS\MISO (Recovery Profile).lnk" "${APP_ID}"
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\MISO (Safe Mode).lnk"
  Delete "$DESKTOP\MISO (Safe Mode).lnk"
  Delete "$SMPROGRAMS\MISO (Recovery Profile).lnk"
!macroend
; Shared MISO colors and product copy for the assisted installer and uninstaller.
!define MUI_BGCOLOR "FFF9EF"
!define MUI_TEXTCOLOR "1E1E2E"
!define MUI_HEADER_TRANSPARENT_TEXT

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Meet MISO, your little butler"
  !define MUI_WELCOMEPAGE_TEXT "A little company on your desktop. A little help remembering what matters.$\r$\n$\r$\nMISO brings your Google Calendar meetings, reminders, tasks and important dates together with a small desktop companion.$\r$\n$\r$\nConnect your own Google account after installation. AI commands are optional.$\r$\n$\r$\nClick Next to make room for MISO."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customFinishPage
  Function MisoLaunchAfterSetup
    ; Match the stock assisted finish callback. Expanding StartApp here would
    ; redeclare its global variable when installSection also expands it.
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_TEXT "Launch MISO"
  !define MUI_FINISHPAGE_RUN_FUNCTION "MisoLaunchAfterSetup"
  !define MUI_FINISHPAGE_TITLE "MISO is ready to meet you"
  !define MUI_FINISHPAGE_TEXT "Your little butler is installed.$\r$\n$\r$\nLeave Launch MISO checked to meet your companion. First-time setup walks you through Google sign-in, optional AI, and calendar sync.$\r$\n$\r$\nYou can also open MISO later from the Start menu or your desktop shortcut.$\r$\n$\r$\nClick Finish to close setup."
  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "See you later, boss"
  !define MUI_WELCOMEPAGE_TEXT "This wizard will remove MISO from your computer.$\r$\n$\r$\nYour events in Google Calendar will stay in Google Calendar.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
