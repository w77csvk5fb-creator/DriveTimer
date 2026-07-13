import type { RiskLevel } from "@/domain/entities/riskLevel";
import type { SafetyRating } from "@/domain/entities/safetyRating";

/**
 * セッション中の最大リスクレベルと到着保証モードの発動有無から、参考情報としての
 * 安全評価(🟢Perfect/🟡Good/🟠Close/🔴Critical)を決める。スコアではなく参考情報。
 */
export function classifySafetyRating(
  maxRiskLevel: RiskLevel,
  arrivalGuaranteeModeTriggered: boolean,
): SafetyRating {
  if (arrivalGuaranteeModeTriggered) return "critical";
  if (maxRiskLevel === "critical" || maxRiskLevel === "warning") return "close";
  if (maxRiskLevel === "caution") return "good";
  return "perfect";
}
