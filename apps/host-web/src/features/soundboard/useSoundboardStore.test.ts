import { beforeEach, describe, expect, it } from "vitest";
import { SCHEMA_VERSION, type ProfilePage } from "@vpad/shared-types";
import { useSoundboardStore } from "./useSoundboardStore";

const page: ProfilePage = {
  id: "page_1",
  profileId: "profile_1",
  name: "Main",
  sortOrder: 0,
  schemaVersion: SCHEMA_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("useSoundboardStore", () => {
  beforeEach(() => {
    useSoundboardStore.setState({
      pages: [],
      pads: [],
      activePageId: undefined,
      selectedPadId: undefined,
      editMode: false,
    });
  });

  it("adds a pad to active page", () => {
    useSoundboardStore.getState().setPages([page]);
    useSoundboardStore.getState().setActivePage(page.id);

    const pad = useSoundboardStore.getState().addPad({
      pageId: page.id,
      profileId: "profile_1",
      label: "A",
    });

    expect(pad.label).toBe("A");
    expect(useSoundboardStore.getState().pads).toHaveLength(1);
  });

  it("toggles edit mode", () => {
    useSoundboardStore.getState().setEditMode(true);
    expect(useSoundboardStore.getState().editMode).toBe(true);
  });
});
