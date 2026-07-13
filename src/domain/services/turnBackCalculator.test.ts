import { describe, expect, it } from "vitest";
import { computeDriveStatus } from "./turnBackCalculator";

const MIN = 60_000;

describe("computeDriveStatus", () => {
  it("returns risk=safe when plenty of free time remains", () => {
    const now = new Date("2026-07-13T16:00:00");
    const deadline = new Date("2026-07-13T19:00:00");
    const status = computeDriveStatus({
      now,
      deadline,
      etaToDestinationMs: 30 * MIN,
      safetyBufferMinutes: 10,
    });

    expect(status.kind).toBe("onTrack");
    if (status.kind !== "onTrack") throw new Error("unreachable");
    // free = deadline - buffer - eta - now = 3h - 10min - 30min = 2h20min
    expect(status.freeTimeRemainingMs).toBe(140 * MIN);
    expect(status.risk).toBe("safe");
  });

  it.each([
    { freeMinutes: 16, expected: "safe" },
    { freeMinutes: 15, expected: "caution" },
    { freeMinutes: 6, expected: "caution" },
    { freeMinutes: 5, expected: "warning" },
    { freeMinutes: 1, expected: "warning" },
    { freeMinutes: 0, expected: "critical" },
    { freeMinutes: -5, expected: "critical" },
  ])(
    "classifies risk=$expected at freeTimeRemaining=$freeMinutes min",
    ({ freeMinutes, expected }) => {
      const now = new Date("2026-07-13T16:00:00");
      const bufferMinutes = 10;
      // freeTimeRemaining = deadline - buffer - eta - now, with eta=0:
      // deadline = now + freeMinutes + buffer, so it stays >= now (no guarantee-mode trigger)
      // even when freeMinutes itself is negative (buffer already being eaten into).
      const deadline = new Date(now.getTime() + (freeMinutes + bufferMinutes) * MIN);
      const status = computeDriveStatus({
        now,
        deadline,
        etaToDestinationMs: 0,
        safetyBufferMinutes: bufferMinutes,
      });
      expect(status.kind).toBe("onTrack");
      if (status.kind !== "onTrack") throw new Error("unreachable");
      expect(status.risk).toBe(expected);
    },
  );

  it("accounts for the safety buffer when computing turnBackByTime", () => {
    const now = new Date("2026-07-13T16:00:00");
    const deadline = new Date("2026-07-13T19:00:00");
    const withSmallBuffer = computeDriveStatus({
      now,
      deadline,
      etaToDestinationMs: 30 * MIN,
      safetyBufferMinutes: 5,
    });
    const withLargeBuffer = computeDriveStatus({
      now,
      deadline,
      etaToDestinationMs: 30 * MIN,
      safetyBufferMinutes: 30,
    });
    if (withSmallBuffer.kind !== "onTrack" || withLargeBuffer.kind !== "onTrack") {
      throw new Error("unreachable");
    }
    expect(withSmallBuffer.freeTimeRemainingMs).toBeGreaterThan(
      withLargeBuffer.freeTimeRemainingMs,
    );
    expect(withSmallBuffer.freeTimeRemainingMs - withLargeBuffer.freeTimeRemainingMs).toBe(
      25 * MIN,
    );
  });

  it("enters arrival guarantee failure when even a direct trip misses the deadline", () => {
    const now = new Date("2026-07-13T16:00:00");
    const deadline = new Date("2026-07-13T17:00:00");
    const status = computeDriveStatus({
      now,
      deadline,
      etaToDestinationMs: 90 * MIN, // direct ETA alone already exceeds the 1h budget
      safetyBufferMinutes: 10,
    });

    expect(status.kind).toBe("arrivalGuaranteeFailure");
    if (status.kind !== "arrivalGuaranteeFailure") throw new Error("unreachable");
    expect(status.delayMs).toBe(30 * MIN);
    expect(status.projectedArrivalTime.getTime()).toBe(now.getTime() + 90 * MIN);
  });

  it("stays onTrack (not guarantee-failure) when projected arrival exactly equals the deadline", () => {
    const now = new Date("2026-07-13T16:00:00");
    const deadline = new Date("2026-07-13T17:00:00");
    const status = computeDriveStatus({
      now,
      deadline,
      etaToDestinationMs: 60 * MIN, // arrives exactly at deadline if leaving now
      safetyBufferMinutes: 10,
    });

    expect(status.kind).toBe("onTrack");
    if (status.kind !== "onTrack") throw new Error("unreachable");
    // buffer is fully consumed and then some: turnBackByTime already 10min in the past
    expect(status.freeTimeRemainingMs).toBe(-10 * MIN);
    expect(status.risk).toBe("critical");
  });

  it("is a pure function of its inputs (does not read the system clock)", () => {
    const now = new Date("2026-07-13T16:00:00");
    const deadline = new Date("2026-07-13T19:00:00");
    const input = { now, deadline, etaToDestinationMs: 30 * MIN, safetyBufferMinutes: 10 };
    const a = computeDriveStatus(input);
    const b = computeDriveStatus(input);
    expect(a).toEqual(b);
  });
});
