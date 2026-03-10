import { describe, expect, it, vi } from "vitest";
import { WebSocketVtsClient } from "./vtsClient";

describe("WebSocketVtsClient internals", () => {
  it("resolves pending request when matching message arrives", async () => {
    const client = new WebSocketVtsClient() as unknown as {
      pending: Map<string, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>;
      handleMessage: (raw: unknown) => void;
    };

    const resolver = vi.fn();
    client.pending.set("request-1", { resolve: resolver, reject: vi.fn() });

    client.handleMessage(
      JSON.stringify({
        requestID: "request-1",
        messageType: "OkResponse",
        data: { ok: true },
      }),
    );

    expect(resolver).toHaveBeenCalledWith({
      requestID: "request-1",
      messageType: "OkResponse",
      data: { ok: true },
    });
  });

  it("ignores invalid JSON", () => {
    const client = new WebSocketVtsClient() as unknown as {
      pending: Map<string, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>;
      handleMessage: (raw: unknown) => void;
    };

    const resolver = vi.fn();
    client.pending.set("request-1", { resolve: resolver, reject: vi.fn() });
    client.handleMessage("{invalid");

    expect(resolver).not.toHaveBeenCalled();
  });
});
