$ErrorActionPreference = 'Stop'

Write-Host '[preflight] MyOpenClaw checks starting...'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$checks = @(
  @{ Name='main.js exists'; Path='main.js' },
  @{ Name='index.html exists'; Path='index.html' },
  @{ Name='preload.js exists'; Path='preload.js' },
  @{ Name='gateway.cmd exists'; Path='resources/gateway.cmd' },
  @{ Name='runtime dir exists'; Path='resources/openclaw-deps/openclaw' },
  @{ Name='embedded state dir exists'; Path='resources/.openclaw-myopenclaw' }
)

$failed = $false
foreach ($c in $checks) {
  $ok = Test-Path (Join-Path $root $c.Path)
  if ($ok) { Write-Host "[ok] $($c.Name)" -ForegroundColor Green }
  else { Write-Host "[fail] $($c.Name): $($c.Path)" -ForegroundColor Red; $failed = $true }
}

# Validate embedded config JSON if present
$configPath = Join-Path $root 'resources/.openclaw-myopenclaw/openclaw.json'
if (Test-Path $configPath) {
  try {
    $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
    Write-Host '[ok] openclaw.json parseable' -ForegroundColor Green
    if ($cfg.models -and $cfg.models.PSObject.Properties['default']) {
      Write-Host '[warn] models.default is present (recommended to remove for compatibility)' -ForegroundColor Yellow
    }
  } catch {
    Write-Host "[fail] openclaw.json invalid JSON: $($_.Exception.Message)" -ForegroundColor Red
    $failed = $true
  }
} else {
  Write-Host '[warn] openclaw.json not found yet (first run may create it)' -ForegroundColor Yellow
}

if ($failed) {
  Write-Host '[preflight] FAILED' -ForegroundColor Red
  exit 1
}

Write-Host '[preflight] PASSED' -ForegroundColor Green
