# VPad Development Guide

Last updated: 2026-03-10

This document is for developers and AI agents working on VPad.

## 1. Product Rules You Must Preserve

1. PC host is the only runtime that talks directly to VTube Studio (VTS).
2. Phone remote only sends remote control events to host through relay.
3. No direct phone-to-VTS path in MVP code.
4. Remote audio playback is out of scope for MVP. Audio actions run on host only.

## 2. Monorepo Layout

- `apps/host-web`: React/Vite host app and mobile remote route.
- `apps/relay-service`: Node WebSocket relay for sessions/pairing/events.
- `packages/shared-types`: entities and domain types.
- `packages/shared-protocol`: relay wire contracts and helpers.
- `src-tauri`: desktop shell bootstrap.

## 3. Quick Start

1. Install deps: `pnpm install`
2. Start host (local): `pnpm dev`
3. Start host on LAN + fixed port: `pnpm dev:host:lan`
4. Start relay: `pnpm dev:relay`
5. Run all checks:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test`

## 4. Runtime Behavior (Current)

### 4.1 Host Page

- Main route: `/host`
- VTS panel supports real connection and a dev mock mode.
- Soundboard pads execute host-side actions.
- Per-pad action menu (`⋯`) opens on click, not hover.
- Companion mode section builds QR URL from configured host IP/port + relay port.

Key file: `apps/host-web/src/routes/HostPage.tsx`

### 4.2 Remote Page

- Main route: `/remote/:sessionId`
- Joins session via query token or manual pairing code.
- Sends `press/release` events to relay.
- Uses host-synced layout snapshot.

Key file: `apps/host-web/src/routes/RemotePage.tsx`

### 4.3 Settings Page

- Uses local draft model.
- Save is explicit via `Save Changes`.
- Cancel reverts local draft.
- Save now writes to IndexedDB immediately (`loadSnapshot + saveSnapshot`) and updates zustand store.

Key file: `apps/host-web/src/routes/SettingsPage.tsx`

Important note:
- Host page still has a few quick settings controls that patch store immediately (by design for now). Keep this in mind when unifying UX.

## 5. VTS Integration Details

1. Real VTS client: `WebSocketVtsClient`
2. Dev mock client: `MockVtsClient`
3. In dev mode, mock can be enabled from host/settings.
4. Runtime execution prefers real VTS if real socket is connected:
   - `runtimeVtsClient = vts.isConnected() ? vts : activeVtsClient`

Key files:
- `apps/host-web/src/features/vts/vtsClient.ts`
- `apps/host-web/src/features/actions/actionExecutor.ts`

Behavior detail:
- `vts_hotkey` action with empty `hotkeyId` is allowed and becomes no-op at execution.
- This is intentional so users can save pads before selecting hotkeys.

## 6. Persistence Model

- Persistence backend is browser IndexedDB (Dexie).
- Snapshot includes: `profiles`, `pages`, `pads`, `sounds`, `settings`.
- Bootstrap hydrates zustand stores from snapshot at app startup.
- Store changes are also debounced into snapshot save by bootstrap subscriber.

Key files:
- `apps/host-web/src/storage/db.ts`
- `apps/host-web/src/storage/repository.ts`
- `apps/host-web/src/app/useAppBootstrap.ts`

## 7. Pairing and Network Notes

1. Use `pnpm dev:host:lan` for phone testing.
2. Host must run on reachable LAN IP and stable port.
3. Relay must be reachable from phone (`ws://<pc-ip>:8787`).
4. If Vite port is occupied and not strict, phone URLs/QR can break.

## 8. Testing Strategy

- Unit/integration tests:
  - `apps/host-web/src/features/**/*.test.ts`
  - `apps/relay-service/src/**/*.test.ts`
- E2E:
  - `apps/host-web/tests/e2e/host-flow.spec.ts`

Run focused checks when editing host-web:

- `pnpm --filter @vpad/host-web typecheck`
- `pnpm --filter @vpad/host-web lint`
- `pnpm --filter @vpad/host-web test`

## 9. Current UX Decisions (Do Not Regress)

1. Pad menu trigger is top-right corner tab, click-toggle only.
2. Clicking outside closes pad menu.
3. Pointer cursor is required on all clickable controls.
4. Add/Edit pad modal must show clear validation cues.
5. VTS hotkey selection in pad modal is optional.
6. Disabled pads must be visually distinct (muted/outlined) and non-triggerable.
7. Remote-triggered pad execution shows host snackbar notification.

## 10. Good Next Refactors

1. Unify settings behavior between host quick controls and settings page (single save model).
2. Add stronger user feedback for save failures and network validation.
3. Add tests for settings draft save/cancel behavior.

