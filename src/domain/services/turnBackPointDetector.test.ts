import { describe, expect, it } from "vitest";
import { detectTurnBackPoint } from "./turnBackPointDetector";

function sample(minutesFromStart: number, distanceMeters: number) {
  return {
    timestamp: new Date(new Date("2026-07-13T16:00:00").getTime() + minutesFromStart * 60_000),
    distanceMeters,
    recommendedTurnBackAt: new Date(
      new Date("2026-07-13T16:00:00").getTime() + (minutesFromStart + 5) * 60_000,
    ),
  };
}

describe("detectTurnBackPoint", () => {
  it("returns null for an empty sample list", () => {
    expect(detectTurnBackPoint([])).toBeNull();
  });

  it("finds the timestamp of maximum distance from the destination", () => {
    const samples = [sample(0, 500), sample(10, 5000), sample(20, 8000), sample(30, 1000)];
    const result = detectTurnBackPoint(samples);
    expect(result?.detectedAt).toEqual(samples[2].timestamp);
  });

  it("returns the first sample when distance only ever decreases", () => {
    const samples = [sample(0, 9000), sample(10, 5000), sample(20, 100)];
    const result = detectTurnBackPoint(samples);
    expect(result?.detectedAt).toEqual(samples[0].timestamp);
  });

  it("carries through the recommended turn-back time from the farthest sample", () => {
    const samples = [sample(0, 500), sample(10, 8000)];
    const result = detectTurnBackPoint(samples);
    expect(result?.recommendedTurnBackAt).toEqual(samples[1].recommendedTurnBackAt);
  });
});
