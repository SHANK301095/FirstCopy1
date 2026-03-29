@echo off
REM MMC Desktop Development - One-Click Launcher
REM Starts Backend + Vite + Electron with proper sequencing

echo.
echo ========================================
echo   MMC Desktop Dev Launcher
echo ========================================
echo.

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0desktop-dev.ps1"

if %errorlevel% neq 0 (
    echo.
    echo Failed to start. Check the error above.
    pause
)
