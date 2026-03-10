# VPad Project Guide (Concrete Execution Plan)

Last updated: 2026-03-10
Project codename: VPad

## 1. Product Definition

VPad is a web-first soundboard/control app for VTube Studio (VTS).

Primary rule:
- The PC host is the only client that connects directly to VTube Studio.
- The phone is only a paired remote controller for the PC host session.

### MVP Outcome
A creator can:
1. Open VPad on their PC.
2. Connect and authenticate VPad to VTube Studio.
3. Create a grid of trigger pads.
4. Assign VTS hotkeys and optional local sound playback to pads.
5. Pair a phone via QR (or manual code).
6. Trigger those same pads from phone remote mode.

## 2. Scope

### In Scope (MVP v0.1)
- React + Vite + TypeScript frontend.
- Tauri 2 desktop shell compatibility from day one.
- Host dashboard with editable soundboard grid.
- VTS connection + authentication + token persistence.
- Trigger CRUD (create/edit/reorder/delete).
- Trigger actions: `vts_hotkey`, `play_sound`, `multi`.
- Local persistence (IndexedDB).
- JSON import/export for profile backup.
- Companion pairing (QR + 6-digit code fallback).
- Remote trigger dispatch to host.

### Out of Scope (MVP v0.1)
- Cloud accounts.
- Multi-device sync.
- Direct phone-to-VTS connection.
- Advanced audio engine/mixing.
- Public sharing marketplace.
- Full WebRTC P2P transport (exploration only).

## 3. Architecture (Committed)

## 3.1 Runtime Modes
- Host Mode (PC browser first, Tauri desktop later):
  - Owns VTS connection/auth.
  - Owns profiles/layout.
  - Receives remote events.
  - Executes actions.
- Remote Mode (phone browser):
  - Joins host session.
  - Renders mobile pad UI.
  - Sends `press/release` events.

## 3.2 Transport Plan
- Phase 1 (MVP): backend relay over WebSocket.
- Phase 2 (post-MVP): evaluate WebRTC DataChannel.

Rationale: relay is faster to ship and simpler for pairing/session lifecycle.

## 3.3 Storage Plan
- IndexedDB (Dexie) for:
  - profiles
  - pages
  - pads
  - sounds metadata
  - settings
- Local storage for lightweight UI/session flags when needed.

## 3.4 Tauri Strategy
- Keep core logic in frontend TypeScript.
- Avoid native-only dependencies for MVP.
- Add Tauri desktop packaging once host web UX is stable.

## 4. Technical Stack

- Frontend: React, Vite, TypeScript
- UI: Tailwind CSS
- State: Zustand
- Routing: React Router
- Persistence: Dexie (IndexedDB)
- Host/Remote transport: WebSocket relay service
- Desktop packaging: Tauri 2
- Testing: Vitest + React Testing Library + Playwright

## 5. Proposed Repository Layout

```text
/
|- apps/
|  |- host-web/
|  |- relay-service/
|  `- remote-web/ (optional split; can stay inside host-web routes for MVP)
|- packages/
|  |- shared-types/
|  `- shared-protocol/
|- src-tauri/ (created when desktop packaging starts)
`- docs/
   `- PROJECT_GUIDE.md
```

MVP can start as a single app (`apps/host-web`) with `/remote/:sessionId` route, then split later only if needed.

## 6. Domain Model (MVP)

```ts
export type TriggerAction =
  | { type: "vts_hotkey"; hotkeyId: string }
  | { type: "play_sound"; soundId: string; volume?: number }
  | { type: "multi"; actions: TriggerAction[] };

export type TriggerMode = "tap" | "hold";

export interface TriggerPad {
  id: string;
  profileId: string;
  pageId: string;
  label: string;
  color?: string;
  icon?: string;
  mode: TriggerMode;
  action: TriggerAction;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePage {
  id: string;
  profileId: string;
  name: string;
  sortOrder: number;
}

export interface RemoteSession {
  sessionId: string;
  pairingToken: string;
  pairingCode?: string;
  expiresAt: string;
  connectedDeviceCount: number;
  status: "idle" | "active" | "expired";
}
```

## 7. Protocol Contract (Relay MVP)

### 7.1 Client -> Relay
- `host:create_session`
- `host:revoke_session`
- `remote:join_session`
- `remote:pad_press`
- `remote:pad_release`
- `ping`

### 7.2 Relay -> Client
- `session:created`
- `session:revoked`
- `session:error`
- `remote:joined`
- `remote:left`
- `remote:event` (forwarded press/release)
- `pong`

### 7.3 Session Rules
- Pairing token TTL: 90 seconds.
- Session hard timeout: 12 hours (configurable).
- Manual host revoke invalidates all remote clients immediately.
- Optional host approval gate can be added in v0.2.

## 8. Milestones and Exit Criteria

