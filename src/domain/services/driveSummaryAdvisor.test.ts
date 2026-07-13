import { describe, expect, it } from "vitest";
import { generateDriveAdvice } from "./driveSummaryAdvisor";

const MIN = 60_000;
const base = new Date("2026-07-13T18:00:00");

describe("generateDriveAdvice", () => {
  it("always reports the margin first", () => {
    const advice = generateDriveAdvice({
      marginMs: 13 * MIN,
      safetyBufferMinutes: 10,
      safetyRating: "perfect",
      arrivalGuaranteeModeTriggered: false,
      turnBackDetectedAt: null,
      recommendedTurnBackAt: null,
    });
    expect(advice[0]).toBe("今回の余裕時間は13分でした。");
  });

  it("suggests a larger safety buffer when the rating is close or critical", () => {
    const close = generateDriveAdvice({
      marginMs: 2 * MIN,
      safetyBufferMinutes: 10,
      safetyRating: "close",
      arrivalGuaranteeModeTriggered: false,
      turnBackDetectedAt: null,
      recommendedTurnBackAt: null,
    });
    expect(close).toContain("安全バッファを15分にすると、さらに安心して利用できます。");
  });

  it("does not suggest a buffer increase for perfect or good ratings", () => {
    const good = generateDriveAdvice({
      marginMs: 20 * MIN,
      safetyBufferMinutes: 10,
      safetyRating: "good",
      arrivalGuaranteeModeTriggered: false,
      turnBackDetectedAt: null,
      recommendedTurnBackAt: null,
    });
    expect(good.some((a) => a.includes("安全バッファ"))).toBe(false);
  });

  it("suggests turning back earlier when the actual turn-back point was later than recommended", () => {
    const advice = generateDriveAdvice({
      marginMs: -12 * MIN,
      safetyBufferMinutes: 10,
      safetyRating: "critical",
      arrivalGuaranteeModeTriggered: true,
      turnBackDetectedAt: new Date(base.getTime() + 20 * MIN),
      recommendedTurnBackAt: new Date(base.getTime() + 10 * MIN),
    });
    expect(advice).toContain("もう10分早く折り返すと、より安全でした。");
  });

  it("does not suggest turning back earlier when the user already turned back before the recommendation", () => {
    const advice = generateDriveAdvice({
      marginMs: 5 * MIN,
      safetyBufferMinutes: 10,
      safetyRating: "good",
      arrivalGuaranteeModeTriggered: false,
      turnBackDetectedAt: new Date(base.getTime() + 5 * MIN),
      recommendedTurnBackAt: new Date(base.getTime() + 10 * MIN),
    });
    expect(advice.some((a) => a.includes("早く折り返すと"))).toBe(false);
  });

  it("gives a positive neutral note for a perfect drive", () => {
    const advice = generateDriveAdvice({
      marginMs: 30 * MIN,
      safetyBufferMinutes: 10,
      safetyRating: "perfect",
      arrivalGuaranteeModeTriggered: false,
      turnBackDetectedAt: null,
      recommendedTurnBackAt: null,
    });
    expect(advice).toContain("余裕を持って到着できました。");
  });

  it("never uses blaming language", () => {
    const advice = generateDriveAdvice({
      marginMs: -20 * MIN,
      safetyBufferMinutes: 10,
      safetyRating: "critical",
      arrivalGuaranteeModeTriggered: true,
      turnBackDetectedAt: new Date(base.getTime() + 30 * MIN),
      recommendedTurnBackAt: new Date(base.getTime() + 5 * MIN),
    });
    const blamingWords = ["ダメ", "失敗", "べきでした", "反省"];
    for (const text of advice) {
      for (const word of blamingWords) {
        expect(text).not.toContain(word);
      }
    }
  });
});
