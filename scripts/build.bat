@echo off
setlocal enabledelayedexpansion
REM ============================================
REM  EA Backtesting Studio - Production Builder
REM  Creates Windows installer with shortcuts
REM ============================================

title MMC Production Builder
color 0A

echo.
echo ========================================
echo   EA Backtesting Studio - Builder
echo ========================================
echo.

cd /d "%~dp0\.."

REM Check prerequisites
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

REM Step 1: Clean previous builds
echo [1/5] Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist dist-electron rmdir /s /q dist-electron
if exist release rmdir /s /q release
echo       Done.

REM Step 2: Install dependencies if needed
if not exist node_modules (
    echo [2/5] Installing npm dependencies...
    call npm install
) else (
    echo [2/5] Dependencies already installed.
)

REM Step 3: Build frontend
echo [3/5] Building frontend (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)
echo       Frontend built to dist/

REM Step 4: Build Electron main process
echo [4/5] Compiling Electron TypeScript...
call npx tsc -p electron/tsconfig.json
if %errorlevel% neq 0 (
    echo [ERROR] Electron TypeScript compilation failed!
    pause
    exit /b 1
)
echo       Electron compiled to dist-electron/

REM Step 5: Package with electron-builder
echo [5/5] Packaging desktop app with electron-builder...
call npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo [ERROR] Electron-builder failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.
echo Output files in 'release' folder:
dir /b release\*.exe 2>nul
echo.

REM Ask to create desktop shortcut
set /p CREATE_SHORTCUT="Create desktop shortcut? (Y/N): "
if /i "!CREATE_SHORTCUT!"=="Y" (
    call "%~dp0create-shortcut.bat"
)

echo.
echo Done! You can now:
echo  1. Run the installer from 'release' folder
echo  2. Or run 'start-app.bat' for development
echo.
pause
