#!/usr/bin/env bash
# OpenClaw Gateway (MyOpenClaw embedded - macOS/Linux)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export OPENCLAW_STATE_DIR="$SCRIPT_DIR/.openclaw-myopenclaw"
export OPENCLAW_CONFIG_PATH="$OPENCLAW_STATE_DIR/openclaw.json"
export OPENCLAW_GATEWAY_PORT="${1:-18800}"
export OPENCLAW_SERVICE_MARKER="myopenclaw"
export OPENCLAW_SERVICE_KIND="gateway"
export OPENCLAW_SERVICE_VERSION="2026.2.21-2"

# Create config directory if not exists
mkdir -p "$OPENCLAW_STATE_DIR"

# Check if already running
if lsof -i "tcp:$OPENCLAW_GATEWAY_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Gateway already running on port $OPENCLAW_GATEWAY_PORT"
  exit 0
fi

# Find Node.js: prefer system node >= 22, fallback to bundled node
NODE_BIN=""
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 22 ] 2>/dev/null; then
    NODE_BIN="node"
  fi
fi
if [ -z "$NODE_BIN" ] && [ -x "$SCRIPT_DIR/node/node" ]; then
  NODE_BIN="$SCRIPT_DIR/node/node"
fi
if [ -z "$NODE_BIN" ]; then
  echo "Error: No Node.js >= 22 found. Install Node.js or use the full version of MyOpenClaw."
  exit 1
fi

# Start gateway
exec "$NODE_BIN" "$SCRIPT_DIR/openclaw-deps/openclaw/openclaw.mjs" gateway run \
  --port "$OPENCLAW_GATEWAY_PORT" \
  --allow-unconfigured
