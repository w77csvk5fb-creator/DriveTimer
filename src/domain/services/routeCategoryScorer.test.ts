import { describe, expect, it } from "vitest";
import { durationFitScore, isHighwayInstruction, scoreRouteCategory } from "./routeCategoryScorer";
import type { RouteDetail } from "@/domain/repositories/directionsRepository";

const ORIGIN = { lat: 35.65, lng: 139.7 };
const WAYPOINT = { lat: 35.7, lng: 139.75 };
const DESTINATION = { lat: 35.66, lng: 139.71 };

// Tokyo付近、日中(13時JST=4時UTC)。Phase18のテストで既に「明るい」ことを確認済みの時刻帯。
const DAYTIME = new Date("2026-07-13T04:00:00Z");
// 深夜(22時JST=13時UTC)、「暗い」ことを確認済みの時刻帯。
const NIGHTTIME = new Date("2026-07-13T13:00:00Z");

function route(overrides: Partial<RouteDetail> & { steps: RouteDetail["steps"] }): RouteDetail {
  return {
    durationMs: 20 * 60_000,
    distanceMeters: 15_000,
    overviewPolyline: "",
    ...overrides,
  };
}

function step(instructionText: string): RouteDetail["steps"][number] {
  return {
    instructionText,
    durationMs: 5 * 60_000,
    distanceMeters: 3_000,
    maneuver: null,
    startLocation: { lat: 0, lng: 0 },
    endLocation: { lat: 0, lng: 0 },
    polyline: "",
  };
}

describe("scoreRouteCategory", () => {
  it("selects coastal when steps mention coastal keywords with low highway usage", () => {
    const result = scoreRouteCategory({
      origin: ORIGIN,
      waypoint: WAYPOINT,
      destination: DESTINATION,
      normalRoute: route({
        distanceMeters: 20_000,
        steps: [step("海岸沿いを右折"), step("コーストラインを直進")],
      }),
      avoidHighwaysRoute: route({ durationMs: 20 * 60_000, steps: [] }),
      now: DAYTIME,
    });
    expect(result.category).toBe("coastal");
  });

  it("selects mountain when steps mention mountain keywords with a high winding ratio", () => {
    const result = scoreRouteCategory({
      origin: ORIGIN,
      waypoint: WAYPOINT,
      destination: DESTINATION,
      normalRoute: route({
        distanceMeters: 40_000, // 直線距離よりかなり長い(曲がりくねっている)
        steps: [step("峠道を登る"), step("山道が続く")],
      }),
      avoidHighwaysRoute: null,
      now: DAYTIME,
    });
    expect(result.category).toBe("mountain");
  });

  it("selects winding when the route is much longer than a straight line with winding keywords", () => {
    const result = scoreRouteCategory({
      origin: ORIGIN,
      waypoint: WAYPOINT,
      destination: DESTINATION,
      normalRoute: route({
        distanceMeters: 45_000,
        steps: [step("ワインディングロードを走行"), step("カーブが続きます")],
      }),
      avoidHighwaysRoute: null,
      now: DAYTIME,
    });
    expect(result.category).toBe("winding");
  });

  it("selects urban when highway usage is high, winding is low, and steps mention urban keywords", () => {
    const result = scoreRouteCategory({
      origin: ORIGIN,
      waypoint: WAYPOINT,
      destination: DESTINATION,
      normalRoute: route({
        distanceMeters: 12_000, // 直線距離とほぼ同じ(まっすぐ)
        durationMs: 10 * 60_000,
        steps: [step("市街地を経由"), step("中心街を直進")],
      }),
      avoidHighwaysRoute: route({ durationMs: 20 * 60_000, steps: [] }),
      now: DAYTIME,
    });
    expect(result.category).toBe("urban");
  });

  it("selects scenic when steps mention scenic-view keywords", () => {
    const result = scoreRouteCategory({
      origin: ORIGIN,
      waypoint: WAYPOINT,
      destination: DESTINATION,
      normalRoute: route({
        distanceMeters: 18_000,
        steps: [step("絶景ポイントを通過"), step("展望台からの眺め")],
      }),
      avoidHighwaysRoute: route({ durationMs: 20 * 60_000, steps: [] }),
      now: DAYTIME,
    });
    expect(result.category).toBe("scenic");
  });

  it("overrides everything with nightView when it is dark, regardless of route content", () => {
    const result = scoreRouteCategory({
      origin: ORIGIN,
      waypoint: WAYPOINT,
      destination: DESTINATION,
      normalRoute: route({ steps: [step("市街地を経由")] }), // urban色の強い内容でも
      avoidHighwaysRoute: null,
      now: NIGHTTIME,
    });
    expect(result.category).toBe("nightView");
  });

  it("falls back to urban with a low confidence when there is no strong signal", () => {
    const result = scoreRouteCategory({
      origin: ORIGIN,
      waypoint: WAYPOINT,
      destination: DESTINATION,
      normalRoute: route({ distanceMeters: 0, steps: [] }),
      avoidHighwaysRoute: null,
      now: DAYTIME,
    });
    expect(result.category).toBe("urban");
    expect(result.confidence).toBeCloseTo(0.3, 5);
  });
});

describe("durationFitScore", () => {
  it("returns 1 when the candidate exactly matches the target", () => {
    expect(durationFitScore(1000, 1000, 0.4)).toBeCloseTo(1, 5);
  });

  it("returns 0 right at the tolerance boundary and beyond", () => {
    expect(durationFitScore(1400, 1000, 0.4)).toBeCloseTo(0, 5);
    expect(durationFitScore(2000, 1000, 0.4)).toBe(0);
  });

  it("returns a partial score partway through the tolerance band", () => {
    expect(durationFitScore(1200, 1000, 0.4)).toBeCloseTo(0.5, 5);
  });

  it("returns 0 when the target duration is zero or negative", () => {
    expect(durationFitScore(1000, 0, 0.4)).toBe(0);
  });
});

describe("isHighwayInstruction", () => {
  it("returns true for instructions mentioning a highway/expressway", () => {
    expect(isHighwayInstruction("首都高速に入る")).toBe(true);
    expect(isHighwayInstruction("東名高速道路を進む")).toBe(true);
    expect(isHighwayInstruction("圏央道自動車道へ")).toBe(true);
    expect(isHighwayInstruction("東京IC方面へ")).toBe(true);
  });

  it("returns false for ordinary surface-street instructions", () => {
    expect(isHighwayInstruction("市街地を右折")).toBe(false);
    expect(isHighwayInstruction("海岸沿いを直進")).toBe(false);
  });
});
