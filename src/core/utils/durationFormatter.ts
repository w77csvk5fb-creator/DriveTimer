/** "1時間42分" / 負の値は "-5分" のように符号付きで表示する */
export function formatDurationJa(durationMs: number): string {
  const totalMinutes = Math.round(durationMs / 60_000);
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (hours > 0) return `${sign}${hours}時間${minutes}分`;
  return `${sign}${minutes}分`;
}

/** "18:51" のような24時間表記 */
export function formatTimeJa(date: Date): string {
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/** "7/13 18:51" のような月日+時刻表記（履歴一覧用） */
export function formatDateTimeJa(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTimeJa(date)}`;
}
