# Relay + Subscription Design — V3.1

## Context

V3 stripped MyOpenClaw to a BYOK-only MVP. Now we add back:
1. **Cloud Relay** — paid users can use AI without their own API key
2. **Subscription System** — tiered plans gate features and relay access

## Architecture

### Two Message Paths

```
Free (BYOK):     UI → main.js → OpenClaw Gateway (localhost) → user's API key
Paid (Relay):    UI → main.js → Cloud Relay Service → server-held API key
```

### Module A: Relay Integration (client-side only)

**Files changed:** `main.js`, `preload.js`, `index.html`

1. `send-message` IPC handler gains dual-path routing:
   - Has local provider config → existing gateway path
   - Has relay config + valid subscription → POST to cloud relay
2. New IPC handlers:
   - `save-relay-config` — save relay URL + auth token
   - `get-relay-config` — read relay config
3. Relay config stored in `app-state.json`:
   ```json
   { "relay": { "baseUrl": "", "authToken": "" } }
   ```
4. Relay call format: standard OpenAI-compatible `POST /v1/chat/completions`
5. UI: API Keys page gets a "Relay Service" section (URL + token fields)
6. BYOK and relay coexist — user can configure both, BYOK takes priority

### Module B: Subscription System

**Files changed:** `main.js`, `preload.js`, `index.html`

1. App state gains subscription fields:
   ```json
   { "plan": "free", "planExpiresAt": null, "backendUserId": "" }
   ```
2. New IPC handlers:
   - `get-subscription-status` — returns current plan + features
   - `create-checkout-session` — mock: sets plan directly; real: returns checkout URL
   - `activate-subscription` — called by webhook or manual activation
3. Plan tiers and feature gates:

   | Feature | Free | Premium ($9.9/mo) | Pro ($39/mo) |
   |---------|------|--------------------|--------------|
   | BYOK chat | Yes | Yes | Yes |
   | Relay (no own key) | No | Yes | Yes |
   | Agents | 1 | 5 | Unlimited |
   | Model tier | — | Sonnet | Opus |

4. Agent CRUD restored from V2:
   - `add-agent`, `rename-agent`, `delete-agent` IPC handlers
   - `list-agents` reads from app-state instead of hardcoded
   - Agent count gated by plan
5. UI: Account page replaces About page
   - Shows current plan, expiry, features
   - Upgrade buttons (mock: instant activation)
   - Plan comparison grid

### Key Decisions

- **Relay config separate from provider config** — different auth model
- **Gate enforcement client-side** — mock phase stores plan locally. Production adds server verification
- **BYOK always available** — even paid users can use their own key
- **Mock checkout = instant plan change** — architecture pre-wired for Stripe/LemonSqueezy webhook
