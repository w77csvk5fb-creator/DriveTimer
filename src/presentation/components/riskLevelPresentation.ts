import type { RiskLevel } from "@/domain/entities/riskLevel";

export interface RiskPresentation {
  readonly emoji: string;
  readonly labelJa: string;
  readonly bgClass: string;
  readonly textClass: string;
  readonly borderClass: string;
}

const RISK_PRESENTATIONS: Record<RiskLevel, RiskPresentation> = {
  safe: {
    emoji: "🟢",
    labelJa: "安全",
    bgClass: "bg-gradient-to-br from-accent-safe/35 via-accent-safe/15 to-transparent",
    textClass: "text-accent-safe",
    borderClass: "border-accent-safe/40",
  },
  caution: {
    emoji: "🟡",
    labelJa: "余裕が少なくなっています",
    bgClass: "bg-gradient-to-br from-accent-caution/35 via-accent-caution/15 to-transparent",
    textClass: "text-accent-caution",
    borderClass: "border-accent-caution/40",
  },
  warning: {
    emoji: "🟠",
    labelJa: "そろそろ折り返してください",
    bgClass: "bg-gradient-to-br from-accent-warning/35 via-accent-warning/15 to-transparent",
    textClass: "text-accent-warning",
    borderClass: "border-accent-warning/40",
  },
  critical: {
    emoji: "🔴",
    labelJa: "今すぐ折り返してください",
    bgClass: "bg-gradient-to-br from-accent-urgent/35 via-accent-urgent/15 to-transparent",
    textClass: "text-accent-urgent",
    borderClass: "border-accent-urgent/40",
  },
};

export function getRiskPresentation(risk: RiskLevel): RiskPresentation {
  return RISK_PRESENTATIONS[risk];
}
