import { create } from "zustand";
import type { PadSnapshot } from "@vpad/shared-protocol";

export type RemoteConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface PairingState {
  sessionId: string;
  pairingToken: string;
  pairingCode: string;
  pairingExpiresAt: string;
  sessionExpiresAt: string;
}

type RemoteState = {
  status: RemoteConnectionStatus;
  pairing?: PairingState;
  layout: PadSnapshot[];
  connectedDeviceCount: number;
  error?: string;
  setStatus: (status: RemoteConnectionStatus) => void;
  setPairing: (pairing?: PairingState) => void;
  setLayout: (layout: PadSnapshot[]) => void;
  setConnectedDeviceCount: (count: number) => void;
  setError: (error?: string) => void;
};

export const useRemoteStore = create<RemoteState>((set) => ({
  status: "idle",
  pairing: undefined,
  layout: [],
  connectedDeviceCount: 0,
  error: undefined,
  setStatus: (status) => set({ status }),
  setPairing: (pairing) => set({ pairing }),
  setLayout: (layout) => set({ layout }),
  setConnectedDeviceCount: (connectedDeviceCount) => set({ connectedDeviceCount }),
  setError: (error) => set({ error, status: error ? "error" : "connected" }),
}));