## M0 - Foundation (3-4 days)
Deliverables:
- Vite + React + TypeScript app scaffold.
- Tailwind + lint + format + test tooling.
- Base routing (`/host`, `/remote/:sessionId`).
- App shell with top bar + burger menu scaffold.

Exit criteria:
- `pnpm lint`, `pnpm test` pass.
- App boots with host and remote placeholder pages.

## M1 - VTS Integration (4-6 days)
Deliverables:
- `VtsClient` service with:
  - connect/disconnect
  - auth flow
  - token restore
  - hotkey list fetch
  - trigger hotkey request
- Settings UI for host/port.
- Connection status + error surface.

Exit criteria:
- Can authenticate once and reconnect without re-auth (unless invalid token).
- Can trigger a selected VTS hotkey from host UI.

## M2 - Soundboard Core (5-7 days)
Deliverables:
- Grid UI with pad CRUD and reorder.
- Pad editor drawer/modal.
- Action assignment (`vts_hotkey`, `play_sound`, `multi`).
- Host-side action execution engine.

Exit criteria:
- User can build a full page of pads and execute actions reliably.

## M3 - Persistence + Profiles (3-5 days)
Deliverables:
- Dexie schema + repository layer.
- Profiles/pages/pads persisted and restored.
- JSON export/import with schema version field.

Exit criteria:
- Reload preserves entire layout and settings.
- Export and import round-trip succeeds.

## M4 - Companion Mode MVP (5-8 days)
Deliverables:
- Relay service (session + message forwarding).
- Host pairing screen (QR + manual code).
- Mobile remote page with responsive pad grid.
- Device count + revoke controls.

Exit criteria:
- Phone can pair and trigger host pads with median event latency < 150ms on same LAN/Wi-Fi internet path.

## M5 - Stabilization + Tauri Desktop (4-6 days)
Deliverables:
- Error handling hardening.
- Reconnect behavior tests.
- Tauri 2 desktop packaging baseline.
- Smoke tests for packaged host mode.

Exit criteria:
- Desktop build launches and can complete the full host workflow.

## 9. PR Plan (Small, Mergeable Units)

1. `chore/bootstrap-host-web`
- Scaffold app, tooling, routing, shell.

2. `feat/vts-client-core`
- VTS WebSocket client, auth, hotkey trigger.

3. `feat/soundboard-grid-and-editor`
- Pad grid + CRUD + local action execution.

4. `feat/dexie-storage-layer`
- Persist profiles/pages/pads/settings.

5. `feat/import-export-config`
- JSON schema + versioned export/import.

6. `feat/relay-service-sessions`
- Session creation/join/revoke + protocol typing.

7. `feat/remote-page-and-pairing`
- QR flow, manual code, mobile remote controls.

8. `chore/tauri-desktop-bootstrap`
- Add `src-tauri`, package scripts, smoke checks.

## 10. Testing Strategy

### Unit
- `VtsClient` request/response parsing.
- Trigger action resolver and multi-action ordering.
- Session token TTL handling.

### Store/State
- Zustand store transitions for connection/session/profile state.

### Integration
- Mock WebSocket tests for:
  - VTS connection/auth failure/retry
  - Remote press/release forwarding

### E2E
- Host UI workflow: connect -> create pad -> trigger.
- Pairing workflow: host creates session -> remote joins -> trigger executes.

## 11. Risk Register

1. VTS auth friction or API mismatch.
- Mitigation: dedicated diagnostics panel + explicit auth reset action.

2. Pairing token leakage on livestream.
- Mitigation: short TTL, one-tap regenerate/revoke, optional approval mode later.

3. Relay reliability and disconnect edge cases.
- Mitigation: heartbeat + reconnect policy + idempotent join handling.

4. Tauri packaging drift from web-first architecture.
- Mitigation: keep domain logic in shared TS modules and avoid early Rust coupling.

## 12. Non-Negotiable Engineering Rules

- No direct phone-to-VTS connection in MVP.
- All protocol events must be versioned (`protocolVersion`).
- All persisted documents must include `schemaVersion`.
- UI must remain usable at 390x844 viewport (phone baseline).
- Every milestone ships with tests for newly introduced core logic.

## 13. Immediate Next Actions (This Week)

1. Create `apps/host-web` scaffold and tooling.
2. Implement `VtsClient` with mock transport tests.
3. Build first soundboard grid with in-memory state.
4. Add Dexie schema and persistence wiring.
5. Stand up relay service skeleton and typed event contract.

## 14. Confirmed Product Decisions

Confirmed on 2026-03-10:

1. Relay runtime: Node.js + WebSocket server.
2. Remote UI mirrors host pad labels/colors but uses simplified layout.
3. Sounds play on host PC only (no phone playback in MVP).
4. Pairing does not require manual host approval in MVP (token/code is enough).
