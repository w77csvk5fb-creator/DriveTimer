import { describe, expect, it } from "vitest";
import {
  dedupeScenicRouteCandidates,
  generateScenicRouteCandidates,
} from "./generateScenicRouteCandidates";
import type {
  DirectionsRepository,
  EtaResult,
  RouteDetail,
  RouteViaWaypointOptions,
} from "@/domain/repositories/directionsRepository";
import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { ScenicRouteCandidate } from "@/domain/entities/scenicRouteCandidate";

const ORIGIN: GeoPoint = { lat: 35.65, lng: 139.7 };
const DESTINATION: GeoPoint = { lat: 35.66, lng: 139.71 };
// Tokyo daytime (4:00 UTC = 13:00 JST) — confirmed "not dark" in solarTimeCalculator tests,
// so nightView never overrides the category判定 in these fixtures.
const NOW = new Date("2026-07-13T04:00:00Z");

function approximateBearingDeg(origin: GeoPoint, point: GeoPoint): number {
  const dLat = point.lat - origin.lat;
  const dLng = point.lng - origin.lng;
  const angleDeg = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  const normalized = (angleDeg + 360) % 360;
  return (Math.round(normalized / 45) * 45) % 360;
}

class FakeDirectionsRepository implements DirectionsRepository {
  constructor(
    private readonly directEta: EtaResult,
    private readonly byBearing: ReadonlyMap<number, RouteDetail>,
  ) {}

  async getTrafficAwareEta(): Promise<EtaResult> {
    return this.directEta;
  }

  async getFastestRoute(): Promise<EtaResult> {
    return this.directEta;
  }

  async getRouteViaWaypoint(
    _origin: GeoPoint,
    waypoint: GeoPoint,
    _destination: GeoPoint,
    _options?: RouteViaWaypointOptions,
  ): Promise<RouteDetail> {
    const bearing = approximateBearingDeg(ORIGIN, waypoint);
    const entry = this.byBearing.get(bearing);
    if (!entry) throw new Error(`no fixture for bearing ${bearing}`);
    return entry;
  }
}

function makeRoute(durationMs: number): RouteDetail {
  return { durationMs, distanceMeters: durationMs * 10, steps: [] };
}

