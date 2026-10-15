Unicode true
Name "MISO isolated reinstall fixture"
OutFile "${TEST_EXE}"
RequestExecutionLevel user
SilentInstall silent
AutoCloseWindow true
!include LogicLib.nsh
!include "${NSIS_TEMPLATE_DIR}\include\StdUtils.nsh"
!addplugindir "${PLUGIN_DIRECTORY}\x86-unicode"
!define INSTALL_REGISTRY_KEY "${TEST_REGISTRY_KEY}\Install"
!define UNINSTALL_REGISTRY_KEY "${TEST_REGISTRY_KEY}\Uninstall"
!define isDeleteAppData `0 == 1`
Var installMode
Var appExe
Var isForceMachineInstall
!include "${POLICY_FILE}"
!include "${NSIS_TEMPLATE_DIR}\include\installUtil.nsh"

Section
  InitPluginsDir
  StrCpy $INSTDIR "${NEW_DIRECTORY}"
  StrCpy $installMode "CurrentUser"
  StrCpy $appExe "$INSTDIR\fixture.exe"
  WriteRegStr HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation" "${OLD_DIRECTORY}"
  WriteRegStr HKCU "${UNINSTALL_REGISTRY_KEY}" "UninstallString" '$\"${OLD_UNINSTALLER}$\" /currentuser'
  !insertmacro uninstallOldVersion HKEY_CURRENT_USER
  !insertmacro handleUninstallResult HKEY_CURRENT_USER
  IfFileExists "${OLD_DIRECTORY}\old-app.txt" removal_failed
  IfFileExists "${PROFILE_MARKER}" profile_kept
  removal_failed:
    SetErrorLevel 22
    Quit
  profile_kept:
  ClearErrors
  ReadRegStr $0 HKCU "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
  ${If} $0 != ""
    SetErrorLevel 23
    Quit
  ${EndIf}
  CreateDirectory "$INSTDIR"
  FileOpen $1 "$INSTDIR\new-app.txt" w
  FileWrite $1 "new-version"
  FileClose $1
  SetErrorLevel 0
SectionEnd
