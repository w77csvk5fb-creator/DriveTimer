import type { GeoPoint } from "@/domain/entities/geoPoint";

export interface DistanceKeyframe {
  readonly atMinutes: number;
  readonly distanceFromDestinationKm: number;
}

export interface TrafficKeyframe {
  readonly atMinutes: number;
  /** 1.0が平常、値が大きいほど渋滞で所要時間が伸びる */
  readonly multiplier: number;
}

export type DriveScenarioId = "normal" | "traffic" | "heavyTraffic" | "recovery";

export interface DriveScenario {
  readonly id: DriveScenarioId;
  readonly labelJa: string;
  readonly descriptionJa: string;
  readonly destination: GeoPoint;
  readonly bearingDeg: number;
  /** シナリオ開始時刻からの締切までの分数。deadline = simStart + この分数 */
  readonly deadlineOffsetMinutes: number;
  /** atMinutes昇順、先頭はatMinutes:0であること */
  readonly pathKeyframes: readonly DistanceKeyframe[];
  /** atMinutes昇順、先頭はatMinutes:0であること */
  readonly trafficKeyframes: readonly TrafficKeyframe[];
}
