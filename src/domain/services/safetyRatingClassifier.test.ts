import { describe, expect, it } from "vitest";
import { classifySafetyRating } from "./safetyRatingClassifier";

describe("classifySafetyRating", () => {
  it("returns critical whenever arrival-guarantee mode was triggered, regardless of maxRiskLevel", () => {
    expect(classifySafetyRating("safe", true)).toBe("critical");
    expect(classifySafetyRating("critical", true)).toBe("critical");
  });

  it("returns close for critical/warning peaks without guarantee-mode", () => {
    expect(classifySafetyRating("critical", false)).toBe("close");
    expect(classifySafetyRating("warning", false)).toBe("close");
  });

  it("returns good for a caution peak", () => {
    expect(classifySafetyRating("caution", false)).toBe("good");
  });

  it("returns perfect when risk never exceeded safe", () => {
    expect(classifySafetyRating("safe", false)).toBe("perfect");
  });
});
