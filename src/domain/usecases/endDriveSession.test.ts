import { describe, expect, it } from "vitest";
import { endDriveSession } from "./endDriveSession";
import type { DriveHistoryRepository } from "@/domain/repositories/driveHistoryRepository";
import type { DriveHistoryEntry } from "@/domain/entities/driveHistoryEntry";

const MIN = 60_000;

function fakeHistoryRepository() {
  const saved: DriveHistoryEntry[] = [];
  const repo: DriveHistoryRepository = {
    async saveSession(entry) {
      saved.push(entry);
    },
    async listSessions() {
      return saved;
    },
    async deleteSession() {},
    async clearAll() {},
  };
  return { repo, saved };
}

describe("endDriveSession", () => {
  it("computes a summary and persists a matching history entry", async () => {
    const { repo, saved } = fakeHistoryRepository();
    const sessionStartedAt = new Date("2026-07-13T17:15:00");
    const endedAt = new Date("2026-07-13T18:47:00");
    const scheduledArrival = new Date("2026-07-13T19:00:00");
    const origin = { lat: 35.6, lng: 139.7 };
    const destination = { lat: 35.66, lng: 139.71 };

    const summary = await endDriveSession({
      historyRepository: repo,
      origin,
      destination,
      sessionStartedAt,
      endedAt,
      scheduledArrival,
      safetyBufferMinutes: 10,
      freeTimeAtStartMs: 92 * MIN,
      maxRiskLevel: "caution",
      arrivalGuaranteeModeTriggered: false,
      distanceSamples: [
        { timestamp: sessionStartedAt, distanceMeters: 500, recommendedTurnBackAt: null },
        {
          timestamp: new Date(sessionStartedAt.getTime() + 13 * MIN),
          distanceMeters: 9000,
          recommendedTurnBackAt: new Date(sessionStartedAt.getTime() + 13 * MIN),
        },
        { timestamp: endedAt, distanceMeters: 50, recommendedTurnBackAt: null },
      ],
    });

    expect(summary.drivingDurationMs).toBe(endedAt.getTime() - sessionStartedAt.getTime());
    expect(summary.marginMs).toBe(scheduledArrival.getTime() - endedAt.getTime());
    expect(summary.safetyRating).toBe("good");
    expect(summary.turnBackDetectedAt).toEqual(
      new Date(sessionStartedAt.getTime() + 13 * MIN),
    );
    expect(summary.adviceJa.length).toBeGreaterThan(0);

    expect(saved).toHaveLength(1);
    expect(saved[0].origin).toEqual(origin);
    expect(saved[0].destination).toEqual(destination);
    expect(saved[0].maxRiskLevel).toBe("caution");
    expect(saved[0].actualArrival).toEqual(endedAt);
  });
});
