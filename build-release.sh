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
    BUILD_VARIANT="$variant" npx electron-builder --mac --x64 --arm64 -c "$config" --config.directories.output="$outdir" --config.compression=maximum
  else
    echo "Unsupported platform: $PLATFORM"
    exit 1
  fi
}

run_build "simple" "build/simple.json"
run_build "full" "build/full.json"

echo "[done] builds are in: $BASE_OUT"
