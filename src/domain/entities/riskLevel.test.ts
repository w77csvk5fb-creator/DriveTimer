import { describe, expect, it } from "vitest";
import { worseRiskLevel } from "./riskLevel";

describe("worseRiskLevel", () => {
  it("returns the more severe of the two levels", () => {
    expect(worseRiskLevel("safe", "warning")).toBe("warning");
    expect(worseRiskLevel("critical", "safe")).toBe("critical");
    expect(worseRiskLevel("caution", "caution")).toBe("caution");
  });
});
