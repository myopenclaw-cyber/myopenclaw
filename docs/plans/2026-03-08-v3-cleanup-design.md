# V3 Cleanup Design - BYOK-Only MVP

## Goal
Strip V2 down to a clean BYOK-only desktop app: local OpenClaw Gateway + user-provided API keys + single-agent chat. Remove all premium/payment/backend/multi-agent/channel dead code.

## Phase 1: Dead Code Removal + UI Cleanup + i18n

### main.js cleanup
Remove:
- `getDefaultLocalAppConfig()`, `loadLocalAppConfig()`, `saveLocalAppConfig()` (Stripe/JWT/backend config)
- `ensureBackendUser()`, `checkQuotaByBackend()`, `consumeQuotaByBackend()` (backend user/quota)
- `checkPremiumGate()`, `consumeQuota()` (premium gate logic)
- IPC handlers: `create-checkout-session`, `set-user-api-key`, `set-premium-status`, `set-premium-tier`, `add-agent`, `rename-agent`, `delete-agent`, `set-agent-channels`, `save-agent-channel-config`, `get-local-app-config`, `save-local-app-config`

Simplify `getDefaultAppState()`:
```javascript
{ activeAgentId: 'main', conversations: {} }
```

Simplify `get-app-state` handler: return state directly without backend quota check.

### preload.js cleanup
Remove corresponding bridge functions: `setPremiumStatus`, `setPremiumTier`, `createCheckoutSession`, `setUserApiKey`, `addAgent`, `renameAgent`, `deleteAgent`, `setAgentChannels`, `saveAgentChannelConfig`, `getLocalAppConfig`, `saveLocalAppConfig`

Keep: `getProviderConfig`, `saveProviderConfig`, `deleteProviderConfig`, `resetModelConfig`

### index.html cleanup
- Delete Account page premium buttons (Set Free/Premium/Pro, Upgrade)
- Replace Account page with version info display
- Delete Agents page Add/Rename/Delete form (keep read-only Main Agent display)
- Delete `upgradeModalMask` modal entirely
- Delete `+ New Agent` entry in chat tree
- Remove JS functions: `choosePlan`, `setTier`, `buyPremium`, `showUpgradeModal`, `closeUpgradeModal`, `addAgent` (UI version)
- Remove premium-related i18n entries
- Simplify `refreshState()` to not show premium info

### setup.html
Convert from Chinese to English (matches spec: "UI forced English")

### Delete directories/files
- `backend-api/` entire directory
- `assets/premium/images/icon-free-shield.jpg`
- `assets/premium/images/icon-premium-crown.jpg`
- `assets/premium/images/icon-pro-rocket.jpg`
- `LOCAL_APP_CONFIG_FILE` reference and file

## Phase 2: Security + macOS Support + Error Handling

### Gateway token randomization
- Remove hardcoded `myopenclaw_2024_secure_token_a8f3e9d2c1b7f6e5d4c3b2a1` from main.js
- On startup, generate random token via `crypto.randomUUID()`
- Write token into `openclaw.json` gateway.auth.token before launching gateway
- Read token back via `readGatewayTokenFromConfig()` (already exists)

### macOS gateway startup
Current code uses `cmd.exe` — only works on Windows.

Create `resources/gateway.sh`:
```bash
#!/usr/bin/env bash
export OPENCLAW_STATE_DIR="$(dirname "$0")/.openclaw-myopenclaw"
export OPENCLAW_CONFIG_PATH="$OPENCLAW_STATE_DIR/openclaw.json"
export OPENCLAW_GATEWAY_PORT="${1:-18800}"
node "$(dirname "$0")/openclaw-deps/openclaw/openclaw.mjs" gateway run --port "$OPENCLAW_GATEWAY_PORT" --allow-unconfigured
```

Modify `startGateway()` in main.js:
```javascript
if (process.platform === 'win32') {
  gatewayProcess = spawn('cmd.exe', ['/c', gatewayCmdPath, String(gatewayPort)], { ... });
} else {
  const shPath = path.join(__dirname, 'resources', 'gateway.sh');
  gatewayProcess = spawn('bash', [shPath, String(gatewayPort)], { ... });
}
```

### Intel Mac support
- Update `build/simple.json` mac arch: `["arm64", "x64"]`
- Update `build/full.json` mac arch already has both
- `runtime-manifest.json`: mac_intel URL to be populated after CI build
- Update `build-runtime.yml` workflow to build Intel Mac runtime

### Error handling
- `error.html` already has Retry button — verify it works
- Add `error.html` to build files lists (missing from simple.json and full.json)

## Phase 3: Build Verification

### Build config consistency
- Add `error.html` to files list in `simple.json`, `full.json`, and `package.json`
- Add `resources/gateway.sh` to files list (for macOS builds)
- Verify all referenced files exist

### Local build test
- Run `npx electron-builder --mac --arm64 -c build/simple.json` to verify Mac build
- Check output artifact structure

### Runtime manifest
- Intel Mac runtime URL: populate after CI workflow runs
- Verify existing Windows and Mac Silicon URLs still valid

## Decisions
- No code signing (MVP, users manually allow)
- No safeStorage for API keys (defer to post-MVP)
- No auto-update mechanism (defer)
- Mac support: new `gateway.sh` script, platform branching in main.js
- Intel Mac runtime: needs CI build + upload to GitHub Release
