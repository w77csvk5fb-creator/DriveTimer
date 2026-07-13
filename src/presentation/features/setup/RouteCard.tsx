import type { ScenicRouteCandidate } from "@/domain/entities/scenicRouteCandidate";
import { getRouteCategoryPresentation } from "@/presentation/components/routeCategoryPresentation";
import { formatDurationJa } from "@/core/utils/durationFormatter";

interface RouteCardProps {
  readonly candidate: ScenicRouteCandidate;
  readonly directDurationMs: number;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

export function RouteCard({ candidate, directDurationMs, selected, onSelect }: RouteCardProps) {
  const presentation = getRouteCategoryPresentation(candidate.category);
  const deltaMs = candidate.durationMs - directDurationMs;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-1 rounded-xl border p-3 text-left ${
        selected ? "border-accent-primary bg-accent-primary/10" : "border-outline"
      }`}
    >
      <span className="text-sm font-semibold text-on-surface">
        {presentation.emoji} {presentation.labelJa}
      </span>
      <span className="text-xs text-on-surface-muted">
        所要時間 約{formatDurationJa(candidate.durationMs)}（直行より{formatDurationJa(deltaMs)}長い）
      </span>
    </button>
  );
}
