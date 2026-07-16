import { describe, expect, it } from "vitest";
import { bearingBetween, destinationPoint, haversineDistanceMeters } from "./geoUtils";

describe("haversineDistanceMeters", () => {
  it("returns 0 for identical points", () => {
    const p = { lat: 35.681236, lng: 139.767125 };
    expect(haversineDistanceMeters(p, p)).toBeCloseTo(0, 6);
  });

  it("matches a known approximate distance (Tokyo to Osaka ~400km)", () => {
    const tokyo = { lat: 35.681236, lng: 139.767125 };
    const osaka = { lat: 34.702485, lng: 135.495951 };
    const distanceKm = haversineDistanceMeters(tokyo, osaka) / 1000;
    expect(distanceKm).toBeGreaterThan(390);
    expect(distanceKm).toBeLessThan(410);
  });
});

describe("destinationPoint", () => {
  it("round-trips: distance from origin to the computed point matches the requested distance", () => {
    const origin = { lat: 35.681236, lng: 139.767125 };
    for (const bearingDeg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const point = destinationPoint(origin, bearingDeg, 15_000);
      const actualDistance = haversineDistanceMeters(origin, point);
      expect(actualDistance).toBeCloseTo(15_000, -1);
    }
  });

  it("moving due north (bearing 0) increases latitude and keeps longitude roughly constant", () => {
    const origin = { lat: 35.681236, lng: 139.767125 };
    const point = destinationPoint(origin, 0, 10_000);
    expect(point.lat).toBeGreaterThan(origin.lat);
    expect(point.lng).toBeCloseTo(origin.lng, 3);
  });
});

describe("bearingBetween", () => {
  it("round-trips with destinationPoint for cardinal and intercardinal directions", () => {
    const origin = { lat: 35.681236, lng: 139.767125 };
    for (const bearingDeg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const point = destinationPoint(origin, bearingDeg, 20_000);
      expect(bearingBetween(origin, point)).toBeCloseTo(bearingDeg, 0);
    }
  });

  it("returns 0 for due north", () => {
    const from = { lat: 35.0, lng: 139.0 };
    const to = { lat: 36.0, lng: 139.0 };
    expect(bearingBetween(from, to)).toBeCloseTo(0, 1);
  });

  it("returns 90 for due east", () => {
    const from = { lat: 35.0, lng: 139.0 };
    const to = { lat: 35.0, lng: 140.0 };
    expect(bearingBetween(from, to)).toBeCloseTo(90, 0);
  });

  it("returns a value normalized to [0, 360)", () => {
    const from = { lat: 35.681236, lng: 139.767125 };
    const to = { lat: 34.702485, lng: 135.495951 };
    const bearing = bearingBetween(from, to);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });
});
