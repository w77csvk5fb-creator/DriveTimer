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
        selected ? "pill-selected border-accent-primary" : "border-outline"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
        {presentation.emoji} {presentation.labelJa}
        {candidate.usesHighway ? (
          <span className="rounded-full bg-accent-warning/20 px-2 py-0.5 text-xs font-semibold text-accent-warning">
            🛣️ 高速道路を利用
          </span>
        ) : (
          <span className="rounded-full bg-accent-safe/15 px-2 py-0.5 text-xs font-semibold text-accent-safe">
            高速道路なし
          </span>
        )}
      </span>
      <span className="text-xs text-on-surface-muted">
        所要時間 約{formatDurationJa(candidate.durationMs)}（直行より{formatDurationJa(deltaMs)}長い）
      </span>
    </button>
  );
}
