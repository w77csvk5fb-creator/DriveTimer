import { describe, expect, it } from "vitest";
import { computeDriveStatus } from "@/domain/services/turnBackCalculator";
import { interpolateLinear } from "../keyframeInterpolation";
import { normalScenario } from "./normal";
import { trafficScenario } from "./traffic";
import { heavyTrafficScenario } from "./heavyTraffic";
import { recoveryScenario } from "./recovery";
import type { DriveScenario } from "./driveScenario";
import { DEFAULT_AVG_CRUISE_SPEED_KMH } from "@/core/constants/appConstants";

const AVG_SPEED_KM_PER_MIN = DEFAULT_AVG_CRUISE_SPEED_KMH / 60;
const SAFETY_BUFFER_MINUTES = 10;
const SIM_START = new Date("2026-07-13T16:00:00");

/**
 * SimClock/Simulated*DataSourceが実タイマーで行うのと同じ計算を、時間を進めずに
 * 解析的にサンプリングする。ハンドチューニングしたシナリオの数値が意図通りの
 * リスク遷移(🟢のまま/🟢→🟡→🟠→🔴/到着保証モード到達/回復)を生むことを確認する。
 */
function sampleStatuses(scenario: DriveScenario, stepMinutes = 0.5) {
  const lastKeyframe = scenario.pathKeyframes[scenario.pathKeyframes.length - 1];
  const deadline = new Date(SIM_START.getTime() + scenario.deadlineOffsetMinutes * 60_000);

  const statuses = [];
  for (let atMinutes = 0; atMinutes <= lastKeyframe.atMinutes; atMinutes += stepMinutes) {
    const distanceKm = interpolateLinear(
      scenario.pathKeyframes,
      atMinutes,
      (k) => k.distanceFromDestinationKm,
    );
    const multiplier = interpolateLinear(
      scenario.trafficKeyframes,
      atMinutes,
      (k) => k.multiplier,
    );
    const etaMinutes = (distanceKm / AVG_SPEED_KM_PER_MIN) * multiplier;
    const now = new Date(SIM_START.getTime() + atMinutes * 60_000);
    const status = computeDriveStatus({
      now,
      deadline,
      etaToDestinationMs: etaMinutes * 60_000,
      safetyBufferMinutes: SAFETY_BUFFER_MINUTES,
    });
    statuses.push({ atMinutes, distanceKm, status });
  }
  return statuses;
}

describe("normal scenario", () => {
  it("stays safe the entire drive and ends up back near the destination", () => {
    const samples = sampleStatuses(normalScenario);
    for (const { status } of samples) {
      expect(status.kind).toBe("onTrack");
      if (status.kind === "onTrack") {
        expect(status.risk).toBe("safe");
      }
    }
    expect(samples[samples.length - 1].distanceKm).toBeLessThan(0.1);
  });
});

describe("traffic scenario", () => {
  it("progresses through caution, warning and critical as traffic worsens", () => {
    const samples = sampleStatuses(trafficScenario);
    const risksSeen = new Set(
      samples
        .map((s) => s.status)
        .filter((s) => s.kind === "onTrack")
        .map((s) => s.risk),
    );
    expect(risksSeen.has("safe")).toBe(true);
    expect(risksSeen.has("caution")).toBe(true);
    expect(risksSeen.has("warning") || risksSeen.has("critical")).toBe(true);
    expect(samples[samples.length - 1].distanceKm).toBeLessThan(0.1);
  });
});

describe("heavy traffic scenario", () => {
  it("reaches arrival-guarantee-failure at some point during the drive", () => {
    const samples = sampleStatuses(heavyTrafficScenario);
    const enteredGuaranteeMode = samples.some((s) => s.status.kind === "arrivalGuaranteeFailure");
    expect(enteredGuaranteeMode).toBe(true);
    expect(samples[samples.length - 1].distanceKm).toBeLessThan(0.1);
  });
});

describe("recovery scenario", () => {
  it("degrades to warning/critical and then recovers back to a safer risk level", () => {
    const samples = sampleStatuses(recoveryScenario);
    const onTrackSamples = samples.filter(
      (s): s is typeof samples[number] & { status: Extract<typeof s.status, { kind: "onTrack" }> } =>
        s.status.kind === "onTrack",
    );

    const worstIndex = onTrackSamples.reduce(
      (worst, cur, idx) =>
        cur.status.freeTimeRemainingMs < onTrackSamples[worst].status.freeTimeRemainingMs
          ? idx
          : worst,
      0,
    );
    const worstRisk = onTrackSamples[worstIndex].status.risk;
    expect(["warning", "critical"]).toContain(worstRisk);

    const afterWorst = onTrackSamples.slice(worstIndex + 1);
    const recoveredToSafer = afterWorst.some(
      (s) => s.status.risk === "safe" || s.status.risk === "caution",
    );
    expect(recoveredToSafer).toBe(true);
  });
});
