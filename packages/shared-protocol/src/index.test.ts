import { describe, expect, it } from "vitest";
import { createMessage, parseWireMessage, PROTOCOL_VERSION } from "./index";

describe("shared protocol", () => {
  it("creates message envelope with protocol version", () => {
    const msg = createMessage("ping", { value: "x" }, "req-1");

    expect(msg.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(msg.type).toBe("ping");
    expect(msg.requestId).toBe("req-1");
    expect(msg.payload).toEqual({ value: "x" });
  });

  it("parses valid wire message", () => {
    const raw = JSON.stringify(createMessage("ping", { value: "ok" }));
    const parsed = parseWireMessage(raw);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("ping");
  });

  it("returns null for invalid payload", () => {
    const parsed = parseWireMessage("{\"x\":1}");
    expect(parsed).toBeNull();
  });
});
