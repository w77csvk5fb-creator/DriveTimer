import { describe, expect, it } from "vitest";
import { interpolateLinear } from "./keyframeInterpolation";

const frames = [
  { atMinutes: 0, value: 1 },
  { atMinutes: 10, value: 2 },
  { atMinutes: 30, value: 0 },
];

describe("interpolateLinear", () => {
  it("clamps to the first keyframe before the start", () => {
    expect(interpolateLinear(frames, -5, (f) => f.value)).toBe(1);
  });

  it("clamps to the last keyframe after the end", () => {
    expect(interpolateLinear(frames, 999, (f) => f.value)).toBe(0);
  });

  it("returns exact keyframe values", () => {
    expect(interpolateLinear(frames, 10, (f) => f.value)).toBe(2);
  });

  it("linearly interpolates between two keyframes", () => {
    expect(interpolateLinear(frames, 5, (f) => f.value)).toBeCloseTo(1.5, 5);
    expect(interpolateLinear(frames, 20, (f) => f.value)).toBeCloseTo(1, 5);
  });
});
