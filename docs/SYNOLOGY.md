# Synology Backend Packaging

> Last updated: 2026-04-20

Pilot can now be built as a **standalone backend service** for Synology DSM. The NAS package hosts the backend runtime and companion web UI; the Electron app connects as a **remote thin client** by setting a `remoteBackendUrl`.

The default package target is now **`x86_64`**, which matches Intel/AMD Synology models such as the **DS220+**.

## What the `.spk` contains

- a standalone Node-based Pilot backend build (`out/backend/index.cjs`)
- the bundled renderer assets served by the companion server (`out/renderer/`)
- user docs for the in-app docs viewer (`docs/user/`)
- Synology lifecycle scripts under `synology/scripts/`

The package expects **Synology Node.js v20** to already be installed from Package Center. The package metadata declares that dependency, the install script validates it, and the service starts the backend with the Synology-provided Node runtime.

## Build commands

```bash
npm run build:backend
npm run build:spk
```

`npm run build:spk` writes the resulting package to `release/synology/`.

To target a different Synology architecture later, the packager also accepts:

```bash
node ./scripts/build-synology-spk.mjs --arch x86_64
```

## Runtime layout on DSM

The service scripts use Synology package paths:

| Path | Purpose |
|---|---|
| `$SYNOPKG_PKGDEST/app/` | Installed Pilot backend bundle, renderer assets, docs |
| `$SYNOPKG_PKGVAR/config/` | `app-settings.json`, `pilot.env`, Pilot config dir |
| `$SYNOPKG_PKGVAR/run/` | PID file |
| `$SYNOPKG_PKGVAR/log/` | backend log file |

The service exports:

- `PILOT_APP_ROOT=$SYNOPKG_PKGDEST/app`
- `PILOT_APP_DIR=$SYNOPKG_PKGVAR/config`
- `PILOT_DOCS_DIR=$SYNOPKG_PKGDEST/app/docs/user`

This keeps the writable Pilot state inside the Synology package var directory instead of a user home directory.

## Install prerequisites

1. Install **Node.js v20** from Synology Package Center.
2. Build the package with `npm run build:spk`.
3. Upload the generated `.spk` through DSM Package Center → Manual Install.
4. Start the package; it launches the Pilot backend companion server.
5. Edit `$SYNOPKG_PKGVAR/config/pilot.env` if you need to override the companion port or protocol on the NAS.
6. In Pilot Desktop, set **General Settings → Remote backend URL** to the NAS backend URL.

## Current scope

This phase packages the backend service itself. It does **not** yet add Synology-specific project browsing UX, DSM desktop integration, or native-arm CI publishing.
