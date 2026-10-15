Unicode true
Name "MISO isolated old-uninstaller fixture"
OutFile "${OLD_UNINSTALLER}"
RequestExecutionLevel user
SilentInstall silent
AutoCloseWindow true
!include LogicLib.nsh
!include FileFunc.nsh
!include StrFunc.nsh
${StrStr}
Section
  ${GetParameters} $0
  ${StrStr} $1 $0 "/KEEP_APP_DATA"
  ${StrStr} $2 $0 "--updated"
  ${If} $1 == ""
  ${OrIf} $2 == ""
    SetErrorLevel 21
    Quit
  ${EndIf}
  ; Every path is an explicit file inside the runner's fresh fixture directory.
  Delete "${OLD_DIRECTORY}\old-app.txt"
  Delete "${OLD_UNINSTALLER}"
  RMDir "${OLD_DIRECTORY}"
  DeleteRegKey HKCU "${TEST_REGISTRY_KEY}\Install"
  DeleteRegKey HKCU "${TEST_REGISTRY_KEY}\Uninstall"
  SetErrorLevel 0
SectionEnd
