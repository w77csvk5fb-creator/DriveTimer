import type { GeoPoint } from "./geoPoint";
import type { RiskLevel } from "./riskLevel";

/** localStorage(V1)→Firestore(V2)へ保存先を差し替えられるよう、永続化する最小限の項目のみを持つ */
export interface DriveHistoryEntry {
  readonly id: string;
  readonly recordedAt: Date;
  readonly origin: GeoPoint;
  readonly destination: GeoPoint;
  readonly drivingDurationMs: number;
  readonly scheduledArrival: Date;
  readonly actualArrival: Date;
  readonly maxRiskLevel: RiskLevel;
  readonly arrivalGuaranteeModeTriggered: boolean;
  readonly safetyBufferMinutes: number;
}
