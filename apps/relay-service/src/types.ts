import type { WebSocket } from "ws";
import type { PadSnapshot } from "@vpad/shared-protocol";

export interface SessionState {
  sessionId: string;
  pairingToken: string;
  pairingCode: string;
  pairingExpiresAtMs: number;
  sessionExpiresAtMs: number;
  host: WebSocket;
  remotes: Map<string, WebSocket>;
  layout: PadSnapshot[];
}
