@echo off
rem Double-click this file to start FDE Trainer on Windows.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
echo.
echo The app has stopped. Press any key to close this window.
pause >nul
