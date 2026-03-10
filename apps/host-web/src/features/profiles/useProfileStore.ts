import { create } from "zustand";
import type { Profile } from "@vpad/shared-types";

type ProfileState = {
  profiles: Profile[];
  activeProfileId?: string;
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfile: (profileId: string) => void;
  upsertProfile: (profile: Profile) => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [],
  activeProfileId: undefined,
  setProfiles: (profiles) =>
    set((state) => ({
      profiles,
      activeProfileId: state.activeProfileId ?? profiles[0]?.id,
    })),
  setActiveProfile: (profileId) => set({ activeProfileId: profileId }),
  upsertProfile: (profile) =>
    set((state) => {
      const existing = state.profiles.find((item) => item.id === profile.id);
      const profiles = existing
        ? state.profiles.map((item) => (item.id === profile.id ? profile : item))
        : [...state.profiles, profile];
      return { profiles };
    }),
}));
