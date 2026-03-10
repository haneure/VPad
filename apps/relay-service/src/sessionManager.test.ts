import { describe, expect, it, vi } from "vitest";
import { SessionManager } from "./sessionManager";

describe("SessionManager", () => {
  it("creates session with token and code", () => {
    const manager = new SessionManager();
    const session = manager.createSession({} as never, []);

    expect(session.sessionId).toHaveLength(8);
    expect(session.pairingToken.length).toBeGreaterThan(10);
    expect(session.pairingCode).toHaveLength(6);
  });

  it("allows join by token before expiration", () => {
    const manager = new SessionManager();
    const session = manager.createSession({} as never, []);

    const allowed = manager.canJoin(session, session.pairingToken, undefined);
    expect(allowed).toBe(true);
  });

  it("allows join by manual code", () => {
    const manager = new SessionManager();
    const session = manager.createSession({} as never, []);

    const allowed = manager.canJoin(session, undefined, session.pairingCode);
    expect(allowed).toBe(true);
  });

  it("rejects invalid token/code", () => {
    const manager = new SessionManager();
    const session = manager.createSession({} as never, []);

    expect(manager.canJoin(session, "bad", undefined)).toBe(false);
    expect(manager.canJoin(session, undefined, "bad")).toBe(false);
  });

  it("returns undefined for expired session", () => {
    vi.useFakeTimers();
    const manager = new SessionManager();
    const session = manager.createSession({} as never, []);

    vi.setSystemTime(new Date(session.sessionExpiresAtMs + 1));
    expect(manager.getSession(session.sessionId)).toBeUndefined();
    vi.useRealTimers();
  });
});
