import type { NotificationEvent } from "@/domain/entities/notificationEvent";

export interface WebNotificationController {
  readonly isSupported: boolean;
  requestPermission(): Promise<NotificationPermission>;
  show(event: NotificationEvent): void;
}

/**
 * Web Notifications APIのラッパー。許可リクエストは必ずユーザー操作内で呼び出すこと
 * （呼び出し側の責務）。iOS Safari等 `new Notification()` が例外を投げる環境もあるため
 * try/catchで握りつぶし、通知が出せないだけでアプリを壊さないようにする。
 */
export class BrowserNotificationController implements WebNotificationController {
  get isSupported(): boolean {
    return typeof window !== "undefined" && !!window.Notification;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) return "denied";
    if (Notification.permission !== "default") return Notification.permission;
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  }

  show(event: NotificationEvent): void {
    if (!this.isSupported || Notification.permission !== "granted") return;
    try {
      new Notification(event.titleJa, { body: event.bodyJa, tag: event.id });
    } catch {
      // 通知の表示に失敗しても致命的ではないため無視する
    }
  }
}
