import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPersistedDrive } from "./activeDriveStore";

const STORAGE_KEY = "drivetime.activeDrive.v1";

function persistedPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    destination: { lat: 35.66, lng: 139.7 },
    deadline: "2026-07-13T18:00:00.000Z",
    safetyBufferMinutes: 10,
    scenicWaypoint: null,
    notificationLeadTimesMinutes: [15, 5],
    sessionStartedAt: "2026-07-13T16:00:00.000Z",
    savedAt: "2026-07-13T16:30:00.000Z",
    ...overrides,
  };
}

describe("loadPersistedDrive", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when nothing has been persisted", () => {
    expect(loadPersistedDrive()).toBeNull();
  });

  it("returns the persisted drive when it is recent enough", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T16:40:00.000Z")); // 保存の10分後

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedPayload()));

    const result = loadPersistedDrive();
    expect(result?.destination).toEqual({ lat: 35.66, lng: 139.7 });
    expect(result?.safetyBufferMinutes).toBe(10);
  });

  it("discards and returns null for a drive saved more than 24 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T16:31:00.000Z")); // 保存の約2日後

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedPayload()));

    expect(loadPersistedDrive()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null instead of throwing on malformed JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadPersistedDrive()).toBeNull();
  });
});
