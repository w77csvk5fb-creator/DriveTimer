/**
 * 折り返し通知(15分前/10分前/5分前/時間切れ、ユーザーがどれを有効にするか選択可能)
 * ＋到着保証モード突入の計5種類。それぞれセッション中に一度きりしか発火しない。
 */
export type NotificationEventId =
  | "fifteenMinWarning"
  | "tenMinWarning"
  | "fiveMinWarning"
  | "timeUp"
  | "arrivalGuaranteeModeEntered";

export type NotificationSeverity = "info" | "warning" | "urgent";

export interface NotificationEvent {
  readonly id: NotificationEventId;
  readonly severity: NotificationSeverity;
  readonly titleJa: string;
  readonly bodyJa: string;
}
