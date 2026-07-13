import type { ArrivalGuaranteeFailureStatus } from "@/domain/entities/driveStatus";
import { formatDurationJa, formatTimeJa } from "@/core/utils/durationFormatter";

interface ArrivalGuaranteeBannerProps {
  readonly status: ArrivalGuaranteeFailureStatus;
}

/**
 * 到着保証モード: 安全バッファを考慮してもなお締切に間に合わない、最も深刻な状態。
 * 通常のリスク表示より常に優先して画面を専有する。
 */
export function ArrivalGuaranteeBanner({ status }: ArrivalGuaranteeBannerProps) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-accent-urgent bg-accent-urgent/20 px-6 py-6 text-center">
      <p className="text-2xl font-bold text-accent-urgent">🔴 到着保証モード</p>
      <p className="text-lg font-semibold text-on-surface">このままでは間に合いません</p>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm text-on-surface-muted">予定到着時刻</span>
        <span className="text-3xl font-bold tabular-nums text-on-surface">
          {formatTimeJa(status.projectedArrivalTime)}
        </span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm text-on-surface-muted">予定より</span>
        <span className="text-2xl font-bold tabular-nums text-accent-urgent">
          {formatDurationJa(status.delayMs)}遅れます
        </span>
      </div>
    </section>
  );
}
