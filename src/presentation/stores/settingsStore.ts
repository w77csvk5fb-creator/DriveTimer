import { create } from "zustand";
import {
  DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES,
  DEFAULT_SAFETY_BUFFER_MINUTES,
} from "@/core/constants/appConstants";

const STORAGE_KEY = "drivetime.settings.v1";

export type MapThemeMode = "dark" | "light" | "satellite";
const DEFAULT_MAP_THEME: MapThemeMode = "dark";

interface PersistedSettings {
  readonly safetyBufferMinutes: number;
  readonly notificationLeadTimesMinutes: readonly number[];
  readonly mapTheme: MapThemeMode;
}

function loadPersisted(): PersistedSettings {
  const fallback: PersistedSettings = {
    safetyBufferMinutes: DEFAULT_SAFETY_BUFFER_MINUTES,
    notificationLeadTimesMinutes: DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES,
    mapTheme: DEFAULT_MAP_THEME,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return {
      safetyBufferMinutes: parsed.safetyBufferMinutes ?? fallback.safetyBufferMinutes,
      notificationLeadTimesMinutes:
        parsed.notificationLeadTimesMinutes ?? fallback.notificationLeadTimesMinutes,
      mapTheme: parsed.mapTheme ?? fallback.mapTheme,
    };
  } catch {
    return fallback;
  }
}

interface SettingsState {
  readonly safetyBufferMinutes: number;
  readonly notificationLeadTimesMinutes: readonly number[];
  readonly mapTheme: MapThemeMode;
  setSafetyBufferMinutes(minutes: number): void;
  setNotificationLeadTimesMinutes(minutes: readonly number[]): void;
  setMapTheme(theme: MapThemeMode): void;
}

function persist(
  state: Pick<
    SettingsState,
    "safetyBufferMinutes" | "notificationLeadTimesMinutes" | "mapTheme"
  >,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      safetyBufferMinutes: state.safetyBufferMinutes,
      notificationLeadTimesMinutes: state.notificationLeadTimesMinutes,
      mapTheme: state.mapTheme,
    }),
  );
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  safetyBufferMinutes: DEFAULT_SAFETY_BUFFER_MINUTES,
  notificationLeadTimesMinutes: DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES,
  mapTheme: DEFAULT_MAP_THEME,
  setSafetyBufferMinutes(minutes) {
    set({ safetyBufferMinutes: minutes });
    persist(get());
  },
  setNotificationLeadTimesMinutes(minutes) {
    set({ notificationLeadTimesMinutes: minutes });
    persist(get());
  },
  setMapTheme(theme) {
    set({ mapTheme: theme });
    persist(get());
  },
}));

// クライアントでのみ、起動直後にlocalStorageの永続値と同期する
if (typeof window !== "undefined") {
  useSettingsStore.setState(loadPersisted());
}
