import { describe, expect, it } from "vitest";
import { isDeadlineInPast, resolveDeadlineForToday } from "./deadlineResolver";

describe("resolveDeadlineForToday", () => {
  it("anchors the given time-of-day to the same calendar date as now", () => {
    const now = new Date("2026-07-13T16:50:00");
    const deadline = resolveDeadlineForToday(19, 0, now);

    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(6); // July (0-indexed)
    expect(deadline.getDate()).toBe(13);
    expect(deadline.getHours()).toBe(19);
    expect(deadline.getMinutes()).toBe(0);
  });
});

describe("isDeadlineInPast", () => {
  it("returns true when the deadline is strictly before now", () => {
    const now = new Date("2026-07-13T16:50:00");
    const deadline = new Date("2026-07-13T16:00:00");
    expect(isDeadlineInPast(deadline, now)).toBe(true);
  });

  it("returns true when the deadline equals now", () => {
    const now = new Date("2026-07-13T16:50:00");
    expect(isDeadlineInPast(new Date(now), now)).toBe(true);
  });

  it("returns false when the deadline is in the future", () => {
    const now = new Date("2026-07-13T16:50:00");
    const deadline = new Date("2026-07-13T19:00:00");
    expect(isDeadlineInPast(deadline, now)).toBe(false);
  });
});
