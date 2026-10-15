Unicode true
Name "MISO isolated upgrade policy test"
OutFile "${TEST_EXE}"
RequestExecutionLevel user
SilentInstall silent
AutoCloseWindow true
!include LogicLib.nsh
!include "${POLICY_FILE}"

Var isForceMachineInstall

Section
  StrCpy $isForceMachineInstall "0"
  !insertmacro misoPreferExistingMachineInstall "${OLD_LOCATION}" "${OLD_UNINSTALLER}"
  StrCmp $isForceMachineInstall "${EXPECTED_MACHINE}" scope_ok
    SetErrorLevel 10
    Quit
  scope_ok:

  StrCpy $R0 ${UNINSTALL_RESULT}
  !if ${LAUNCH_ERROR} == 1
    SetErrors
  !else
    ClearErrors
  !endif
  !if ${CURRENT_USER_CHECK} == 1
    !insertmacro customUnInstallCheckCurrentUser
  !else
    !insertmacro customUnInstallCheck
  !endif

  ; Reaching this marker represents permission to start copying the new app.
  FileOpen $1 "${SUCCESS_MARKER}" w
  FileWrite $1 "previous-install-removal-succeeded"
  FileClose $1
  SetErrorLevel 0
SectionEnd
