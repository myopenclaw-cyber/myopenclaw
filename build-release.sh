#!/usr/bin/env bash
set -euo pipefail

PLATFORM="${1:-mac}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BASE_OUT="$(cd "$(dirname "$0")" && pwd)/dist/${STAMP}"

mkdir -p "$BASE_OUT"
echo "[build] timestamp: $STAMP"
echo "[build] output: $BASE_OUT"

run_build() {
  local variant="$1"
  local config="$2"
  local outdir="$BASE_OUT/$variant"
  mkdir -p "$outdir"

  if [[ "$PLATFORM" == "win" ]]; then
    BUILD_VARIANT="$variant" npx electron-builder --win --x64 -c "$config" --config.directories.output="$outdir" --config.compression=maximum
  elif [[ "$PLATFORM" == "mac" ]]; then
    local outdir_x64="$outdir/x64"
    local outdir_arm64="$outdir/arm64"
    mkdir -p "$outdir_x64" "$outdir_arm64"
    echo "[build] starting x64 and arm64 in parallel..."
    BUILD_VARIANT="$variant" npx electron-builder --mac --x64 -c "$config" --config.directories.output="$outdir_x64" --config.compression=maximum &
    local pid_x64=$!
    BUILD_VARIANT="$variant" npx electron-builder --mac --arm64 -c "$config" --config.directories.output="$outdir_arm64" --config.compression=maximum &
    local pid_arm64=$!
    wait $pid_x64 || { echo "[error] x64 build failed"; exit 1; }
    wait $pid_arm64 || { echo "[error] arm64 build failed"; exit 1; }
  else
    echo "Unsupported platform: $PLATFORM"
    exit 1
  fi
}

run_build "simple" "build/simple.json"
# run_build "full" "build/full.json"

echo "[done] builds are in: $BASE_OUT"
