# Self-Contained Runtime Design

## Problem

The simple build relies on `openclaw.ai/install.sh` for first-time setup. This external script changes over time, causing unpredictable installation failures. Users without Node.js installed cannot run the gateway.

## Solution

Bundle Node.js binary into the runtime zip package. Remove the install.sh dependency entirely. The runtime zip becomes fully self-contained — no external dependencies needed.

## Runtime ZIP Structure

```
openclaw-runtime-{platform}.zip
├── openclaw-deps/              # unchanged
│   ├── openclaw/
│   │   ├── openclaw.mjs
│   │   ├── dist/
│   │   ├── package.json
│   │   └── node_modules/
│   └── .bin/
│       └── openclaw
└── node/                       # NEW
    ├── node(.exe)              # Node.js 22.x binary
    └── LICENSE
```

Platform-specific Node.js binaries:

| Platform | Source |
|----------|--------|
| Windows x64 | `node-v22.x.x-win-x64.zip` → extract `node.exe` |
| macOS ARM64 | `node-v22.x.x-darwin-arm64.tar.gz` → extract `bin/node` |
| macOS Intel | `node-v22.x.x-darwin-x64.tar.gz` → extract `bin/node` |

Node.js version pinned in `resources/node-version.json`.

## Startup Flow (New)

```
1. findOpenClawCli() → system openclaw installed? use it (no download)
2. findRuntimeDir()  → local runtime exists? use it
3. Neither found     → ensureEmbeddedRuntime() → download runtime zip
4. Start gateway using findNodeBinary():
   a. System node >= 22.12.0? → use it
   b. Runtime bundled node? → use it
   c. Neither → error
```

`runOpenClawInstallScript()` (curl | bash) is removed entirely.

## Node.js Selection Priority

At gateway startup, `findNodeBinary()` checks:

1. System `node` in PATH with version >= 22.12.0 → use system node
2. Runtime embedded `node` at `resources/node/node` or `~/.openclaw/runtime/node/node` → use embedded
3. Neither → throw error (should not happen since runtime zip includes node)

Key: if system already has node, the bundled node is ignored but still present as fallback.

## Build Variants

| Variant | Contains | First-launch behavior |
|---------|----------|----------------------|
| simple | gateway scripts + runtime-manifest.json | Downloads runtime zip (with node) |
| full | gateway scripts + openclaw-deps + node | Ready to go, zero download |

## Files Changed

| File | Change |
|------|--------|
| `.github/workflows/build-runtime.yml` | Add Node.js download step per platform job |
| `resources/node-version.json` | New — pin Node.js version |
| `resources/runtime-manifest.json` | Update URLs for new runtime tag |
| `src/runtime.ts` | Add `findNodeBinary()`, remove `runOpenClawInstallScript()` |
| `src/gateway.ts` | Use `findNodeBinary()` for spawn fallback |
| `src/window.ts` | Remove install.sh branch, go straight to `ensureEmbeddedRuntime()` |
| `src/constants.ts` | Remove `INSTALL_SCRIPT_URL` / `INSTALL_SCRIPT_URL_WIN` |
| `resources/gateway.sh` | Prefer system node, fallback to bundled node |
| `resources/gateway.cmd` | Same logic, remove hardcoded PATH |
| `build/simple.json` | Add `resources/node/**/*` to files |
| `build/full.json` | Add `resources/node/**/*` to files |
