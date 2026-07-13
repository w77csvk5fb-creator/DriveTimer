import { create } from "zustand";
import { DEFAULT_SAFETY_BUFFER_MINUTES } from "@/core/constants/appConstants";

const STORAGE_KEY = "drivetime.settings.v1";

interface PersistedSettings {
  readonly safetyBufferMinutes: number;
}

function loadPersisted(): PersistedSettings {
  if (typeof window === "undefined") {
    return { safetyBufferMinutes: DEFAULT_SAFETY_BUFFER_MINUTES };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { safetyBufferMinutes: DEFAULT_SAFETY_BUFFER_MINUTES };
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return { safetyBufferMinutes: parsed.safetyBufferMinutes ?? DEFAULT_SAFETY_BUFFER_MINUTES };
  } catch {
    return { safetyBufferMinutes: DEFAULT_SAFETY_BUFFER_MINUTES };
  }
}

interface SettingsState {
  readonly safetyBufferMinutes: number;
  setSafetyBufferMinutes(minutes: number): void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  safetyBufferMinutes: DEFAULT_SAFETY_BUFFER_MINUTES,
  setSafetyBufferMinutes(minutes) {
    set({ safetyBufferMinutes: minutes });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ safetyBufferMinutes: minutes }));
    }
  },
}));

// クライアントでのみ、起動直後にlocalStorageの永続値と同期する
if (typeof window !== "undefined") {
  useSettingsStore.setState(loadPersisted());
}
