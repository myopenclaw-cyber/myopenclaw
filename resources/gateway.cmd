@echo off
rem OpenClaw Gateway (MyOpenClaw embedded)
set "OPENCLAW_STATE_DIR=%~dp0.openclaw-myopenclaw"
set "OPENCLAW_CONFIG_PATH=%~dp0.openclaw-myopenclaw\openclaw.json"
set "OPENCLAW_GATEWAY_PORT=%~1"
if "%OPENCLAW_GATEWAY_PORT%"=="" set "OPENCLAW_GATEWAY_PORT=18800"
set "OPENCLAW_SERVICE_MARKER=myopenclaw"
set "OPENCLAW_SERVICE_KIND=gateway"
set "OPENCLAW_SERVICE_VERSION=2026.2.21-2"

rem Create config directory if not exists
if not exist "%~dp0.openclaw-myopenclaw" mkdir "%~dp0.openclaw-myopenclaw"

rem Create default config with fixed token if not exists
if not exist "%OPENCLAW_CONFIG_PATH%" (
    echo {"models":{"mode":"merge","providers":{}},"gateway":{"auth":{"mode":"token","token":"myopenclaw_2024_secure_token_a8f3e9d2c1b7f6e5d4c3b2a1"},"http":{"endpoints":{"chatCompletions":{"enabled":true}}}}} > "%OPENCLAW_CONFIG_PATH%"
)

rem Check if already running (must be LISTENING)
netstat -ano | findstr "127.0.0.1:%OPENCLAW_GATEWAY_PORT%" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Gateway already running on port %OPENCLAW_GATEWAY_PORT%
    exit /b 0
)

rem Find Node.js: prefer system node >= 22, fallback to bundled node
set "NODE_BIN="
where node >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
    for /f "tokens=1 delims=." %%m in ("!NODE_VER:v=!") do set "NODE_MAJOR=%%m"
)
setlocal enabledelayedexpansion
if defined NODE_MAJOR (
    if !NODE_MAJOR! GEQ 22 (
        set "NODE_BIN=node"
    )
)
endlocal & set "NODE_BIN=%NODE_BIN%"
if "%NODE_BIN%"=="" (
    if exist "%~dp0node\node.exe" (
        set "NODE_BIN=%~dp0node\node.exe"
    )
)
if "%NODE_BIN%"=="" (
    echo Error: No Node.js ^>= 22 found. Install Node.js or use the full version of MyOpenClaw.
    exit /b 1
)

rem Start gateway
"%NODE_BIN%" "%~dp0openclaw-deps\openclaw\openclaw.mjs" gateway run --port %OPENCLAW_GATEWAY_PORT% --allow-unconfigured
