import { WebSocket, WebSocketServer, type RawData } from "ws";
import {
  createMessage,
  parseWireMessage,
  stringifyWireMessage,
  type AnyClientToRelayMessage,
  type AnyRelayToClientMessage,
  type SessionErrorPayload,
} from "@vpad/shared-protocol";
import { SessionManager } from "./sessionManager";

const port = Number(process.env.PORT ?? 8787);
const wss = new WebSocketServer({ port });
const manager = new SessionManager();

console.log(`[relay] listening on ws://localhost:${port}`);

wss.on("connection", (socket) => {
  let clientSessionId: string | undefined;
  let clientDeviceId: string | undefined;
  let isHostSocket = false;

  socket.on("message", (raw: RawData) => {
    const text = raw.toString("utf8");
    const parsed = parseWireMessage(text) as AnyClientToRelayMessage | null;

    if (!parsed) {
      sendError(socket, "INVALID_MESSAGE", "Invalid wire message.");
      return;
    }

    switch (parsed.type) {
      case "host:create_session": {
        const session = manager.createSession(socket, parsed.payload.layout);
        clientSessionId = session.sessionId;
        isHostSocket = true;

        send(
          socket,
          createMessage("session:created", {
            sessionId: session.sessionId,
            pairingToken: session.pairingToken,
            pairingCode: session.pairingCode,
            pairingExpiresAt: new Date(session.pairingExpiresAtMs).toISOString(),
            sessionExpiresAt: new Date(session.sessionExpiresAtMs).toISOString(),
          }),
        );

        break;
      }

      case "host:update_layout": {
        const session = manager.getSession(parsed.payload.sessionId);
        if (!session) {
          sendError(socket, "SESSION_NOT_FOUND", "Session not found.");
          return;
        }

        if (session.host !== socket) {
          sendError(socket, "NOT_SESSION_HOST", "Only host can update layout.");
          return;
        }

        manager.updateLayout(parsed.payload.sessionId, parsed.payload.layout);
        const message = createMessage("layout:updated", {
          sessionId: parsed.payload.sessionId,
          layout: parsed.payload.layout,
        });

        for (const remoteSocket of session.remotes.values()) {
          send(remoteSocket, message);
        }

        break;
      }

      case "host:revoke_session": {
        const session = manager.getSession(parsed.payload.sessionId);
        if (!session) {
          sendError(socket, "SESSION_NOT_FOUND", "Session not found.");
          return;
        }
        if (session.host !== socket) {
          sendError(socket, "NOT_SESSION_HOST", "Only host can revoke.");
          return;
        }

        const revoked = manager.revoke(parsed.payload.sessionId);
        if (!revoked) return;

        const msg = createMessage("session:revoked", {
          sessionId: revoked.sessionId,
          reason: "Host revoked session.",
        });

        send(socket, msg);
        for (const remoteSocket of revoked.remotes.values()) {
          send(remoteSocket, msg);
          remoteSocket.close();
        }
        break;
      }

      case "remote:join_session": {
        const session = manager.getSession(parsed.payload.sessionId);
        if (!session) {
          sendError(socket, "SESSION_NOT_FOUND", "Session not found.");
          return;
        }

        const canJoin = manager.canJoin(session, parsed.payload.pairingToken, parsed.payload.pairingCode);
        if (!canJoin) {
          sendError(socket, "PAIRING_INVALID", "Invalid pairing token/code.");
          return;
        }

        const deviceId = manager.addRemote(session, socket);
        clientSessionId = session.sessionId;
        clientDeviceId = deviceId;

        const joined = createMessage("remote:joined", {
          sessionId: session.sessionId,
          deviceId,
          connectedDeviceCount: session.remotes.size,
          layout: session.layout,
        });

        send(socket, joined);
        send(session.host, joined);
        break;
      }

      case "remote:pad_press":
      case "remote:pad_release": {
        const session = manager.getSession(parsed.payload.sessionId);
        if (!session) {
          sendError(socket, "SESSION_NOT_FOUND", "Session not found.");
          return;
        }

        const eventType: "press" | "release" = parsed.type === "remote:pad_press" ? "press" : "release";
        send(
          session.host,
          createMessage("remote:event", {
            sessionId: parsed.payload.sessionId,
            deviceId: parsed.payload.deviceId,
            padId: parsed.payload.padId,
            eventType,
          }),
        );
        break;
      }

      case "ping": {
        send(socket, createMessage("pong", parsed.payload));
        break;
      }
    }
  });

  socket.on("close", () => {
    if (isHostSocket && clientSessionId) {
      const revoked = manager.revoke(clientSessionId);
      if (!revoked) return;

      const msg = createMessage("session:revoked", {
        sessionId: revoked.sessionId,
        reason: "Host disconnected.",
      });

      for (const remoteSocket of revoked.remotes.values()) {
        send(remoteSocket, msg);
        remoteSocket.close();
      }
      return;
    }

    if (!clientSessionId || !clientDeviceId) return;

    const count = manager.removeRemote(clientSessionId, clientDeviceId);
    const session = manager.getSession(clientSessionId);
    if (!session) return;

    const left = createMessage("remote:left", {
      sessionId: clientSessionId,
      deviceId: clientDeviceId,
      connectedDeviceCount: count,
    });

    send(session.host, left);
  });
});

function send(socket: WebSocket, message: AnyRelayToClientMessage) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(stringifyWireMessage(message));
}

function sendError(socket: WebSocket, code: SessionErrorPayload["code"], message: string) {
  send(
    socket,
    createMessage("session:error", {
      code,
      message,
    }),
  );
}
