Unicode true
!include "MUI2.nsh"

!ifndef APP_VERSION
  !define APP_VERSION "2.1.0"
!endif
!ifndef SOURCE_DIR
  !define SOURCE_DIR "..\release\Newprotec Vina HRM-win32-x64"
!endif
!ifndef OUT_FILE
  !define OUT_FILE "..\release\Newprotec-Vina-HRM-Setup-${APP_VERSION}-win-x64.exe"
!endif
!ifndef ICON_FILE
  !define ICON_FILE "..\dist-electron-app\icon.ico"
!endif

Name "Newprotec Vina HRM"
OutFile "${OUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\Newprotec Vina HRM"
InstallDirRegKey HKCU "Software\NewprotecVinaHRM" "Install_Dir"
RequestExecutionLevel user
SetCompressor /SOLID lzma

!define MUI_ICON "${ICON_FILE}"
!define MUI_UNICON "${ICON_FILE}"
!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\Newprotec Vina HRM.exe"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Newprotec Vina HRM" SecMain
  SetOutPath "$INSTDIR"
  File /r "${SOURCE_DIR}\*.*"

  WriteRegStr HKCU "Software\NewprotecVinaHRM" "Install_Dir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NewprotecVinaHRM" "DisplayName" "Newprotec Vina HRM"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NewprotecVinaHRM" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NewprotecVinaHRM" "Publisher" "Newprotec Vina"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NewprotecVinaHRM" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateDirectory "$SMPROGRAMS\Newprotec Vina HRM"
  CreateShortcut "$SMPROGRAMS\Newprotec Vina HRM\Newprotec Vina HRM.lnk" "$INSTDIR\Newprotec Vina HRM.exe"
  CreateShortcut "$SMPROGRAMS\Newprotec Vina HRM\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Newprotec Vina HRM.lnk" "$INSTDIR\Newprotec Vina HRM.exe"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Newprotec Vina HRM.lnk"
  RMDir /r "$SMPROGRAMS\Newprotec Vina HRM"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NewprotecVinaHRM"
  DeleteRegKey HKCU "Software\NewprotecVinaHRM"
SectionEnd