describe("generateScenicRouteCandidates", () => {
  it("returns insufficientFreeTime when free time is below the minimum threshold", async () => {
    const repo = new FakeDirectionsRepository(
      { durationMs: 175 * 60_000, distanceMeters: 100_000 },
      new Map(),
    );
    const result = await generateScenicRouteCandidates({
      directionsRepository: repo,
      origin: ORIGIN,
      destination: DESTINATION,
      deadline: new Date(NOW.getTime() + 180 * 60_000), // 締切180分後、ETA175分 → 自由時間5分 < 10分
      safetyBufferMinutes: 0,
      now: NOW,
    });
    expect(result.skippedReason).toBe("insufficientFreeTime");
    expect(result.candidates).toHaveLength(0);
  });

  it("filters out candidates far from the target duration and sorts survivors by fit", async () => {
    // deadline+150min, directEta=30min, buffer=0 → freeTime=120min → usable=84min →
    // targetDurationMs = 30+84 = 114min = 6,840,000ms
    const targetDurationMs = 114 * 60_000;
    const byBearing = new Map<number, RouteDetail>([
      [0, makeRoute(targetDurationMs)], // 完全一致(fit=1)
      [45, makeRoute(targetDurationMs * 1.2)], // dev=0.2 < 0.4 (fit=0.5)
      [90, makeRoute(targetDurationMs * 3)],
      [135, makeRoute(targetDurationMs * 3)],
      [180, makeRoute(targetDurationMs * 3)],
      [225, makeRoute(targetDurationMs * 3)],
      [270, makeRoute(targetDurationMs * 3)],
      [315, makeRoute(targetDurationMs * 3)],
    ]);
    const repo = new FakeDirectionsRepository(
      { durationMs: 30 * 60_000, distanceMeters: 20_000 },
      byBearing,
    );

    const result = await generateScenicRouteCandidates({
      directionsRepository: repo,
      origin: ORIGIN,
      destination: DESTINATION,
      deadline: new Date(NOW.getTime() + 150 * 60_000),
      safetyBufferMinutes: 0,
      now: NOW,
    });

    expect(result.skippedReason).toBeNull();
    expect(result.candidates.map((c) => c.id)).toEqual(["bearing-0", "bearing-45"]);
    // 降順ソートの確認
    for (let i = 1; i < result.candidates.length; i++) {
      expect(result.candidates[i - 1].combinedScore).toBeGreaterThanOrEqual(
        result.candidates[i].combinedScore,
      );
    }
  });

  it("relaxes the duration-fit tolerance to reach the minimum target count", async () => {
    const targetDurationMs = 114 * 60_000;
    const byBearing = new Map<number, RouteDetail>([
      [0, makeRoute(targetDurationMs * 1.1)], // dev=0.1, survives at initial tolerance(0.4)
      [45, makeRoute(targetDurationMs * 1.3)], // dev=0.3, survives at initial tolerance(0.4)
      [90, makeRoute(targetDurationMs * 1.5)], // dev=0.5, needs relaxed tolerance(0.6)
      [135, makeRoute(targetDurationMs * 1.5)], // dev=0.5, needs relaxed tolerance(0.6)
      [180, makeRoute(targetDurationMs * 4)],
      [225, makeRoute(targetDurationMs * 4)],
      [270, makeRoute(targetDurationMs * 4)],
      [315, makeRoute(targetDurationMs * 4)],
    ]);
    const repo = new FakeDirectionsRepository(
      { durationMs: 30 * 60_000, distanceMeters: 20_000 },
      byBearing,
    );

    const result = await generateScenicRouteCandidates({
      directionsRepository: repo,
      origin: ORIGIN,
      destination: DESTINATION,
      deadline: new Date(NOW.getTime() + 150 * 60_000),
      safetyBufferMinutes: 0,
      now: NOW,
    });

    // 初期許容誤差(±40%)では2件しか適合しないが、緩和により4件確保できるはず
    expect(result.candidates.length).toBeGreaterThanOrEqual(3);
    expect(result.candidates.map((c) => c.id).sort()).toEqual(
      ["bearing-0", "bearing-45", "bearing-90", "bearing-135"].sort(),
    );
  });

  it("caps the result at the maximum number of candidates", async () => {
    const targetDurationMs = 114 * 60_000;
    const byBearing = new Map<number, RouteDetail>(
      [0, 45, 90, 135, 180, 225, 270, 315].map((bearing) => [bearing, makeRoute(targetDurationMs)]),
    );
    const repo = new FakeDirectionsRepository(
      { durationMs: 30 * 60_000, distanceMeters: 20_000 },
      byBearing,
    );

    const result = await generateScenicRouteCandidates({
      directionsRepository: repo,
      origin: ORIGIN,
      destination: DESTINATION,
      deadline: new Date(NOW.getTime() + 150 * 60_000),
      safetyBufferMinutes: 0,
      now: NOW,
    });

    expect(result.candidates.length).toBeLessThanOrEqual(5);
  });
});

describe("dedupeScenicRouteCandidates", () => {
  function makeCandidate(
    id: string,
    waypoint: GeoPoint,
    combinedScore: number,
  ): ScenicRouteCandidate {
    return {
      id,
      waypoint,
      bearingDeg: 0,
      category: "urban",
      categoryConfidence: 0.3,
      durationMs: 1000,
      distanceMeters: 1000,
      highwayRatio: 0,
      windingRatio: 0,
      durationFitScore: combinedScore,
      combinedScore,
    };
  }

  it("keeps only the higher-scoring candidate when two waypoints are within the dedup radius", () => {
    const a = makeCandidate("a", { lat: 35.7, lng: 139.75 }, 0.9);
    const b = makeCandidate("b", { lat: 35.70001, lng: 139.75001 }, 0.5); // ほぼ同じ地点

    const result = dedupeScenicRouteCandidates([a, b], 500);
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });

  it("keeps both candidates when their waypoints are far apart", () => {
    const a = makeCandidate("a", { lat: 35.7, lng: 139.75 }, 0.9);
    const b = makeCandidate("b", { lat: 36.0, lng: 140.0 }, 0.5); // 数十km離れている

    const result = dedupeScenicRouteCandidates([a, b], 500);
    expect(result.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });
});
