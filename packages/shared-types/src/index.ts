export const SCHEMA_VERSION = 1 as const;

export interface EntityBase {
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
}

export type TriggerAction =
  | { type: "vts_hotkey"; hotkeyId: string }
  | { type: "play_sound"; soundId: string; volume?: number }
  | { type: "multi"; actions: TriggerAction[] };

export type TriggerMode = "tap" | "hold";

export interface TriggerPad extends EntityBase {
  id: string;
  profileId: string;
  pageId: string;
  label: string;
  color?: string;
  icon?: string;
  mode: TriggerMode;
  action: TriggerAction;
  enabled: boolean;
  sortOrder: number;
}

export interface Profile extends EntityBase {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface ProfilePage extends EntityBase {
  id: string;
  profileId: string;
  name: string;
  sortOrder: number;
}

export interface SoundAsset extends EntityBase {
  id: string;
  name: string;
  url: string;
  volume: number;
}

export interface Settings extends EntityBase {
  id: "settings";
  relayUrl: string;
  publicRelayUrl?: string;
  publicHostOrigin?: string;
  vtsHost: string;
  vtsPort: number;
  vtsToken?: string;
}

export interface RemoteSession extends EntityBase {
  sessionId: string;
  pairingToken: string;
  pairingCode?: string;
  pairingExpiresAt: string;
  sessionExpiresAt: string;
  connectedDeviceCount: number;
  status: "idle" | "active" | "expired";
}

export interface ExportedConfig {
  schemaVersion: typeof SCHEMA_VERSION;
  exportedAt: string;
  profiles: Profile[];
  pages: ProfilePage[];
  pads: TriggerPad[];
  sounds: SoundAsset[];
  settings?: Settings;
}
