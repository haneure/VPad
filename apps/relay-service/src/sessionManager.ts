import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import type { PadSnapshot } from "@vpad/shared-protocol";
import type { SessionState } from "./types";

const PAIRING_TTL_MS = 90 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export class SessionManager {
  private sessions = new Map<string, SessionState>();

  createSession(host: WebSocket, layout: PadSnapshot[]) {
    const sessionId = randomUUID().slice(0, 8);
    const pairingToken = randomUUID().replace(/-/g, "");
    const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();

    const now = Date.now();
    const session: SessionState = {
      sessionId,
      pairingToken,
      pairingCode,
      pairingExpiresAtMs: now + PAIRING_TTL_MS,
      sessionExpiresAtMs: now + SESSION_TTL_MS,
      host,
      remotes: new Map(),
      layout,
    };

    this.sessions.set(sessionId, session);

    return session;
  }

  updateLayout(sessionId: string, layout: PadSnapshot[]): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    session.layout = layout;
    return session;
  }

  getSession(sessionId: string): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    if (Date.now() > session.sessionExpiresAtMs) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return session;
  }

  canJoin(session: SessionState, pairingToken?: string, pairingCode?: string): boolean {
    const now = Date.now();
    if (now > session.sessionExpiresAtMs) return false;

    if (pairingToken && now <= session.pairingExpiresAtMs && pairingToken === session.pairingToken) {
      return true;
    }

    return Boolean(pairingCode && pairingCode === session.pairingCode);
  }

  addRemote(session: SessionState, socket: WebSocket): string {
    const deviceId = randomUUID().slice(0, 8);
    session.remotes.set(deviceId, socket);
    return deviceId;
  }

  removeRemote(sessionId: string, deviceId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    session.remotes.delete(deviceId);
    return session.remotes.size;
  }

  revoke(sessionId: string): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    this.sessions.delete(sessionId);
    return session;
  }
}
