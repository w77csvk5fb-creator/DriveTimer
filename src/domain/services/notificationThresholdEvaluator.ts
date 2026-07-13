import type { DriveStatus } from "@/domain/entities/driveStatus";
import type {
  NotificationEvent,
  NotificationEventId,
} from "@/domain/entities/notificationEvent";
import {
  DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES,
  NOTIFICATION_THRESHOLDS_MINUTES,
} from "@/core/constants/appConstants";

interface ThresholdDefinition {
  readonly id: NotificationEventId;
  readonly minutesThreshold: number;
  readonly event: Omit<NotificationEvent, "id">;
}

// 緊急度が低い順(15分前→10分前→5分前→時間切れ)。到着保証モードはこのラダーとは独立したイベント。
// 時間切れ(0分)は常に有効。それ以外はleadTimesMinutesで選ばれたものだけが評価対象になる。
const ALL_RUNGS: readonly ThresholdDefinition[] = [
  {
    id: "fifteenMinWarning",
    minutesThreshold: NOTIFICATION_THRESHOLDS_MINUTES.fifteenMinWarning,
    event: {
      severity: "info",
      titleJa: "🔔 そろそろ折り返しましょう",
      bodyJa: "自由時間が残りわずかになってきました。",
    },
  },
  {
    id: "tenMinWarning",
    minutesThreshold: NOTIFICATION_THRESHOLDS_MINUTES.tenMinWarning,
    event: {
      severity: "info",
      titleJa: "🔔 残り10分です",
      bodyJa: "そろそろ折り返しを検討してください。",
    },
  },
  {
    id: "fiveMinWarning",
    minutesThreshold: NOTIFICATION_THRESHOLDS_MINUTES.fiveMinWarning,
    event: {
      severity: "warning",
      titleJa: "⚠️ あと5分で折り返し推奨です",
      bodyJa: "そろそろ折り返す準備をしてください。",
    },
  },
  {
    id: "timeUp",
    minutesThreshold: NOTIFICATION_THRESHOLDS_MINUTES.timeUp,
    event: {
      severity: "urgent",
      titleJa: "🚨 今すぐ折り返してください",
      bodyJa: "予定時刻に間に合わせるには今すぐ折り返す必要があります。",
    },
  },
];

const ARRIVAL_GUARANTEE_EVENT: Omit<NotificationEvent, "id"> = {
  severity: "urgent",
  titleJa: "🚨 到着保証モード",
  bodyJa: "このままでは締切に間に合いません。最短ルートへの変更を検討してください。",
};

export interface NotificationThresholdEvaluatorResult {
  readonly newlyFired: readonly NotificationEvent[];
  readonly firedIds: ReadonlySet<NotificationEventId>;
}

/**
 * DriveStatusと「これまでに発火済みのイベントID集合」から、今回新たに発火すべき
 * 通知を判定する純粋関数。
 *
 * - 折り返し通知(15分前/10分前/5分前/時間切れ)は一度きり発火。渋滞急悪化で複数閾値を
 *   一気に跨いだ場合も最も緊急な未発火の1件のみ通知し、それより緩い閾値は発火済み扱いに
 *   する（バースト防止）。
 * - leadTimesMinutesはユーザーが設定画面で選んだ有効な通知タイミング（例: [15,5]）。
 *   時間切れ(0分)は選択に関わらず常に有効。省略時は既定の[15,5]（従来の固定挙動と同一）。
 * - 到着保証モード突入は上記のラダーとは独立した一度きりイベント。
 * - 一度発火したイベントは、状況が改善しても取り消さない（アンチスパム、回復時の再発火を防ぐ）。
 */
export function evaluateNotificationThresholds(
  status: DriveStatus,
  firedIds: ReadonlySet<NotificationEventId>,
  leadTimesMinutes: readonly number[] = DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES,
): NotificationThresholdEvaluatorResult {
  const nextFired = new Set(firedIds);
  const newlyFired: NotificationEvent[] = [];

  if (status.kind === "arrivalGuaranteeFailure") {
    if (!nextFired.has("arrivalGuaranteeModeEntered")) {
      newlyFired.push({ id: "arrivalGuaranteeModeEntered", ...ARRIVAL_GUARANTEE_EVENT });
      nextFired.add("arrivalGuaranteeModeEntered");
    }
    return { newlyFired, firedIds: nextFired };
  }

  const freeMinutes = status.freeTimeRemainingMs / 60_000;
  const activeLadder = ALL_RUNGS.filter(
    (t) => t.minutesThreshold === 0 || leadTimesMinutes.includes(t.minutesThreshold),
  );

  // 緊急度が高い(minutesThresholdが小さい)順に走査し、最初に見つかった
  // 「越えていて、かつ未発火」の閾値だけを発火対象にする。
  const crossed = [...activeLadder]
    .sort((a, b) => a.minutesThreshold - b.minutesThreshold)
    .find((t) => freeMinutes <= t.minutesThreshold && !nextFired.has(t.id));

  if (crossed) {
    newlyFired.push({ id: crossed.id, ...crossed.event });
    for (const t of activeLadder) {
      if (t.minutesThreshold >= crossed.minutesThreshold) {
        nextFired.add(t.id);
      }
    }
  }

  return { newlyFired, firedIds: nextFired };
}
