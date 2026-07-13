import { create } from "zustand";
import {
  DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES,
  DEFAULT_SAFETY_BUFFER_MINUTES,
} from "@/core/constants/appConstants";

const STORAGE_KEY = "drivetime.settings.v1";

interface PersistedSettings {
  readonly safetyBufferMinutes: number;
  readonly notificationLeadTimesMinutes: readonly number[];
}

function loadPersisted(): PersistedSettings {
  const fallback: PersistedSettings = {
    safetyBufferMinutes: DEFAULT_SAFETY_BUFFER_MINUTES,
    notificationLeadTimesMinutes: DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES,
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
    };
  } catch {
    return fallback;
  }
}

interface SettingsState {
  readonly safetyBufferMinutes: number;
  readonly notificationLeadTimesMinutes: readonly number[];
  setSafetyBufferMinutes(minutes: number): void;
  setNotificationLeadTimesMinutes(minutes: readonly number[]): void;
}

function persist(state: Pick<SettingsState, "safetyBufferMinutes" | "notificationLeadTimesMinutes">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      safetyBufferMinutes: state.safetyBufferMinutes,
      notificationLeadTimesMinutes: state.notificationLeadTimesMinutes,
    }),
  );
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  safetyBufferMinutes: DEFAULT_SAFETY_BUFFER_MINUTES,
  notificationLeadTimesMinutes: DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES,
  setSafetyBufferMinutes(minutes) {
    set({ safetyBufferMinutes: minutes });
    persist(get());
  },
  setNotificationLeadTimesMinutes(minutes) {
    set({ notificationLeadTimesMinutes: minutes });
    persist(get());
  },
}));

// クライアントでのみ、起動直後にlocalStorageの永続値と同期する
if (typeof window !== "undefined") {
  useSettingsStore.setState(loadPersisted());
}
