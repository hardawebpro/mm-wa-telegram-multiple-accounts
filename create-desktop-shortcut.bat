@echo off
setlocal EnableExtensions

set "APP_NAME=MM WA Telegram Multiple Accounts"
set "PROJECT_DIR=%~dp0"
set "TARGET=%PROJECT_DIR%start-app.vbs"
set "SHORTCUT=%USERPROFILE%\Desktop\%APP_NAME%.lnk"

if exist "%PROJECT_DIR%resources\256.ico" (
  set "ICON=%PROJECT_DIR%resources\256.ico"
) else if exist "%PROJECT_DIR%resources\256.png" (
  set "ICON=%PROJECT_DIR%resources\256.png"
) else (
  echo [ERROR] Icon not found in resources\ / Icon tidak ditemukan di resources\
  pause
  exit /b 1
)

if not exist "%TARGET%" (
  echo [ERROR] start-app.vbs not found at: %TARGET%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$shell = New-Object -ComObject WScript.Shell;" ^
  "$shortcut = $shell.CreateShortcut('%SHORTCUT%');" ^
  "$shortcut.TargetPath = '%TARGET%';" ^
  "$shortcut.WorkingDirectory = '%PROJECT_DIR%';" ^
  "$shortcut.IconLocation = '%ICON%,0';" ^
  "$shortcut.Description = 'Manage multiple WhatsApp and Telegram accounts';" ^
  "$shortcut.Save()"

if errorlevel 1 (
  echo [ERROR] Failed to create shortcut / Gagal membuat shortcut.
  echo See docs/HOW_TO_USE for manual shortcut steps in File Explorer.
  pause
  exit /b 1
)

echo.
echo Shortcut created / Shortcut berhasil dibuat:
echo %SHORTCUT%
echo.
echo Double-click the Desktop shortcut to launch the app.
echo Double-click shortcut Desktop untuk menjalankan aplikasi.

endlocal
