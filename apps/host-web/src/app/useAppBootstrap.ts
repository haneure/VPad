import { useEffect, useMemo, useState } from "react";
import { SCHEMA_VERSION, type SoundAsset } from "@vpad/shared-types";
import { useProfileStore } from "../features/profiles/useProfileStore";
import { useSettingsStore } from "../features/actions/useSettingsStore";
import { useSoundboardStore } from "../features/soundboard/useSoundboardStore";
import { loadSnapshot, saveSnapshot } from "../storage/repository";
import { buildDefaultBootstrap } from "../storage/bootstrap";
import { nowIso } from "../utils/time";
import { debounce } from "../utils/debounce";

export function useAppBootstrap() {
  const [loaded, setLoaded] = useState(false);

  const setProfiles = useProfileStore((state) => state.setProfiles);
  const setActiveProfile = useProfileStore((state) => state.setActiveProfile);
  const setPages = useSoundboardStore((state) => state.setPages);
  const setActivePage = useSoundboardStore((state) => state.setActivePage);
  const setPads = useSoundboardStore((state) => state.setPads);
  const setSettings = useSettingsStore((state) => state.setSettings);

  const saveDebounced = useMemo(
    () =>
      debounce(() => {
        const settings = useSettingsStore.getState().settings;
        const profiles = useProfileStore.getState().profiles;
        const pages = useSoundboardStore.getState().pages;
        const pads = useSoundboardStore.getState().pads;

        void saveSnapshot({
          profiles,
          pages,
          pads,
          sounds: defaultSounds,
          settings,
        });
      }, 300),
    [],
  );

  useEffect(() => {
    void (async () => {
      const snapshot = await loadSnapshot();

      if (snapshot.profiles.length === 0 || snapshot.pages.length === 0) {
        const defaults = buildDefaultBootstrap(useSettingsStore.getState().settings);
        setProfiles([defaults.profile]);
        setActiveProfile(defaults.profile.id);
        setPages([defaults.page]);
        setActivePage(defaults.page.id);
        setPads([]);
        setSettings(defaults.settings);
      } else {
        setProfiles(snapshot.profiles);
        if (snapshot.profiles[0]) {
          setActiveProfile(snapshot.profiles[0].id);
        }
        setPages(snapshot.pages);
        if (snapshot.pages[0]) {
          setActivePage(snapshot.pages[0].id);
        }
        setPads(snapshot.pads);
        if (snapshot.settings) {
          setSettings(snapshot.settings);
        }
      }

      setLoaded(true);
    })();

    const unsubProfile = useProfileStore.subscribe(saveDebounced);
    const unsubSoundboard = useSoundboardStore.subscribe(saveDebounced);
    const unsubSettings = useSettingsStore.subscribe(saveDebounced);

    return () => {
      unsubProfile();
      unsubSoundboard();
      unsubSettings();
    };
  }, [saveDebounced, setActivePage, setActiveProfile, setPages, setPads, setProfiles, setSettings]);

  return { loaded };
}

const timestamp = nowIso();
const defaultSounds: SoundAsset[] = [
  {
    id: "sound_default_click",
    name: "Click",
    url: "",
    volume: 1,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];
