import { describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION, type TriggerPad } from "@vpad/shared-types";
import { executePadAction } from "./actionExecutor";

function buildPad(action: TriggerPad["action"]): TriggerPad {
  return {
    id: "pad_1",
    profileId: "profile_1",
    pageId: "page_1",
    label: "Test",
    mode: "tap",
    action,
    enabled: true,
    sortOrder: 0,
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("executePadAction", () => {
  it("triggers vts hotkey for vts_hotkey action", async () => {
    const vtsClient = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      authenticate: vi.fn(),
      restoreToken: vi.fn(),
      listHotkeys: vi.fn(),
      triggerHotkey: vi.fn().mockResolvedValue(undefined),
    };

    const pad = buildPad({ type: "vts_hotkey", hotkeyId: "hk_1" });

    await executePadAction(
      pad,
      {
        vtsClient,
        soundsById: {},
      },
      { play: vi.fn() } as never,
    );

    expect(vtsClient.triggerHotkey).toHaveBeenCalledWith("hk_1");
  });

  it("executes nested multi actions in order", async () => {
    const calls: string[] = [];
    const vtsClient = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      authenticate: vi.fn(),
      restoreToken: vi.fn(),
      listHotkeys: vi.fn(),
      triggerHotkey: vi.fn().mockImplementation(async (hotkeyId: string) => {
        calls.push(hotkeyId);
      }),
    };

    const pad = buildPad({
      type: "multi",
      actions: [
        { type: "vts_hotkey", hotkeyId: "one" },
        { type: "vts_hotkey", hotkeyId: "two" },
      ],
    });

    await executePadAction(
      pad,
      {
        vtsClient,
        soundsById: {},
      },
      { play: vi.fn() } as never,
    );

    expect(calls).toEqual(["one", "two"]);
  });
});
