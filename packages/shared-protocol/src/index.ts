import type { TriggerPad } from "@vpad/shared-types";

export const PROTOCOL_VERSION = "1.0" as const;

export type WireMessage<TType extends string, TPayload> = {
  protocolVersion: typeof PROTOCOL_VERSION;
  type: TType;
  requestId?: string;
  ts: string;
  payload: TPayload;
};

export type ClientToRelayType =
  | "host:create_session"
  | "host:revoke_session"
  | "host:update_layout"
  | "remote:join_session"
  | "remote:pad_press"
  | "remote:pad_release"
  | "ping";

export type RelayToClientType =
  | "session:created"
  | "session:revoked"
  | "session:error"
  | "remote:joined"
  | "remote:left"
  | "remote:event"
  | "layout:updated"
  | "pong";

export type PadSnapshot = Pick<TriggerPad, "id" | "label" | "color" | "enabled" | "sortOrder" | "pageId">;

export interface HostCreateSessionPayload {
  layout: PadSnapshot[];
}

export interface SessionCreatedPayload {
  sessionId: string;
  pairingToken: string;
  pairingCode: string;
  pairingExpiresAt: string;
  sessionExpiresAt: string;
}

export interface HostUpdateLayoutPayload {
  sessionId: string;
  layout: PadSnapshot[];
}

export interface RemoteJoinSessionPayload {
  sessionId: string;
  pairingToken?: string;
  pairingCode?: string;
  deviceName?: string;
}

export interface RemoteJoinedPayload {
  sessionId: string;
  deviceId: string;
  connectedDeviceCount: number;
  layout: PadSnapshot[];
}

export interface RemoteLeftPayload {
  sessionId: string;
  deviceId: string;
  connectedDeviceCount: number;
}

export interface RemotePadEventPayload {
  sessionId: string;
  deviceId?: string;
  padId: string;
}

export interface SessionErrorPayload {
  code:
    | "INVALID_MESSAGE"
    | "SESSION_NOT_FOUND"
    | "SESSION_EXPIRED"
    | "PAIRING_INVALID"
    | "NOT_SESSION_HOST"
    | "UNAUTHORIZED";
  message: string;
}

export interface SessionRevokedPayload {
  sessionId: string;
  reason: string;
}

export interface LayoutUpdatedPayload {
  sessionId: string;
  layout: PadSnapshot[];
}

export type AnyClientToRelayMessage =
  | WireMessage<"host:create_session", HostCreateSessionPayload>
  | WireMessage<"host:revoke_session", { sessionId: string }>
  | WireMessage<"host:update_layout", HostUpdateLayoutPayload>
  | WireMessage<"remote:join_session", RemoteJoinSessionPayload>
  | WireMessage<"remote:pad_press", RemotePadEventPayload>
  | WireMessage<"remote:pad_release", RemotePadEventPayload>
  | WireMessage<"ping", { value?: string }>;

export type AnyRelayToClientMessage =
  | WireMessage<"session:created", SessionCreatedPayload>
  | WireMessage<"session:revoked", SessionRevokedPayload>
  | WireMessage<"session:error", SessionErrorPayload>
  | WireMessage<"remote:joined", RemoteJoinedPayload>
  | WireMessage<"remote:left", RemoteLeftPayload>
  | WireMessage<"remote:event", RemotePadEventPayload & { eventType: "press" | "release" }>
  | WireMessage<"layout:updated", LayoutUpdatedPayload>
  | WireMessage<"pong", { value?: string }>;

export function createMessage<TType extends string, TPayload>(
  type: TType,
  payload: TPayload,
  requestId?: string,
): WireMessage<TType, TPayload> {
  return {
    protocolVersion: PROTOCOL_VERSION,
    type,
    requestId,
    ts: new Date().toISOString(),
    payload,
  };
}

export function isWireMessage(value: unknown): value is WireMessage<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.protocolVersion === PROTOCOL_VERSION &&
    typeof v.type === "string" &&
    typeof v.ts === "string" &&
    Object.hasOwn(v, "payload")
  );
}

export function parseWireMessage(raw: string): WireMessage<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isWireMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function stringifyWireMessage(message: WireMessage<string, unknown>): string {
  return JSON.stringify(message);
}
