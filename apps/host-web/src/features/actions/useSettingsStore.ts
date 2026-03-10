import { create } from "zustand";
import { SCHEMA_VERSION, type Settings } from "@vpad/shared-types";
import { nowIso } from "../../utils/time";

type SettingsState = {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  patchSettings: (patch: Partial<Settings>) => void;
};

const timestamp = nowIso();
const envRelayUrl = import.meta.env.VITE_RELAY_URL as string | undefined;
const envPublicRelayUrl = import.meta.env.VITE_PUBLIC_RELAY_URL as string | undefined;
const envPublicHostOrigin = import.meta.env.VITE_PUBLIC_HOST_ORIGIN as string | undefined;

const initialSettings: Settings = {
  id: "settings",
  relayUrl: envRelayUrl || "ws://localhost:8787",
  publicRelayUrl: envPublicRelayUrl || "",
  publicHostOrigin: envPublicHostOrigin || "",
  vtsHost: "localhost",
  vtsPort: 8001,
  devMockVts: false,
  schemaVersion: SCHEMA_VERSION,
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: initialSettings,
  setSettings: (settings) => set({ settings }),
  patchSettings: (patch) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...patch,
        updatedAt: nowIso(),
      },
    })),
}));
