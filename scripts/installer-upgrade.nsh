!ifndef MISO_INSTALLER_UPGRADE_INCLUDED
!define MISO_INSTALLER_UPGRADE_INCLUDED

; Keep a machine-wide installation machine-wide. The standard NSIS install
; section then uninstalls both HKLM and the current user's HKCU registration
; before copying the new files, including when the destination changes.
!macro misoPreferExistingMachineInstall installLocation uninstallCommand
  ${If} "${installLocation}" != ""
  ${OrIf} "${uninstallCommand}" != ""
    StrCpy $isForceMachineInstall "1"
  ${EndIf}
!macroend

!macro customInstallMode
  !ifndef BUILD_UNINSTALLER
    Push $R8
    Push $R9
    ReadRegStr $R8 HKLM "${INSTALL_REGISTRY_KEY}" "InstallLocation"
    ReadRegStr $R9 HKLM "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
    !insertmacro misoPreferExistingMachineInstall "$R8" "$R9"
    Pop $R9
    Pop $R8
  !endif
!macroend

; Silent installs skip the install-mode page, so enforce the same rule during
; initialization instead of allowing /currentuser to bypass an existing HKLM copy.
!macro customInit
  ${If} ${Silent}
    StrCpy $isForceMachineInstall "0"
    !insertmacro customInstallMode
    ${If} $isForceMachineInstall == "1"
      ${IfNot} ${UAC_IsAdmin}
        !insertmacro UAC_RunElevated
        Quit
      ${EndIf}
      !insertmacro setInstallModePerAllUsers
    ${EndIf}
  ${EndIf}
!macroend

; The stock handler can continue after a launch error (e.g. a missing old
; uninstaller). A failed removal must not leave two installations behind.
!macro misoCheckPreviousUninstall
  ${If} ${Errors}
    MessageBox MB_OK|MB_ICONSTOP "MISO could not run the previous installation's uninstaller. Repair or remove that installation in Windows Settings, then run this installer again. Your saved accounts and settings have been kept." /SD IDOK
    SetErrorLevel 2
    Quit
  ${EndIf}
  ${If} $R0 != 0
    MessageBox MB_OK|MB_ICONSTOP "MISO could not finish removing the previous installation (code $R0). Close the old app and try again. Your saved accounts and settings have been kept." /SD IDOK
    SetErrorLevel 2
    Quit
  ${EndIf}
!macroend

!macro customUnInstallCheck
  !insertmacro misoCheckPreviousUninstall
!macroend

!macro customUnInstallCheckCurrentUser
  !insertmacro misoCheckPreviousUninstall
!macroend

!endif
