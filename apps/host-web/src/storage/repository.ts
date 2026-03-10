import { SCHEMA_VERSION, type ExportedConfig, type Profile, type ProfilePage, type Settings, type SoundAsset, type TriggerPad } from "@vpad/shared-types";
import { db } from "./db";
import { nowIso } from "../utils/time";

export interface PersistedSnapshot {
  profiles: Profile[];
  pages: ProfilePage[];
  pads: TriggerPad[];
  sounds: SoundAsset[];
  settings: Settings | undefined;
}

export async function loadSnapshot(): Promise<PersistedSnapshot> {
  const [profiles, pages, pads, sounds, settings] = await Promise.all([
    db.profiles.toArray(),
    db.pages.toArray(),
    db.pads.toArray(),
    db.sounds.toArray(),
    db.settings.get("settings"),
  ]);

  return { profiles, pages, pads, sounds, settings };
}

export async function saveSnapshot(snapshot: PersistedSnapshot): Promise<void> {
  await db.transaction("rw", [db.profiles, db.pages, db.pads, db.sounds, db.settings], async () => {
    await Promise.all([db.profiles.clear(), db.pages.clear(), db.pads.clear(), db.sounds.clear(), db.settings.clear()]);
    await db.profiles.bulkPut(snapshot.profiles);
    await db.pages.bulkPut(snapshot.pages);
    await db.pads.bulkPut(snapshot.pads);
    await db.sounds.bulkPut(snapshot.sounds);
    if (snapshot.settings) {
      await db.settings.put(snapshot.settings);
    }
  });
}

export function serializeExport(snapshot: PersistedSnapshot): ExportedConfig {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    profiles: snapshot.profiles,
    pages: snapshot.pages,
    pads: snapshot.pads,
    sounds: snapshot.sounds,
    settings: snapshot.settings,
  };
}

export function parseImport(raw: string): ExportedConfig {
  const parsed = JSON.parse(raw) as ExportedConfig;

  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion: ${parsed.schemaVersion}`);
  }

  return parsed;
}
