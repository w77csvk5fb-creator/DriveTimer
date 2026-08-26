export function WakeLockWarningBanner() {
  return (
    <div className="rounded-xl border border-accent-warning/40 bg-surface-raised-1/90 px-3 py-2 text-center text-xs text-accent-warning shadow-lg">
      画面を消すと、位置情報の取得やタイマー更新が停止する場合があります。
    </div>
  );
}
