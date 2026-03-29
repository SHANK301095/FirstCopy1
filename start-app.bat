@echo off
title MMC Desktop Launcher
color 0A

echo ========================================
echo    MMC EA Backtesting Studio Launcher
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Starting Vite dev server...
start "Vite Server" cmd /k "npm run dev"

echo [2/4] Waiting for Vite to start (15 seconds)...
timeout /t 15 /nobreak >nul

echo [3/4] Compiling Electron TypeScript...
call npx tsc -p electron/tsconfig.json
if %errorlevel% neq 0 (
    echo.
    echo ERROR: TypeScript compilation failed!
    echo Check electron/main.ts for syntax errors.
    pause
    exit /b 1
)

echo [4/4] Launching Electron app...
start "Electron App" npx electron dist-electron/main.js

echo.
echo ========================================
echo    App launched successfully!
echo    Close this window anytime.
echo ========================================
echo.
pause
