@echo off
REM ============================================
REM  Install Production Build + Create Shortcuts
REM ============================================

cd /d "%~dp0\.."

echo.
echo ========================================
echo   EA Backtesting Studio - Installer
echo ========================================
echo.

REM Find the installer in release folder
set "INSTALLER="
for %%f in (release\*.exe) do (
    set "INSTALLER=%%f"
)

if not defined INSTALLER (
    echo [ERROR] No installer found in 'release' folder!
    echo.
    echo Run 'scripts\build.bat' first to create the installer.
    echo.
    pause
    exit /b 1
)

echo Found installer: %INSTALLER%
echo.
echo Starting installation...
echo.

REM Run the installer
start "" "%INSTALLER%"

echo.
echo ========================================
echo   Installation started!
echo ========================================
echo.
echo The installer window should open.
echo Follow the prompts to complete installation.
echo.
echo After installation:
echo  - Desktop shortcut will be created automatically
echo  - Start Menu shortcut will be created
echo  - App can be launched from Start Menu
echo.
pause
