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

1. Install dependencies:

```bash
pnpm install
```

2. Start relay service (Terminal 1):

```bash
pnpm dev:relay
```

3. Start host app on LAN (Terminal 2):

```bash
pnpm dev:host:lan
```

4. Open host UI on your PC:
- [http://localhost:5173/host](http://localhost:5173/host)

5. Configure VTube Studio section on host page:
- **VTS Host**: `localhost`
- **VTS Port**: `8001`
- Click **Connect**
- Fill **Plugin Name** (example: `VPad`) and **Plugin Developer** (your name/team)
- Click **Authenticate** once

6. Configure Companion Mode section:
- Fill only IP/PORT (no protocol):
  - **PC IP Address**: example `192.168.9.71`
  - **Host Web Port**: `5173`
  - **Relay Port**: `8787`
- Click **Enable Companion Mode**
- Use one of these:
  - Scan QR from phone
  - Open generated Remote URL on phone
  - Click **Open Remote Preview** on PC

## Current UX Behavior

### Soundboard Dashboard
- Tap pad to trigger action.
- Hover top-right `⋯` on a pad to open menu:
  - `Edit`
  - `Delete`
- Add/Edit uses a modal form.

### Remote Page (Phone)
- Focused control surface for pad triggering.
- Join automatically from QR token, or manually with 6-digit code.

### Host Notifications
- When a remote pad is triggered, host shows snackbar with:
  - pad label
  - action details (hotkey/sound/multi summary)

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

3. For companion mode development, run relay in another terminal:

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

Host production output:
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

## Troubleshooting

### Phone cannot open remote URL

Check these in order:
1. Host app is actually running on `5173` (not auto-switched port).
2. Host app is exposed on LAN (`pnpm dev:host:lan`).
3. Phone and PC are on same network.
4. Firewall allows inbound `5173` and `8787` on PC.
5. Companion Mode fields use correct IP/ports.

## FAQ

### Do I just need to run `pnpm dev` to develop or test?

- For host UI development only: `pnpm dev` is enough.
- For companion mode (QR pairing + remote press events): run both `pnpm dev` and `pnpm dev:relay`.
- For tests: use `pnpm test`.
- For lint/type checks: use `pnpm lint` and `pnpm typecheck`.
