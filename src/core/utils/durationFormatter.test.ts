import { describe, expect, it } from "vitest";
import { formatDateTimeJa, formatDurationJa, formatTimeJa } from "./durationFormatter";

describe("formatDurationJa", () => {
  it("formats hours and minutes", () => {
    expect(formatDurationJa(102 * 60_000)).toBe("1時間42分");
  });

  it("omits the hour part when under an hour", () => {
    expect(formatDurationJa(28 * 60_000)).toBe("28分");
  });

  it("shows a leading minus for negative durations", () => {
    expect(formatDurationJa(-5 * 60_000)).toBe("-5分");
  });

  it("formats zero as 0分", () => {
    expect(formatDurationJa(0)).toBe("0分");
  });
});

describe("formatTimeJa", () => {
  it("formats as zero-padded HH:MM", () => {
    expect(formatTimeJa(new Date("2026-07-13T18:51:00"))).toBe("18:51");
    expect(formatTimeJa(new Date("2026-07-13T08:05:00"))).toBe("08:05");
  });
});

describe("formatDateTimeJa", () => {
  it("formats as M/D HH:MM", () => {
    expect(formatDateTimeJa(new Date("2026-07-13T18:51:00"))).toBe("7/13 18:51");
  });
});
