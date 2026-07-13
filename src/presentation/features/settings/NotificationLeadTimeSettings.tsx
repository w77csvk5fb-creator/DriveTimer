"use client";

import { NOTIFICATION_LEAD_TIME_OPTIONS_MINUTES } from "@/core/constants/appConstants";
import { useSettingsStore } from "@/presentation/stores/settingsStore";

export function NotificationLeadTimeSettings() {
  const notificationLeadTimesMinutes = useSettingsStore((s) => s.notificationLeadTimesMinutes);
  const setNotificationLeadTimesMinutes = useSettingsStore(
    (s) => s.setNotificationLeadTimesMinutes,
  );

  const toggle = (minutes: number) => {
    const next = notificationLeadTimesMinutes.includes(minutes)
      ? notificationLeadTimesMinutes.filter((m) => m !== minutes)
      : [...notificationLeadTimesMinutes, minutes];
    setNotificationLeadTimesMinutes(next);
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-outline bg-surface-raised-1 p-4">
      <h2 className="text-sm font-semibold text-on-surface-muted">折り返し通知のタイミング</h2>
      <div className="flex flex-wrap gap-2">
        {NOTIFICATION_LEAD_TIME_OPTIONS_MINUTES.map((minutes) => {
          const active = notificationLeadTimesMinutes.includes(minutes);
          return (
            <button
              key={minutes}
              type="button"
              onClick={() => toggle(minutes)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                active
                  ? "border-accent-primary bg-accent-primary/20 text-on-surface"
                  : "border-outline text-on-surface-muted"
              }`}
            >
              {minutes}分前
            </button>
          );
        })}
        <span className="rounded-full border border-outline px-3 py-1.5 text-sm text-on-surface-muted">
          0分（時間切れ・常時ON）
        </span>
      </div>
    </section>
  );
}
