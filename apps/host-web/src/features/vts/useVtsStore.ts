import { create } from "zustand";

export type VtsStatus = "disconnected" | "connecting" | "connected" | "error";

export interface VtsHotkey {
  id: string;
  name: string;
}

type VtsState = {
  status: VtsStatus;
  authToken?: string;
  hotkeys: VtsHotkey[];
  lastError?: string;
  setStatus: (status: VtsStatus) => void;
  setAuthToken: (token?: string) => void;
  setHotkeys: (hotkeys: VtsHotkey[]) => void;
  setError: (message?: string) => void;
};

export const useVtsStore = create<VtsState>((set) => ({
  status: "disconnected",
  authToken: undefined,
  hotkeys: [],
  lastError: undefined,
  setStatus: (status) => set({ status }),
  setAuthToken: (authToken) => set({ authToken }),
  setHotkeys: (hotkeys) => set({ hotkeys }),
  setError: (lastError) => set({ lastError, status: lastError ? "error" : "connected" }),
}));
