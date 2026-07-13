import { describe, expect, it } from "vitest";
import { evaluateNotificationThresholds } from "./notificationThresholdEvaluator";
import type { DriveStatus } from "@/domain/entities/driveStatus";
import type { NotificationEventId } from "@/domain/entities/notificationEvent";

const MIN = 60_000;
const noneFired = new Set<NotificationEventId>();

function onTrack(freeTimeRemainingMinutes: number): DriveStatus {
  return {
    kind: "onTrack",
    risk: "safe",
    freeTimeRemainingMs: freeTimeRemainingMinutes * MIN,
    turnBackByTime: new Date(0),
    etaToDestinationMs: 0,
    projectedArrivalTime: new Date(0),
  };
}

function guaranteeFailure(delayMinutes = 5): DriveStatus {
  return {
    kind: "arrivalGuaranteeFailure",
    projectedArrivalTime: new Date(0),
    delayMs: delayMinutes * MIN,
    etaToDestinationMs: 0,
  };
}

describe("evaluateNotificationThresholds", () => {
  it("fires nothing while safely above every threshold", () => {
    const result = evaluateNotificationThresholds(onTrack(20), noneFired);
    expect(result.newlyFired).toHaveLength(0);
    expect(result.firedIds.size).toBe(0);
  });

  it("fires the 15-minute warning exactly once when crossed", () => {
    const first = evaluateNotificationThresholds(onTrack(14), noneFired);
    expect(first.newlyFired.map((e) => e.id)).toEqual(["fifteenMinWarning"]);

    const second = evaluateNotificationThresholds(onTrack(14), first.firedIds);
    expect(second.newlyFired).toHaveLength(0);
  });

  it("progresses through 15min -> 5min -> timeUp as free time keeps shrinking", () => {
    let fired: ReadonlySet<NotificationEventId> = noneFired;

    let r = evaluateNotificationThresholds(onTrack(14), fired);
    expect(r.newlyFired.map((e) => e.id)).toEqual(["fifteenMinWarning"]);
    fired = r.firedIds;

    r = evaluateNotificationThresholds(onTrack(4), fired);
    expect(r.newlyFired.map((e) => e.id)).toEqual(["fiveMinWarning"]);
    fired = r.firedIds;

    r = evaluateNotificationThresholds(onTrack(-1), fired);
    expect(r.newlyFired.map((e) => e.id)).toEqual(["timeUp"]);
    fired = r.firedIds;

    expect(fired.size).toBe(3);
  });

  it("fires only the most urgent unfired threshold on a sudden jump (traffic spike), not a burst", () => {
    // Goes straight from "safe" to "critical" in a single tick with nothing fired yet.
    const result = evaluateNotificationThresholds(onTrack(-30), noneFired);

    expect(result.newlyFired.map((e) => e.id)).toEqual(["timeUp"]);
    // The less-urgent thresholds are implicitly considered crossed too, to prevent
    // them from firing separately afterwards.
    expect(result.firedIds).toEqual(
      new Set<NotificationEventId>(["fifteenMinWarning", "fiveMinWarning", "timeUp"]),
    );
  });

  it("does not re-fire an already-fired threshold when the situation recovers", () => {
    const afterTimeUp = evaluateNotificationThresholds(onTrack(-5), noneFired).firedIds;

    const recovered = evaluateNotificationThresholds(onTrack(30), afterTimeUp);
    expect(recovered.newlyFired).toHaveLength(0);
    expect(recovered.firedIds).toEqual(afterTimeUp);

    // Dipping back down below a threshold that was already fired must not re-fire it either.
    const dipsAgain = evaluateNotificationThresholds(onTrack(-2), recovered.firedIds);
    expect(dipsAgain.newlyFired).toHaveLength(0);
  });

  it("fires the arrival-guarantee-mode event exactly once, independently of the 15/5/timeUp ladder", () => {
    const first = evaluateNotificationThresholds(guaranteeFailure(), noneFired);
    expect(first.newlyFired.map((e) => e.id)).toEqual(["arrivalGuaranteeModeEntered"]);

    const second = evaluateNotificationThresholds(guaranteeFailure(), first.firedIds);
    expect(second.newlyFired).toHaveLength(0);
  });

  it("still evaluates the normal ladder correctly after recovering out of arrival-guarantee mode", () => {
    const afterGuarantee = evaluateNotificationThresholds(guaranteeFailure(), noneFired).firedIds;
    expect(afterGuarantee.has("fifteenMinWarning")).toBe(false);

    const backOnTrack = evaluateNotificationThresholds(onTrack(4), afterGuarantee);
    expect(backOnTrack.newlyFired.map((e) => e.id)).toEqual(["fiveMinWarning"]);
  });

  describe("configurable notification lead times", () => {
    it("does not fire the 15-minute warning when it is not in leadTimesMinutes", () => {
      const result = evaluateNotificationThresholds(onTrack(14), noneFired, [5]);
      expect(result.newlyFired).toHaveLength(0);
    });

    it("fires the 10-minute warning when 10 is included in leadTimesMinutes", () => {
      const result = evaluateNotificationThresholds(onTrack(9), noneFired, [10, 5]);
      expect(result.newlyFired.map((e) => e.id)).toEqual(["tenMinWarning"]);
    });

    it("still fires timeUp even when leadTimesMinutes is empty (0 minutes is never optional)", () => {
      const result = evaluateNotificationThresholds(onTrack(-1), noneFired, []);
      expect(result.newlyFired.map((e) => e.id)).toEqual(["timeUp"]);
    });

    it("only fires the enabled rungs as free time shrinks, skipping disabled ones silently", () => {
      let fired: ReadonlySet<NotificationEventId> = noneFired;
      const leadTimes = [5];

      let r = evaluateNotificationThresholds(onTrack(14), fired, leadTimes);
      expect(r.newlyFired).toHaveLength(0); // 15分は無効なので何も発火しない
      fired = r.firedIds;

      r = evaluateNotificationThresholds(onTrack(4), fired, leadTimes);
      expect(r.newlyFired.map((e) => e.id)).toEqual(["fiveMinWarning"]);
      fired = r.firedIds;

      r = evaluateNotificationThresholds(onTrack(-1), fired, leadTimes);
      expect(r.newlyFired.map((e) => e.id)).toEqual(["timeUp"]);
    });
  });
});
