import type { RiskLevel } from "./riskLevel";

/**
 * 通常状態: 安全バッファを使い切っていても、まだ「素の締切」自体には間に合う可能性がある状態。
 * riskは自由時間残りに応じた4段階(safe/caution/warning/critical)。
 */
export interface OnTrackDriveStatus {
  readonly kind: "onTrack";
  readonly risk: RiskLevel;
  /** 折り返すべき時刻を過ぎているほど負の値になる */
  readonly freeTimeRemainingMs: number;
  readonly turnBackByTime: Date;
  readonly etaToDestinationMs: number;
  readonly projectedArrivalTime: Date;
}

/**
 * 到着保証モード: 安全バッファを考慮してもなお、素の締切時刻自体に遅れる状態。
 * 通常のリスク表示より常に優先して表示する。
 */
export interface ArrivalGuaranteeFailureStatus {
  readonly kind: "arrivalGuaranteeFailure";
  readonly projectedArrivalTime: Date;
  /** 締切に対してどれだけ遅れるか（ミリ秒、正の値） */
  readonly delayMs: number;
  readonly etaToDestinationMs: number;
}

export type DriveStatus = OnTrackDriveStatus | ArrivalGuaranteeFailureStatus;
