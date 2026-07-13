import type { NotificationEvent } from "@/domain/entities/notificationEvent";

interface NotificationToastProps {
  readonly event: NotificationEvent;
}

const SEVERITY_BORDER_CLASS: Record<NotificationEvent["severity"], string> = {
  info: "border-accent-info/50",
  warning: "border-accent-warning/50",
  urgent: "border-accent-urgent/50",
};

/**
 * Notification許可が得られていない環境でも折り返しアラートに気づけるよう、
 * アプリ内にも同じ内容を表示する（OS通知の代替ではなく補完）。
 */
export function NotificationToast({ event }: NotificationToastProps) {
  return (
    <div
      className={`rounded-xl border bg-surface-raised-1 px-3 py-2 text-sm ${SEVERITY_BORDER_CLASS[event.severity]}`}
    >
      <p className="font-semibold text-on-surface">{event.titleJa}</p>
      <p className="text-on-surface-muted">{event.bodyJa}</p>
    </div>
  );
}
