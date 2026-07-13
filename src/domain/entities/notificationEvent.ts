/**
 * 折り返し通知3段階(15分前/5分前/時間切れ)＋到着保証モード突入の計4種類。
 * それぞれセッション中に一度きりしか発火しない。
 */
export type NotificationEventId =
  | "fifteenMinWarning"
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
