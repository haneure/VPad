import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "./index";

describe("shared types", () => {
  it("exports schema version 1", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});
