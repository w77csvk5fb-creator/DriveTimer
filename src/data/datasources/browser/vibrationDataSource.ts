import type { NotificationSeverity } from "@/domain/entities/notificationEvent";

const VIBRATION_PATTERNS_MS: Record<NotificationSeverity, readonly number[]> = {
  info: [120],
  warning: [120, 80, 120],
  urgent: [150, 80, 150, 80, 150],
};

export interface VibrationController {
  vibrate(severity: NotificationSeverity): void;
}

/** navigator.vibrate()のラッパー。iOS Safariは非対応のため無音でno-opにフォールバックする。 */
export class BrowserVibrationController implements VibrationController {
  vibrate(severity: NotificationSeverity): void {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    navigator.vibrate(VIBRATION_PATTERNS_MS[severity] as number[]);
  }
}
