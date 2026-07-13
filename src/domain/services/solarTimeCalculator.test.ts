import { describe, expect, it } from "vitest";
import { computeSolarTimes, isDarkEnoughForNightView } from "./solarTimeCalculator";

const TOKYO = { lat: 35.6812, lng: 139.7671 };
const JST_OFFSET_MS = 9 * 60 * 60_000;

function jst(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - JST_OFFSET_MS);
}

describe("computeSolarTimes", () => {
  it("computes summer solstice sunrise/sunset for Tokyo within ~20 minutes of published values", () => {
    const at = jst(2026, 6, 21, 12, 0);
    const result = computeSolarTimes(TOKYO, at);
    expect(result.kind).toBe("normal");
    if (result.kind !== "normal") throw new Error("unreachable");

    // 公表値: 日の出 約4:25 JST、日の入り 約19:00 JST
    const expectedSunrise = jst(2026, 6, 21, 4, 25);
    const expectedSunset = jst(2026, 6, 21, 19, 0);

    expect(
      Math.abs(result.times.sunriseUtc.getTime() - expectedSunrise.getTime()),
    ).toBeLessThan(20 * 60_000);
    expect(
      Math.abs(result.times.sunsetUtc.getTime() - expectedSunset.getTime()),
    ).toBeLessThan(20 * 60_000);
  });

  it("computes winter solstice sunrise/sunset for Tokyo within ~20 minutes of published values", () => {
    const at = jst(2026, 12, 21, 12, 0);
    const result = computeSolarTimes(TOKYO, at);
    expect(result.kind).toBe("normal");
    if (result.kind !== "normal") throw new Error("unreachable");

    // 公表値: 日の出 約6:47 JST、日の入り 約16:32 JST
    const expectedSunrise = jst(2026, 12, 21, 6, 47);
    const expectedSunset = jst(2026, 12, 21, 16, 32);

    expect(
      Math.abs(result.times.sunriseUtc.getTime() - expectedSunrise.getTime()),
    ).toBeLessThan(20 * 60_000);
    expect(
      Math.abs(result.times.sunsetUtc.getTime() - expectedSunset.getTime()),
    ).toBeLessThan(20 * 60_000);
  });

  it("reports polar night when the sun cannot rise at extreme high latitude in winter", () => {
    const result = computeSolarTimes({ lat: 78, lng: 15 }, jst(2026, 12, 21, 12, 0));
    expect(result.kind).toBe("polarNight");
  });

  it("reports midnight sun when the sun cannot set at extreme high latitude in summer", () => {
    const result = computeSolarTimes({ lat: 78, lng: 15 }, jst(2026, 6, 21, 12, 0));
    expect(result.kind).toBe("midnightSun");
  });
});

describe("isDarkEnoughForNightView", () => {
  it("is true at 22:00 JST and false at 13:00 JST on a fixed date", () => {
    expect(isDarkEnoughForNightView(TOKYO, jst(2026, 7, 13, 22, 0))).toBe(true);
    expect(isDarkEnoughForNightView(TOKYO, jst(2026, 7, 13, 13, 0))).toBe(false);
  });

  it("is not dark exactly at sunset (the darkness margin has not passed yet)", () => {
    const at = jst(2026, 6, 21, 12, 0);
    const result = computeSolarTimes(TOKYO, at);
    if (result.kind !== "normal") throw new Error("unreachable");
    expect(isDarkEnoughForNightView(TOKYO, result.times.sunsetUtc)).toBe(false);
  });

  it("is dark well after sunset plus the darkness margin", () => {
    const at = jst(2026, 6, 21, 12, 0);
    const result = computeSolarTimes(TOKYO, at);
    if (result.kind !== "normal") throw new Error("unreachable");
    const wellAfterDusk = new Date(result.times.sunsetUtc.getTime() + 60 * 60_000);
    expect(isDarkEnoughForNightView(TOKYO, wellAfterDusk)).toBe(true);
  });

  it("is always dark during polar night", () => {
    expect(isDarkEnoughForNightView({ lat: 78, lng: 15 }, jst(2026, 12, 21, 12, 0))).toBe(true);
  });

  it("is never dark during midnight sun", () => {
    expect(isDarkEnoughForNightView({ lat: 78, lng: 15 }, jst(2026, 6, 21, 0, 0))).toBe(false);
  });
});
