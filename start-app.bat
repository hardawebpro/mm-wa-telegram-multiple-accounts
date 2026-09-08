@echo off
setlocal EnableExtensions

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found / Node.js tidak ditemukan.
  echo Install Node.js LTS from https://nodejs.org/
  echo Install Node.js LTS dari https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found / npm tidak ditemukan.
  echo Reinstall Node.js LTS and ensure "Add to PATH" is checked.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] package.json not found. Run this file from the project folder.
  echo [ERROR] package.json tidak ditemukan. Jalankan file ini dari folder project.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Dependencies not installed / Dependensi belum terinstall.
  echo Running npm install...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed. Run setup-first-time.bat first.
    echo [ERROR] npm install gagal. Jalankan setup-first-time.bat terlebih dahulu.
    pause
    exit /b 1
  )
)

echo Starting MM WA Telegram Multiple Accounts...
call npm run dev

if errorlevel 1 (
  echo.
  echo [ERROR] Application failed to start / Aplikasi gagal dijalankan.
  pause
  exit /b 1
)

endlocal
