import type { RiskLevel } from "@/domain/entities/riskLevel";

export interface RiskPresentation {
  readonly emoji: string;
  readonly labelJa: string;
  readonly bgClass: string;
  readonly textClass: string;
  readonly borderClass: string;
}

// 走行中は地図の上に重ねる半透明オーバーレイとして使うため、背景はどの色停止点でも
// 完全不透明(アルファ修飾子なし)にし、地図模様が透けて文字が読みにくくならないようにする。
const RISK_PRESENTATIONS: Record<RiskLevel, RiskPresentation> = {
  safe: {
    emoji: "🟢",
    labelJa: "安全",
    bgClass: "bg-gradient-to-br from-accent-safe to-surface-raised-1",
    textClass: "text-accent-safe",
    borderClass: "border-accent-safe/40",
  },
  caution: {
    emoji: "🟡",
    labelJa: "余裕が少なくなっています",
    bgClass: "bg-gradient-to-br from-accent-caution to-surface-raised-1",
    textClass: "text-accent-caution",
    borderClass: "border-accent-caution/40",
  },
  warning: {
    emoji: "🟠",
    labelJa: "そろそろ折り返してください",
    bgClass: "bg-gradient-to-br from-accent-warning to-surface-raised-1",
    textClass: "text-accent-warning",
    borderClass: "border-accent-warning/40",
  },
  critical: {
    emoji: "🔴",
    labelJa: "今すぐ折り返してください",
    bgClass: "bg-gradient-to-br from-accent-urgent to-surface-raised-1",
    textClass: "text-accent-urgent",
    borderClass: "border-accent-urgent/40",
  },
};

export function getRiskPresentation(risk: RiskLevel): RiskPresentation {
  return RISK_PRESENTATIONS[risk];
}
