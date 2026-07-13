import { describe, expect, it } from "vitest";
import { SimClock } from "./simClock";

describe("SimClock", () => {
  it("advances simulated time at 1x for every real ms elapsed", () => {
    let realMs = 1_000_000;
    const clock = new SimClock({
      simStart: new Date("2026-07-13T16:00:00"),
      speedMultiplier: 1,
      nowProvider: () => realMs,
    });

    realMs += 5_000; // 5 real seconds pass
    expect(clock.now().getTime()).toBe(new Date("2026-07-13T16:00:05").getTime());
  });

  it("advances simulated time faster than real time under a speed multiplier", () => {
    let realMs = 0;
    const clock = new SimClock({
      simStart: new Date("2026-07-13T16:00:00"),
      speedMultiplier: 10,
      nowProvider: () => realMs,
    });

    realMs += 1_000; // 1 real second passes
    expect(clock.elapsedSimMinutes()).toBeCloseTo(10 / 60, 5); // 10 sim seconds
  });
});
