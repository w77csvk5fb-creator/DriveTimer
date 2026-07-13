import type { RiskLevel } from "./riskLevel";
import type { SafetyRating } from "./safetyRating";

/** ドライブ終了直後に一度だけ表示する振り返り画面用のデータ（履歴として保存する項目より詳細） */
export interface DriveSummary {
  readonly drivingDurationMs: number;
  readonly freeTimeAtStartMs: number;
  /** 実際に目的地から最も離れた地点(=折り返し地点)の検出時刻。サンプルが無ければnull */
  readonly turnBackDetectedAt: Date | null;
  readonly actualArrival: Date;
  readonly scheduledArrival: Date;
  /** scheduledArrival - actualArrival。正の値なら余裕を持って到着できたことを示す */
  readonly marginMs: number;
  readonly maxRiskLevel: RiskLevel;
  readonly arrivalGuaranteeModeTriggered: boolean;
  readonly safetyRating: SafetyRating;
  readonly adviceJa: readonly string[];
}
