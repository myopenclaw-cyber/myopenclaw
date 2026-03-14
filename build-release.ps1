param(
  [ValidateSet('win','mac')]
  [string]$Platform = 'win'
)

$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$baseOut = Join-Path $PSScriptRoot ("dist\" + $stamp)
New-Item -ItemType Directory -Force -Path $baseOut | Out-Null

Write-Host "[build] timestamp: $stamp"
Write-Host "[build] output: $baseOut"

function Run-Build($variant, $configFile) {
  $outDir = Join-Path $baseOut $variant
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null

  Get-ChildItem $outDir -File -Filter "*.exe" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  Get-ChildItem $outDir -File -Filter "*.__uninstaller.exe" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

  if ($Platform -eq 'win') {
    $cmd = "set BUILD_VARIANT=$variant&& npx electron-builder --win --x64 -c $configFile --config.directories.output=$outDir --config.compression=maximum"
  } else {
    $cmd = "set BUILD_VARIANT=$variant&& npx electron-builder --mac --x64 --arm64 -c $configFile --config.directories.output=$outDir --config.compression=maximum"
  }

  Write-Host "[build:$variant] $cmd"
  cmd /c $cmd
  if ($LASTEXITCODE -ne 0) { throw "build failed: $variant" }
}

Run-Build 'simple' 'build/simple.json'
Run-Build 'full' 'build/full.json'

Write-Host "[done] builds are in: $baseOut"
