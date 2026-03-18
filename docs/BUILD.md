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

Two tag patterns trigger automated builds:

| Tag pattern | Example | Signing | Output |
|-------------|---------|---------|--------|
| `beta-*` | `beta-0.3.62` | No (unsigned, faster) | Artifacts (download from Actions) |
| `v*` | `v0.3.62` | Yes (signed + notarized) | GitHub Release |

### Beta Build (fast iteration)

```bash
git tag beta-0.3.62
git push --tags
```

Builds unsigned packages for both platforms. Download from the Actions run page. No `package.json` version sync — uses whatever is in the file.

### Release Build

```bash
git tag v0.3.62
git push --tags
```

**No need to update `package.json` manually** — CI automatically syncs the version from the git tag. Builds signed + notarized packages and creates a GitHub Release.

You can also manually trigger a build via `workflow_dispatch` on the GitHub Actions page (unsigned, same as test build).

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
