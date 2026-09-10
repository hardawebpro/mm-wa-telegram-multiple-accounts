@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo ============================================================
echo  MM WA Telegram Multiple Accounts - First-time Setup
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found / Node.js tidak ditemukan.
  echo Install Node.js LTS from https://nodejs.org/
  echo Install Node.js LTS dari https://nodejs.org/
  echo Then close and reopen Command Prompt, then run this file again.
  echo Tutup dan buka ulang Command Prompt, lalu jalankan file ini lagi.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found / npm tidak ditemukan.
  echo Reinstall Node.js LTS and ensure "Add to PATH" is checked.
  echo Install ulang Node.js LTS dan centang "Add to PATH".
  pause
  exit /b 1
)

echo Node: 
node -v
echo npm:
npm -v
echo.

if not exist "node_modules\" (
  echo Installing dependencies / Menginstall dependensi...
  echo This may take a few minutes / Proses ini bisa beberapa menit.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed / npm install gagal.
    echo Try: delete node_modules folder and run this file again.
    echo Coba: hapus folder node_modules lalu jalankan file ini lagi.
    pause
    exit /b 1
  )
) else (
  echo Dependencies already installed / Dependensi sudah terinstall.
  echo.
)

if not exist "start-app.vbs" (
  echo [ERROR] start-app.vbs not found in project folder.
  pause
  exit /b 1
)

echo Creating shortcuts / Membuat shortcut...
echo - Desktop shortcut
echo - Start Menu shortcut ^(Windows notification display name^)
call "%~dp0create-desktop-shortcut.bat"
if errorlevel 1 (
  echo.
  echo [WARN] Shortcut creation failed. See docs/HOW_TO_USE for manual steps.
  echo [WARN] Pembuatan shortcut gagal. Lihat docs/HOW_TO_USE untuk langkah manual.
  pause
  exit /b 1
)

echo.
echo Setup complete / Setup selesai.
echo Launch from Desktop or Start Menu shortcut next time.
echo Jalankan dari shortcut Desktop atau Start Menu berikutnya.
echo.
echo If Windows notifications still show com.jbs... at the top, log out and back in once.
echo Jika notifikasi masih menampilkan com.jbs... di atas, logout/login Windows sekali.
echo.

endlocal
