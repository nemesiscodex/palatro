import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

const SOUND_MUTED_STORAGE_KEY = "palatro:sound-muted";
const DEFAULT_VOLUME = 0.7;

interface SoundSettingsContextValue {
  muted: boolean;
  enabled: boolean;
  volume: number;
  toggleMuted: () => void;
  setMuted: (nextMuted: boolean) => void;
}

const SoundSettingsContext = createContext<SoundSettingsContextValue>({
  muted: false,
  enabled: true,
  volume: DEFAULT_VOLUME,
  toggleMuted: () => undefined,
  setMuted: () => undefined,
});

export function SoundSettingsProvider({ children }: PropsWithChildren) {
  const [muted, setMuted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(SOUND_MUTED_STORAGE_KEY);
    setMuted(stored === "true");
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) {
      return;
    }
    window.localStorage.setItem(SOUND_MUTED_STORAGE_KEY, String(muted));
  }, [isHydrated, muted]);

  const toggleMuted = useCallback(() => {
    setMuted((current) => !current);
  }, []);

  const value = useMemo<SoundSettingsContextValue>(
    () => ({
      muted,
      enabled: !muted,
      volume: DEFAULT_VOLUME,
      toggleMuted,
      setMuted,
    }),
    [muted, toggleMuted],
  );

  return <SoundSettingsContext.Provider value={value}>{children}</SoundSettingsContext.Provider>;
}

export function useSoundSettings() {
  return useContext(SoundSettingsContext);
}
