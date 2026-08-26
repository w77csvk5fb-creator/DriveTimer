import type { RiskLevel } from "@/domain/entities/riskLevel";

export interface RiskPresentation {
  readonly emoji: string;
  readonly labelJa: string;
  readonly bgClass: string;
  readonly textClass: string;
  readonly borderClass: string;
}

// 走行中は地図の上に重ねる半透明オーバーレイとして使うため、背景はどんな地図模様の上でも
// 文字が読めるよう高めの不透明度にしている(単なるページ内カードだった頃より濃くしてある)。
const RISK_PRESENTATIONS: Record<RiskLevel, RiskPresentation> = {
  safe: {
    emoji: "🟢",
    labelJa: "安全",
    bgClass: "bg-gradient-to-br from-accent-safe/70 via-accent-safe/55 to-surface-raised-1/95",
    textClass: "text-accent-safe",
    borderClass: "border-accent-safe/40",
  },
  caution: {
    emoji: "🟡",
    labelJa: "余裕が少なくなっています",
    bgClass:
      "bg-gradient-to-br from-accent-caution/70 via-accent-caution/55 to-surface-raised-1/95",
    textClass: "text-accent-caution",
    borderClass: "border-accent-caution/40",
  },
  warning: {
    emoji: "🟠",
    labelJa: "そろそろ折り返してください",
    bgClass:
      "bg-gradient-to-br from-accent-warning/70 via-accent-warning/55 to-surface-raised-1/95",
    textClass: "text-accent-warning",
    borderClass: "border-accent-warning/40",
  },
  critical: {
    emoji: "🔴",
    labelJa: "今すぐ折り返してください",
    bgClass:
      "bg-gradient-to-br from-accent-urgent/70 via-accent-urgent/55 to-surface-raised-1/95",
    textClass: "text-accent-urgent",
    borderClass: "border-accent-urgent/40",
  },
};

export function getRiskPresentation(risk: RiskLevel): RiskPresentation {
  return RISK_PRESENTATIONS[risk];
}
