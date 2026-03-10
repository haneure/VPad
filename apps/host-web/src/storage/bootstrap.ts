import { SCHEMA_VERSION, type Profile, type ProfilePage, type Settings } from "@vpad/shared-types";
import { createId } from "../utils/id";
import { nowIso } from "../utils/time";

export function buildDefaultBootstrap(existingSettings?: Partial<Settings>) {
  const timestamp = nowIso();
  const profileId = createId("profile");
  const pageId = createId("page");

  const profile: Profile = {
    id: profileId,
    name: "Default",
    isDefault: true,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const page: ProfilePage = {
    id: pageId,
    profileId,
    name: "Main",
    sortOrder: 0,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const settings: Settings = {
    id: "settings",
    relayUrl: existingSettings?.relayUrl || "ws://localhost:8787",
    publicRelayUrl: existingSettings?.publicRelayUrl || "",
    publicHostOrigin: existingSettings?.publicHostOrigin || "",
    vtsHost: "localhost",
    vtsPort: 8001,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return { profile, page, settings };
}
