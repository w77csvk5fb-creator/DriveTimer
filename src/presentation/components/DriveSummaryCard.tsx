import type { DriveSummary } from "@/domain/entities/driveSummary";
import { formatDurationJa, formatTimeJa } from "@/core/utils/durationFormatter";
import { getSafetyRatingPresentation } from "./safetyRatingPresentation";

interface DriveSummaryCardProps {
  readonly summary: DriveSummary;
}

/** ドライブ終了直後の振り返りカード。数字だけでなく安全評価バッジも一緒に見せる。 */
export function DriveSummaryCard({ summary }: DriveSummaryCardProps) {
  const rating = getSafetyRatingPresentation(summary.safetyRating);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-outline bg-surface-raised-1 p-5">
      <p className="text-center text-2xl font-bold text-on-surface">🎉 ドライブ終了</p>

      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-on-surface-muted">走行時間</dt>
        <dd className="text-right tabular-nums text-on-surface">
          {formatDurationJa(summary.drivingDurationMs)}
        </dd>

        <dt className="text-on-surface-muted">自由時間</dt>
        <dd className="text-right tabular-nums text-on-surface">
          {formatDurationJa(summary.freeTimeAtStartMs)}
        </dd>

        {summary.turnBackDetectedAt && (
          <>
            <dt className="text-on-surface-muted">折り返した時刻</dt>
            <dd className="text-right tabular-nums text-on-surface">
              {formatTimeJa(summary.turnBackDetectedAt)}
            </dd>
          </>
        )}

        <dt className="text-on-surface-muted">目的地到着</dt>
        <dd className="text-right tabular-nums text-on-surface">
          {formatTimeJa(summary.actualArrival)}
        </dd>

        <dt className="text-on-surface-muted">予定到着</dt>
        <dd className="text-right tabular-nums text-on-surface">
          {formatTimeJa(summary.scheduledArrival)}
        </dd>

        <dt className="text-on-surface-muted">余裕</dt>
        <dd className="text-right tabular-nums text-on-surface">
          {formatDurationJa(summary.marginMs)}
        </dd>
      </dl>

      <div
        className={`flex items-center justify-center gap-2 rounded-xl border border-outline py-2 ${rating.textClass}`}
      >
        <span className="text-lg">{rating.emoji}</span>
        <span className="font-semibold">{rating.label}</span>
      </div>
    </section>
  );
}
