import type { SoundAsset, TriggerAction, TriggerPad } from "@vpad/shared-types";
import type { VtsClient } from "../vts/vtsClient";

export interface ActionExecutionContext {
  vtsClient: VtsClient;
  soundsById: Record<string, SoundAsset>;
}

export class HostSoundPlayer {
  private playing = new Map<string, HTMLAudioElement>();

  play(sound: SoundAsset, volume?: number): void {
    const audio = this.playing.get(sound.id) ?? new Audio(sound.url);
    audio.volume = Math.max(0, Math.min(1, volume ?? sound.volume));
    this.playing.set(sound.id, audio);
    void audio.play();
  }
}

export async function executePadAction(
  pad: TriggerPad,
  context: ActionExecutionContext,
  soundPlayer: HostSoundPlayer,
): Promise<void> {
  await executeAction(pad.action, context, soundPlayer);
}

async function executeAction(
  action: TriggerAction,
  context: ActionExecutionContext,
  soundPlayer: HostSoundPlayer,
): Promise<void> {
  switch (action.type) {
    case "vts_hotkey": {
      if (!action.hotkeyId) return;
      await context.vtsClient.triggerHotkey(action.hotkeyId);
      return;
    }
    case "play_sound": {
      const sound = context.soundsById[action.soundId];
      if (!sound) return;
      soundPlayer.play(sound, action.volume);
      return;
    }
    case "multi": {
      for (const child of action.actions) {
        await executeAction(child, context, soundPlayer);
      }
      return;
    }
  }
}
