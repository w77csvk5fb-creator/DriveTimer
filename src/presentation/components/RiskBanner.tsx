import type { OnTrackDriveStatus } from "@/domain/entities/driveStatus";
import { formatDurationJa, formatTimeJa } from "@/core/utils/durationFormatter";
import { getRiskPresentation } from "./riskLevelPresentation";

interface RiskBannerProps {
  readonly status: OnTrackDriveStatus;
}

/**
 * ホーム画面最上部のリスクメーター兼カウントダウン表示。
 * 「画面を開いた瞬間に一目で分かる」ことが最重要要件のため、常にこの1枚のカードで
 * リスク・自由時間・目的地までの所要時間・到着予定時刻をまとめて見せる。
 */
export function RiskBanner({ status }: RiskBannerProps) {
  const presentation = getRiskPresentation(status.risk);

  return (
    <section
      className={`flex flex-col items-center gap-1 rounded-2xl border px-6 py-5 text-center ${presentation.bgClass} ${presentation.borderClass}`}
    >
      <p className={`text-xl font-semibold ${presentation.textClass}`}>
        {presentation.emoji} {presentation.labelJa}
      </p>
      <p className="text-3xl font-bold tabular-nums text-on-surface">
        あと {formatDurationJa(status.freeTimeRemainingMs)} 走れます
      </p>
      <div className="mt-1 flex gap-4 text-sm tabular-nums text-on-surface-muted">
        <span>目的地まで {formatDurationJa(status.etaToDestinationMs)}</span>
        <span>到着予定 {formatTimeJa(status.projectedArrivalTime)}</span>
      </div>
    </section>
  );
}
