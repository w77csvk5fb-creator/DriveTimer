import { describe, expect, it } from "vitest";
import { isLikelyOffRoute } from "./offRouteDetector";
import type { RouteStepSummary } from "@/domain/repositories/directionsRepository";

function step(startLocation: RouteStepSummary["startLocation"], endLocation: RouteStepSummary["endLocation"]): RouteStepSummary {
  return {
    instructionText: "直進",
    durationMs: 60_000,
    distanceMeters: 500,
    maneuver: null,
    startLocation,
    endLocation,
    polyline: "",
  };
}

describe("isLikelyOffRoute", () => {
  // 東京付近、東(経度+方向)へ進むステップ
  const eastwardStep = step({ lat: 35.68, lng: 139.76 }, { lat: 35.68, lng: 139.77 });

  it("returns false when there is no current step", () => {
    expect(
      isLikelyOffRoute(undefined, { lat: 35.68, lng: 139.76 }, { lat: 35.68, lng: 139.761 }),
    ).toBe(false);
  });

  it("returns false when there is no previous position yet", () => {
    expect(isLikelyOffRoute(eastwardStep, null, { lat: 35.68, lng: 139.761 })).toBe(false);
  });

  it("returns false when the movement is too small to judge reliably (GPS noise)", () => {
    const previous = { lat: 35.68, lng: 139.76 };
    const current = { lat: 35.680001, lng: 139.760001 }; // 数メートルのみ
    expect(isLikelyOffRoute(eastwardStep, previous, current)).toBe(false);
  });

  it("returns false when moving roughly in the expected direction", () => {
    const previous = { lat: 35.68, lng: 139.76 };
    const current = { lat: 35.68, lng: 139.7615 }; // ステップと同じ東方向へ大きく移動
    expect(isLikelyOffRoute(eastwardStep, previous, current)).toBe(false);
  });

  it("returns true when moving roughly opposite to the expected direction", () => {
    const previous = { lat: 35.68, lng: 139.76 };
    const current = { lat: 35.68, lng: 139.7585 }; // 西へ大きく移動(逆方向)
    expect(isLikelyOffRoute(eastwardStep, previous, current)).toBe(true);
  });

  it("returns true when turning well beyond the threshold (southwest vs. expected east)", () => {
    const previous = { lat: 35.68, lng: 139.76 };
    const current = { lat: 35.678, lng: 139.758 }; // 南西へ大きく移動(90度超のズレ)
    expect(isLikelyOffRoute(eastwardStep, previous, current)).toBe(true);
  });
});
