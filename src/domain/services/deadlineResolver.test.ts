import { describe, expect, it } from "vitest";
import { resolveUpcomingDeadline } from "./deadlineResolver";

describe("resolveUpcomingDeadline", () => {
  it("anchors the given time-of-day to the same calendar date when it is still ahead of now", () => {
    const now = new Date("2026-07-13T15:00:00");
    const deadline = resolveUpcomingDeadline(18, 0, now);

    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(6); // July (0-indexed)
    expect(deadline.getDate()).toBe(13);
    expect(deadline.getHours()).toBe(18);
    expect(deadline.getMinutes()).toBe(0);
  });

  it("rolls over to the next calendar day when the time-of-day has already passed today", () => {
    const now = new Date("2026-07-13T23:20:00");
    const deadline = resolveUpcomingDeadline(0, 10, now);

    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(6);
    expect(deadline.getDate()).toBe(14);
    expect(deadline.getHours()).toBe(0);
    expect(deadline.getMinutes()).toBe(10);
  });

  it("rolls over to the next day when the time-of-day exactly equals now", () => {
    const now = new Date("2026-07-13T16:50:00");
    const deadline = resolveUpcomingDeadline(16, 50, now);

    expect(deadline.getDate()).toBe(14);
  });

  it("handles rollover across a month boundary", () => {
    const now = new Date("2026-07-31T23:50:00");
    const deadline = resolveUpcomingDeadline(0, 5, now);

    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(7); // August
    expect(deadline.getDate()).toBe(1);
  });

  it("always resolves strictly after now", () => {
    const now = new Date("2026-07-13T23:20:00");
    const deadline = resolveUpcomingDeadline(23, 0, now);

    expect(deadline.getTime()).toBeGreaterThan(now.getTime());
  });
});
