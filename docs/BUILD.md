# MyOpenClaw Build Guide

## Prerequisites

- Node.js 22+
- npm
- macOS (for Mac builds) / Windows (for Windows builds)

## Build Variants

| Variant | Config | Description | Size |
|---------|--------|-------------|------|
| **simple** | `build/simple.json` | No bundled runtime; auto-downloads on first launch | ~80MB |
| **full** | `build/full.json` | Includes complete OpenClaw runtime; offline-ready | Larger |

## Quick Build

### 1. Install Dependencies & Compile TypeScript

```bash
cd myopenclaw-v1-20260304-235021
npm install
npm run build:ts
```

### 2. Local Build (dev/testing)

```bash
# Default build (current platform)
npm run build

# Windows only
npm run build:win
```

### 3. Release Build

Builds both simple + full variants. Output goes to a timestamped `dist/YYYYMMDD-HHmmss/` directory.

```bash
# Mac (x64 + arm64 universal)
npm run build:release:mac

# Windows (x64)
npm run build:release:win
```

Output structure:

```
dist/20260318-143000/
├── simple/
│   ├── MyOpenClaw-simple-arm64.dmg
│   ├── MyOpenClaw-simple-x64.dmg
│   └── MyOpenClaw-simple-x64.zip
└── full/
    ├── MyOpenClaw-full-arm64.dmg
    ├── MyOpenClaw-full-x64.dmg
    └── MyOpenClaw-full-x64.zip
```

## CI Build (GitHub Actions)

Push a `v*` tag to trigger an automated build + release:

```bash
git tag v0.3.62
git push --tags
```

That's it. **No need to update `package.json` manually** — CI automatically syncs the version from the git tag before building.

CI will then:
1. Build Windows simple variant on `windows-latest`
2. Build Mac simple variant (x64 + arm64) on `macos-latest`
3. Code-sign and notarize the Mac build (requires `CSC_LINK` and `CSC_KEY_PASSWORD` secrets)
4. Create a GitHub Release and upload the installers

You can also manually trigger a build via `workflow_dispatch` on the GitHub Actions page, selecting any branch.

> **Note:** For local release builds (`npm run build:release:mac/win`), you need to update `package.json` version manually first: `npm version 0.3.62 --no-git-tag-version`.

## Mac Code Signing & Notarization

Release builds require an Apple Developer certificate. Configure via GitHub Secrets:

| Secret | Description |
|--------|-------------|
| `CSC_LINK` | Base64-encoded `.p12` certificate |
| `CSC_KEY_PASSWORD` | Certificate password |

For local signed builds, set these as environment variables. Unsigned builds will be blocked by macOS Gatekeeper.

## FAQ

**Q: simple or full?**
Use simple for distribution (smaller, runtime auto-downloads). Use full for offline environments or testing.

**Q: Where is the build output?**
`dist/` directory. Release builds go to `dist/YYYYMMDD-HHmmss/` subdirectories.

**Q: Build fails with "main.js not found"?**
Run `npm run build:ts` first to compile TypeScript.
