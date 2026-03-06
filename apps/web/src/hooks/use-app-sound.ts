import { useCallback } from "react";

import { useSoundSettings } from "@/components/sound-settings";
import { playSound } from "@/lib/sound-engine";
import type { SoundAsset } from "@/lib/sound-types";

interface UseAppSoundOptions {
  volumeMultiplier?: number;
  playbackRate?: number;
}

export function useAppSound(sound: SoundAsset, options: UseAppSoundOptions = {}) {
  const { enabled, volume } = useSoundSettings();
  const { volumeMultiplier = 1, playbackRate = 1 } = options;

  return useCallback(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const browserWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const audioSupported =
      typeof window.AudioContext !== "undefined" || typeof browserWindow.webkitAudioContext !== "undefined";
    if (!audioSupported) {
      return;
    }

    void playSound(sound.dataUri, {
      volume: Math.max(0, Math.min(1, volume * volumeMultiplier)),
      playbackRate,
    }).catch(() => null);
  }, [enabled, playbackRate, sound.dataUri, volume, volumeMultiplier]);
}
