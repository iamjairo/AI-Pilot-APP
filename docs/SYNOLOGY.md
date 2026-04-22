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

The standalone backend build is bundled for deployment: JavaScript dependencies are rolled into `out/backend/index.cjs`, while native modules that still need platform-specific handling remain explicit.

The package now also ships an explicit DSM **privilege** declaration in the common DSM 7 style: **`"run-as": "package"`** with a dedicated package username (`pilotbackend`), so DSM treats it as a package-user service instead of a root-privileged package.

The package keeps the DSM privilege declaration, but the backend process itself is launched and tracked directly by the package lifecycle script using a PID file. This keeps DSM package state aligned with the actual standalone Node backend process instead of an intermediate wrapper service.

The package now also exposes a Synology-friendly admin page at **`/synology`**. The SPK metadata points DSM's **Open** action at that page so Package Center can launch a lightweight backend admin UI for generating pairing PINs and checking backend status.

## Build commands

```bash
npm run build:backend
npm run build:spk
npm run build:spk:caddy
npm run build:spk:code-server
npm run build:spk:wetty
npm run build:spk:all
```

Each command writes its resulting package to `release/synology/`.

To target a different Synology architecture later, the packager also accepts:

```bash
node ./scripts/build-synology-spk.mjs --arch x86_64
```

To build a specific Synology app explicitly:

```bash
node ./scripts/build-synology-spk.mjs --app pilot
node ./scripts/build-synology-spk.mjs --app caddy
node ./scripts/build-synology-spk.mjs --app code-server
node ./scripts/build-synology-spk.mjs --app wetty
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
- `WS_NO_BUFFER_UTIL=1`
- `WS_NO_UTF_8_VALIDATE=1`

This keeps the writable Pilot state inside the Synology package var directory instead of a user home directory.
The `WS_NO_*` overrides intentionally disable `ws` optional native addons in the Synology package runtime, because some DSM installs expose incompatible `bufferutil` / `utf-8-validate` builds that can crash the backend during WebSocket traffic.

## Install prerequisites

1. Install **Node.js v20** from Synology Package Center.
2. Build the package with `npm run build:spk`.
3. Upload the generated `.spk` through DSM Package Center → Manual Install.
4. Start the package; it launches the Pilot backend companion server.
5. Use DSM's **Open** button (or browse to `/synology`) to open the backend admin page and generate a pairing PIN.
6. Edit `$SYNOPKG_PKGVAR/config/pilot.env` if you need to override the companion port or protocol on the NAS.
7. In Pilot Desktop, set **General Settings → Remote backend URL** to the NAS backend URL.

## Additional Synology apps

This repo can now build separate SPKs for:

- **Pilot backend** — companion server + remote thin-client backend
- **Caddy** — bundled reverse proxy/web server package
- **code-server** — bundled browser editor package
- **Wetty** — browser terminal package build flow

Current validated artifacts:

- `pilot-backend-0.0.0-12.spk`
- `caddy-2.11.2-1.spk`
- `code-server-4.116.0-1.spk`

Wetty packaging is implemented in the builder and must run inside a Linux-native Docker environment so `node-pty` is compiled for DSM-compatible `linux/amd64`.

Recommended defaults in this repo:

- Docker image: `node:20-bullseye`
- Docker platform: `linux/amd64`

Both can be overridden if needed:

```bash
WETTY_DOCKER_IMAGE=node:20-bullseye
WETTY_DOCKER_PLATFORM=linux/amd64
```

### Building Wetty on the NAS

If your Synology NAS can run Docker / Container Manager, build Wetty there instead of on macOS:

```bash
cd /volume1/path/to/AI-Pilot-APP
npm run build:spk:wetty
```

If you prefer to run the whole command inside a clean Linux builder container on the NAS:

```bash
docker run --rm \
  --platform linux/amd64 \
  -v "$PWD:/workspace" \
  -w /workspace \
  node:20-bullseye \
  bash -lc 'apt-get update && apt-get install -y --no-install-recommends python3 make g++ && npm run build:spk:wetty'
```

That ensures Wetty's bundled `node-pty` addon is built as a Linux binary instead of a macOS Mach-O module.

## Companion remote access with Caddy

Pilot Companion now supports **Caddy** as a third remote-access provider alongside Tailscale and Cloudflare Tunnel.

- Default behavior is **local-first**: Pilot writes a managed Caddyfile under `<PILOT_DIR>/caddy/Caddyfile`
- The default site address is `:20181`, which exposes the companion UI on the host LAN through Caddy
- You can override the site address with `PILOT_CADDY_SITE_ADDRESS`

Examples:

```bash
PILOT_CADDY_SITE_ADDRESS=:20181
PILOT_CADDY_SITE_ADDRESS=pilot.example.com
```

When a real hostname is provided, Caddy can manage HTTPS for that hostname. The current in-app UX focuses on the local/LAN reverse-proxy path first.

## Current scope

This phase packages the backend service itself. It does **not** yet add Synology-specific project browsing UX, DSM desktop integration, or native-arm CI publishing.
