import type { DriveStatus } from "@/domain/entities/driveStatus";
import type { RiskLevel } from "@/domain/entities/riskLevel";
import { RISK_THRESHOLDS_MINUTES } from "@/core/constants/appConstants";

export interface TurnBackCalculatorInput {
  /** 現在時刻。Date.now()を直接呼ばず必ず注入する（テストでFake時刻を使うため） */
  readonly now: Date;
  readonly deadline: Date;
  /** 現在地→目的地のtraffic-aware所要時間（ミリ秒） */
  readonly etaToDestinationMs: number;
  readonly safetyBufferMinutes: number;
}

/**
 * 折り返し計算の中核。
 *
 * turnBackByTime = deadline − safetyBuffer − etaNow
 * freeTimeRemaining = turnBackByTime − now
 * projectedArrivalTime = now + etaNow
 *
 * projectedArrivalTimeが締切そのものを超える場合は、安全バッファを考慮しても
 * 間に合わない「到着保証モード」として区別する（通常のリスク🔴よりさらに深刻な状態）。
 */
export function computeDriveStatus(input: TurnBackCalculatorInput): DriveStatus {
  const { now, deadline, etaToDestinationMs, safetyBufferMinutes } = input;
  const safetyBufferMs = safetyBufferMinutes * 60_000;
  const projectedArrivalTime = new Date(now.getTime() + etaToDestinationMs);

  if (projectedArrivalTime.getTime() > deadline.getTime()) {
    return {
      kind: "arrivalGuaranteeFailure",
      projectedArrivalTime,
      delayMs: projectedArrivalTime.getTime() - deadline.getTime(),
      etaToDestinationMs,
    };
  }

  const turnBackByTimeMs = deadline.getTime() - safetyBufferMs - etaToDestinationMs;
  const turnBackByTime = new Date(turnBackByTimeMs);
  const freeTimeRemainingMs = turnBackByTimeMs - now.getTime();

  return {
    kind: "onTrack",
    risk: classifyRisk(freeTimeRemainingMs),
    freeTimeRemainingMs,
    turnBackByTime,
    etaToDestinationMs,
    projectedArrivalTime,
  };
}

function classifyRisk(freeTimeRemainingMs: number): RiskLevel {
  const minutes = freeTimeRemainingMs / 60_000;
  if (minutes > RISK_THRESHOLDS_MINUTES.safe) return "safe";
  if (minutes > RISK_THRESHOLDS_MINUTES.caution) return "caution";
  if (minutes > RISK_THRESHOLDS_MINUTES.warning) return "warning";
  return "critical";
}
