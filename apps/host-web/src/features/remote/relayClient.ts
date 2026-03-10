import {
  createMessage,
  parseWireMessage,
  stringifyWireMessage,
  type AnyRelayToClientMessage,
  type HostCreateSessionPayload,
  type HostUpdateLayoutPayload,
  type RemoteJoinSessionPayload,
  type RemotePadEventPayload,
} from "@vpad/shared-protocol";

type RelayEventHandler = (message: AnyRelayToClientMessage) => void;

export class RelayClient {
  private ws?: WebSocket;
  private handlers = new Set<RelayEventHandler>();

  async connect(url: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(url);
    this.ws = ws;

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        ws.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        ws.removeEventListener("open", onOpen);
        reject(new Error("Failed to connect to relay."));
      };

      ws.addEventListener("open", onOpen, { once: true });
      ws.addEventListener("error", onError, { once: true });
    });

    ws.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      const parsed = parseWireMessage(event.data);
      if (!parsed) return;

      for (const handler of this.handlers) {
        handler(parsed as AnyRelayToClientMessage);
      }
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = undefined;
  }

  onMessage(handler: RelayEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  createSession(payload: HostCreateSessionPayload) {
    this.send(createMessage("host:create_session", payload));
  }

  revokeSession(sessionId: string) {
    this.send(createMessage("host:revoke_session", { sessionId }));
  }

  updateLayout(payload: HostUpdateLayoutPayload) {
    this.send(createMessage("host:update_layout", payload));
  }

  joinSession(payload: RemoteJoinSessionPayload) {
    this.send(createMessage("remote:join_session", payload));
  }

  sendPadPress(payload: RemotePadEventPayload) {
    this.send(createMessage("remote:pad_press", payload));
  }

  sendPadRelease(payload: RemotePadEventPayload) {
    this.send(createMessage("remote:pad_release", payload));
  }

  ping() {
    this.send(createMessage("ping", {}));
  }

  private send(message: ReturnType<typeof createMessage>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Relay socket is not connected.");
    }

    this.ws.send(stringifyWireMessage(message));
  }
}
