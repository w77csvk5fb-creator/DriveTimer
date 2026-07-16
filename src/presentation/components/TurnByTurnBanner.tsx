import type { RouteStepSummary } from "@/domain/repositories/directionsRepository";
import { getManeuverPresentation } from "./maneuverPresentation";

interface TurnByTurnBannerProps {
  readonly step: RouteStepSummary;
}

function formatDistanceJa(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters / 10) * 10}m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

/** 走行中の次の曲がり角案内。あくまで参考表示であり、実ナビの代替ではない。 */
export function TurnByTurnBanner({ step }: TurnByTurnBannerProps) {
  const presentation = getManeuverPresentation(step.maneuver);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-accent-safe/90 px-4 py-3 text-on-surface">
      <span className="text-3xl leading-none">{presentation.emoji}</span>
      <div className="flex flex-col">
        <span className="text-xl font-bold tabular-nums">
          {formatDistanceJa(step.distanceMeters)}
        </span>
        <span className="text-sm">{presentation.labelJa}</span>
      </div>
    </div>
  );
}
