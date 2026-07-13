export function WakeLockWarningBanner() {
  return (
    <div className="rounded-xl border border-accent-warning/40 bg-accent-warning/10 px-3 py-2 text-center text-xs text-accent-warning">
      画面を消すと、位置情報の取得やタイマー更新が停止する場合があります。
    </div>
  );
}
