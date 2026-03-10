import { create } from "zustand";
import type { ProfilePage, TriggerPad } from "@vpad/shared-types";
import { SCHEMA_VERSION } from "@vpad/shared-types";
import { createId } from "../../utils/id";
import { nowIso } from "../../utils/time";

export interface NewPadInput {
  pageId: string;
  profileId: string;
  label: string;
}

type SoundboardState = {
  pages: ProfilePage[];
  pads: TriggerPad[];
  activePageId?: string;
  selectedPadId?: string;
  editMode: boolean;
  setPages: (pages: ProfilePage[]) => void;
  setPads: (pads: TriggerPad[]) => void;
  setActivePage: (pageId: string) => void;
  setSelectedPad: (padId?: string) => void;
  setEditMode: (enabled: boolean) => void;
  addPad: (input: NewPadInput) => TriggerPad;
  updatePad: (pad: TriggerPad) => void;
  deletePad: (padId: string) => void;
};

export const useSoundboardStore = create<SoundboardState>((set) => ({
  pages: [],
  pads: [],
  activePageId: undefined,
  selectedPadId: undefined,
  editMode: false,
  setPages: (pages) =>
    set((state) => ({
      pages,
      activePageId: state.activePageId ?? pages[0]?.id,
    })),
  setPads: (pads) => set({ pads }),
  setActivePage: (activePageId) => set({ activePageId }),
  setSelectedPad: (selectedPadId) => set({ selectedPadId }),
  setEditMode: (editMode) => set({ editMode }),
  addPad: (input) => {
    const timestamp = nowIso();
    const pad: TriggerPad = {
      id: createId("pad"),
      profileId: input.profileId,
      pageId: input.pageId,
      label: input.label,
      color: "#d9e2ec",
      mode: "tap",
      action: { type: "vts_hotkey", hotkeyId: "" },
      enabled: true,
      sortOrder: 0,
      schemaVersion: SCHEMA_VERSION,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    set((state) => {
      const pagePads = state.pads.filter((item) => item.pageId === input.pageId);
      pad.sortOrder = pagePads.length;
      return { pads: [...state.pads, pad], selectedPadId: pad.id };
    });

    return pad;
  },
  updatePad: (pad) =>
    set((state) => ({
      pads: state.pads.map((item) => (item.id === pad.id ? { ...pad, updatedAt: nowIso() } : item)),
    })),
  deletePad: (padId) =>
    set((state) => ({
      pads: state.pads.filter((item) => item.id !== padId),
      selectedPadId: state.selectedPadId === padId ? undefined : state.selectedPadId,
    })),
}));
