/**
 * 「19:00までに到着」のような時刻入力を、常に「今日」の日付として解決する。
 * 既に過ぎている時刻でも日付操作自体は行わない（過去判定はisDeadlineInPastで別途行う）。
 */
export function resolveDeadlineForToday(
  hours: number,
  minutes: number,
  now: Date,
): Date {
  const resolved = new Date(now);
  resolved.setHours(hours, minutes, 0, 0);
  return resolved;
}

/** 締切が現在時刻より過去かどうかを判定する。過去なら入力側で拒否する。 */
export function isDeadlineInPast(deadline: Date, now: Date): boolean {
  return deadline.getTime() <= now.getTime();
}
