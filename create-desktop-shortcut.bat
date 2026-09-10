@echo off
setlocal EnableExtensions

set "APP_NAME=MM WA Telegram Multiple Accounts"
set "APP_USER_MODEL_ID=com.jbs.mm-wa-telegram-multiple-accounts"
set "PROJECT_DIR=%~dp0"
set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

if not exist "%PROJECT_DIR%\start-app.vbs" (
  echo [ERROR] start-app.vbs not found in project folder.
  pause
  exit /b 1
)

if not exist "%PROJECT_DIR%\scripts\create-windows-shortcuts.ps1" (
  echo [ERROR] scripts\create-windows-shortcuts.ps1 not found.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%\scripts\create-windows-shortcuts.ps1" -ProjectDir "%PROJECT_DIR%" -AppName "%APP_NAME%" -AppUserModelId "%APP_USER_MODEL_ID%"
if errorlevel 1 (
  echo [ERROR] Failed to create shortcuts / Gagal membuat shortcut.
  pause
  exit /b 1
)

echo.
echo Shortcuts created / Shortcut berhasil dibuat:
echo - Desktop
echo - Start Menu ^(for proper Windows notification name^)
echo.
echo Launch the app from either shortcut after setup.
echo Jalankan app dari shortcut Desktop atau Start Menu setelah setup.

endlocal
