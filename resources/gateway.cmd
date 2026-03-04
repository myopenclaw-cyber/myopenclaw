@echo off
rem OpenClaw Gateway (MyOpenClaw embedded)
set "TMPDIR=C:\Users\ADMINI~1\AppData\Local\Temp"
set "PATH=C:\Python314\Scripts\;C:\Python314\;C:\WINDOWS\system32;C:\WINDOWS;C:\WINDOWS\System32\Wbem;C:\WINDOWS\System32\WindowsPowerShell\v1.0\;C:\WINDOWS\System32\OpenSSH\;C:\Program Files\dotnet\;C:\Program Files\Docker\Docker\resources\bin;C:\Program Files\nodejs\;C:\ProgramData\chocolatey\bin;C:\Program Files\Git\cmd;C:\Users\Administrator\AppData\Local\Microsoft\WindowsApps;C:\Users\Administrator\AppData\Roaming\npm"
set "OPENCLAW_STATE_DIR=%~dp0.openclaw-myopenclaw"
set "OPENCLAW_CONFIG_PATH=%~dp0.openclaw-myopenclaw\openclaw.json"
set "OPENCLAW_GATEWAY_PORT=%~1"
if "%OPENCLAW_GATEWAY_PORT%"=="" set "OPENCLAW_GATEWAY_PORT=18800"
set "OPENCLAW_SERVICE_MARKER=myopenclaw"
set "OPENCLAW_SERVICE_KIND=gateway"
set "OPENCLAW_SERVICE_VERSION=2026.2.21-2"

rem Create config directory if not exists
if not exist "%~dp0.openclaw-myopenclaw" mkdir "%~dp0.openclaw-myopenclaw"

rem Create default config with provider + fixed token if not exists
if not exist "%OPENCLAW_CONFIG_PATH%" (
    echo {"models":{"mode":"merge","providers":{"aws2":{"baseUrl":"https://www.ai678.top","api":"anthropic-messages","apiKey":"","models":[{"id":"claude-sonnet-4-6","name":"Claude Sonnet 4.6","contextWindow":180000,"maxTokens":8192}]}}},"agents":{"defaults":{"model":{"primary":"aws2/claude-sonnet-4-6"}}},"gateway":{"auth":{"mode":"token","token":"myopenclaw_2024_secure_token_a8f3e9d2c1b7f6e5d4c3b2a1"},"http":{"endpoints":{"chatCompletions":{"enabled":true}}}}} > "%OPENCLAW_CONFIG_PATH%"
)

rem Check if already running (must be LISTENING)
netstat -ano | findstr "127.0.0.1:%OPENCLAW_GATEWAY_PORT%" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Gateway already running on port %OPENCLAW_GATEWAY_PORT%
    exit /b 0
)

rem Start gateway
node "%~dp0openclaw-deps\openclaw\openclaw.mjs" gateway run --port %OPENCLAW_GATEWAY_PORT% --allow-unconfigured
