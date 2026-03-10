import Dexie, { type Table } from "dexie";
import type { Profile, ProfilePage, Settings, SoundAsset, TriggerPad } from "@vpad/shared-types";

export class VPadDb extends Dexie {
  profiles!: Table<Profile, string>;
  pages!: Table<ProfilePage, string>;
  pads!: Table<TriggerPad, string>;
  sounds!: Table<SoundAsset, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("vpad");

    this.version(1).stores({
      profiles: "id, name, isDefault",
      pages: "id, profileId, sortOrder",
      pads: "id, profileId, pageId, sortOrder",
      sounds: "id, name",
      settings: "id",
    });
  }
}

export const db = new VPadDb();
