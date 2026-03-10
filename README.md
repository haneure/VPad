# VPad

VPad is a web-first soundboard/controller for VTube Studio.

Core rule:
- PC host is the only client that talks directly to VTube Studio.
- Phone only connects to VPad host session as a remote controller.

## Project Layout

- `apps/host-web` React + Vite web app (host UI + `/remote/:sessionId` mobile UI)
- `apps/relay-service` Node.js WebSocket relay for pairing and remote events
- `packages/shared-types` shared domain types
- `packages/shared-protocol` shared wire protocol contracts
- `src-tauri` Tauri desktop shell bootstrap

## Requirements

- Node.js 20+
- pnpm 10+
- VTube Studio running on your PC (default API endpoint: `ws://localhost:8001`)

## General User Setup (Run From Source)

This is for users who just want to use VPad locally.

1. Install dependencies:

```bash
pnpm install
```

2. Start relay service (Terminal 1):

```bash
pnpm dev:relay
```

3. Start host app (Terminal 2):

```bash
pnpm dev:host:lan
```

4. Open host UI:
- [http://localhost:5173/host](http://localhost:5173/host)

5. In VPad host page:
- Connect to VTube Studio (`localhost:8001` by default)
- Authenticate once
- Set **Public Host Origin** to your PC LAN address (example: `http://192.168.1.23:5173`)
- Set **Public Relay URL** to your relay LAN address (example: `ws://192.168.1.23:8787`) if auto-derived value is not correct
- Build pads in the soundboard
- Enable Companion Mode
- Scan QR from phone or open remote URL

Notes:
- If you do not use phone companion mode, relay can stay off.
- Sound playback in MVP is host-only (PC), not phone.

## Developer Setup

1. Install dependencies:

```bash
pnpm install
```

2. Run host web dev server:

```bash
pnpm dev
```

`pnpm dev` is equivalent to `pnpm dev:host` and starts only the host app.

3. For companion mode development, also run relay in another terminal:

```bash
pnpm dev:relay
```

4. Optional desktop shell development (Tauri):

```bash
pnpm dev:desktop
```

## Build

Build all workspaces:

```bash
pnpm build
```

Host production output is generated at:
- `apps/host-web/dist`

## Test and Quality

Run all checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Run host E2E tests (Playwright):

```bash
pnpm --filter @vpad/host-web test:e2e
```

## Common Commands

- `pnpm dev` start host dev server only
- `pnpm dev:host` start host dev server only
- `pnpm dev:host:lan` start host dev server on LAN (`0.0.0.0:5173`)
  - Uses `--strictPort`, so it errors if 5173 is occupied (instead of silently switching port).
- `pnpm dev:relay` start relay service
- `pnpm dev:desktop` run Tauri desktop dev shell
- `pnpm test` run workspace tests
- `pnpm build` build workspace packages/apps

## FAQ

### Do I just need to run `pnpm dev` to develop or test?

- For host UI development only: `pnpm dev` is enough.
- For companion mode (QR pairing + remote press events): run both `pnpm dev` and `pnpm dev:relay`.
- For test runs: use `pnpm test` (not `pnpm dev`).
- For lint/type checks: use `pnpm lint` and `pnpm typecheck`.
