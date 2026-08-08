"use client";

import { useEffect } from "react";

/**
 * ルートセグメント配下で発生した未処理の描画エラーを捕捉するフォールバックUI。
 * これが無いと、React 18以降はエラー発生時にツリー全体をアンマウントし、
 * 真っ白な画面になったまま何も表示されなくなる。
 */
export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-lg font-bold text-on-surface">問題が発生しました</p>
      <p className="text-sm text-on-surface-muted">
        アプリの表示中にエラーが発生しました。再読み込みしてもう一度お試しください。
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="btn-primary-gradient rounded-2xl px-6 py-3 text-base font-bold text-on-surface"
      >
        再読み込み
      </button>
      {/* 原因特定の手がかりとして、エラー内容をそのまま表示しておく(サーバー側のログ収集が無いため)。 */}
      <p className="max-w-full break-words text-xs text-on-surface-muted/70">
        {error.name}: {error.message}
        {error.digest ? ` (digest: ${error.digest})` : ""}
      </p>
    </main>
  );
}
