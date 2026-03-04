@echo off
setlocal
cd /d "%~dp0"

echo [MyOpenClaw] Starting app...
start "" cmd /c "npm start"
echo [MyOpenClaw] Started. You can close this window.
endlocal
