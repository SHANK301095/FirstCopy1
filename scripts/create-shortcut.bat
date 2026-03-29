@echo off
REM ============================================
REM  Create Desktop Shortcut for MMC App
REM ============================================

cd /d "%~dp0\.."

set "APP_NAME=EA Backtesting Studio"
set "PROJECT_DIR=%cd%"
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP%\%APP_NAME%.lnk"

echo Creating desktop shortcut...

REM Create VBScript to make shortcut (Windows native method)
set "VBS_FILE=%TEMP%\create_shortcut.vbs"

(
echo Set oWS = WScript.CreateObject("WScript.Shell"^)
echo sLinkFile = "%SHORTCUT_PATH%"
echo Set oLink = oWS.CreateShortcut(sLinkFile^)
echo oLink.TargetPath = "%PROJECT_DIR%\start-app.bat"
echo oLink.WorkingDirectory = "%PROJECT_DIR%"
echo oLink.Description = "EA Backtesting Studio - Trading Strategy Tester"
echo oLink.IconLocation = "%PROJECT_DIR%\public\favicon.ico"
echo oLink.Save
) > "%VBS_FILE%"

cscript //nologo "%VBS_FILE%"
del "%VBS_FILE%"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo [SUCCESS] Desktop shortcut created!
    echo Location: %SHORTCUT_PATH%
    echo.
) else (
    echo.
    echo [ERROR] Failed to create shortcut.
    echo Try running as Administrator.
    echo.
)

pause
