/**
 * 「19:00までに到着」のような時刻入力を、直近の未来の日時として解決する。
 * 同じ日付に当てはめた結果が現在時刻以前になる場合、その時刻は翌日を指しているとみなし
 * 日付を1日進める（例: 現在23:20、入力00:10 → 翌日00:10。現在15:00、入力18:00 → 今日18:00）。
 * 締切を扱う全箇所でこの関数を通すことで、日付をまたぐ入力を一貫して正しく解決する。
 */
export function resolveUpcomingDeadline(hours: number, minutes: number, now: Date): Date {
  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}
