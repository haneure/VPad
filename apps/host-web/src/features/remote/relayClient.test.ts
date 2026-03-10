import { beforeEach, describe, expect, it, vi } from "vitest";
import { RelayClient } from "./relayClient";

type Listener = (event: { data?: string }) => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;

  readyState = MockWebSocket.OPEN;
  sent: string[] = [];
  listeners = new Map<string, Listener[]>();

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => this.emit("open"), 0);
  }

  addEventListener(type: string, listener: Listener) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, listener: Listener) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((item) => item !== listener),
    );
  }

  send(value: string) {
    this.sent.push(value);
  }

  close() {
    this.emit("close");
  }

  emit(type: string, event: { data?: string } = {}) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe("RelayClient", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
  });

  it("connects and sends create session envelope", async () => {
    const client = new RelayClient();
    await client.connect("ws://localhost:8787");

    client.createSession({ layout: [] });

    const ws = MockWebSocket.instances[0];
    expect(ws.sent.length).toBe(1);
    expect(ws.sent[0]).toContain("host:create_session");
    expect(ws.sent[0]).toContain("protocolVersion");
  });

  it("dispatches parsed messages to subscribers", async () => {
    const client = new RelayClient();
    await client.connect("ws://localhost:8787");

    const handler = vi.fn();
    client.onMessage(handler);

    const ws = MockWebSocket.instances[0];
    ws.emit(
      "message",
      {
        data: JSON.stringify({
          protocolVersion: "1.0",
          type: "pong",
          ts: new Date().toISOString(),
          payload: {},
        }),
      },
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
