import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageDriveHistoryRepository } from "./localStorageDriveHistoryRepository";
import type { DriveHistoryEntry } from "@/domain/entities/driveHistoryEntry";

function makeEntry(id: string, recordedAt: Date): DriveHistoryEntry {
  return {
    id,
    recordedAt,
    origin: { lat: 35.6, lng: 139.7 },
    destination: { lat: 35.66, lng: 139.7 },
    drivingDurationMs: 60 * 60_000,
    scheduledArrival: recordedAt,
    actualArrival: recordedAt,
    maxRiskLevel: "safe",
    arrivalGuaranteeModeTriggered: false,
    safetyBufferMinutes: 10,
  };
}

describe("LocalStorageDriveHistoryRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and lists sessions, newest first", async () => {
    const repo = new LocalStorageDriveHistoryRepository();
    await repo.saveSession(makeEntry("a", new Date("2026-07-13T16:00:00")));
    await repo.saveSession(makeEntry("b", new Date("2026-07-13T18:00:00")));

    const sessions = await repo.listSessions();
    expect(sessions.map((s) => s.id)).toEqual(["b", "a"]);
    expect(sessions[0].recordedAt).toBeInstanceOf(Date);
  });

  it("keeps only the most recent DRIVE_HISTORY_MAX_ENTRIES entries (FIFO)", async () => {
    const repo = new LocalStorageDriveHistoryRepository();
    for (let i = 0; i < 15; i++) {
      await repo.saveSession(makeEntry(`id-${i}`, new Date(2026, 6, 13, 16, i)));
    }
    const sessions = await repo.listSessions();
    expect(sessions).toHaveLength(10);
    expect(sessions.map((s) => s.id)).not.toContain("id-0");
    expect(sessions.map((s) => s.id)).toContain("id-14");
  });

  it("deletes a single session by id", async () => {
    const repo = new LocalStorageDriveHistoryRepository();
    await repo.saveSession(makeEntry("a", new Date("2026-07-13T16:00:00")));
    await repo.saveSession(makeEntry("b", new Date("2026-07-13T18:00:00")));

    await repo.deleteSession("a");
    const sessions = await repo.listSessions();
    expect(sessions.map((s) => s.id)).toEqual(["b"]);
  });

  it("clears all sessions", async () => {
    const repo = new LocalStorageDriveHistoryRepository();
    await repo.saveSession(makeEntry("a", new Date("2026-07-13T16:00:00")));
    await repo.clearAll();
    expect(await repo.listSessions()).toHaveLength(0);
  });
});
