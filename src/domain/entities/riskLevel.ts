/**
 * 通常時のリスクメーター4段階。
 * safe=🟢安全 / caution=🟡余裕が少ない / warning=🟠そろそろ折り返し / critical=🔴今すぐ折り返し
 */
export type RiskLevel = "safe" | "caution" | "warning" | "critical";

const RISK_LEVEL_RANK: Record<RiskLevel, number> = {
  safe: 0,
  caution: 1,
  warning: 2,
  critical: 3,
};

/** より深刻な方のリスクレベルを返す（セッション中の最大リスクレベル追跡に使う） */
export function worseRiskLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_LEVEL_RANK[a] >= RISK_LEVEL_RANK[b] ? a : b;
}
