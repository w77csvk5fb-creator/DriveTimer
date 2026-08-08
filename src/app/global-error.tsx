"use client";

import { useEffect } from "react";

/**
 * ルートレイアウト自体で発生した未処理エラーを捕捉するフォールバック。
 * ルートレイアウトを丸ごと置き換えるため<html>/<body>を自前で描画する必要があり、
 * globals.cssのユーティリティクラスに頼らずインラインスタイルで最低限の見た目を保証する。
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "1rem",
            padding: "1rem",
            textAlign: "center",
            background: "#f5e8d0",
            color: "#17263f",
            fontFamily: "sans-serif",
          }}
        >
          <p style={{ fontSize: "1.125rem", fontWeight: 700 }}>問題が発生しました</p>
          <p style={{ fontSize: "0.875rem", color: "#59627a" }}>
            アプリの表示中にエラーが発生しました。再読み込みしてもう一度お試しください。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              borderRadius: "1rem",
              padding: "0.75rem 1.5rem",
              fontWeight: 700,
              fontSize: "1rem",
              background: "linear-gradient(135deg, #f0934a, #e8687f)",
              color: "#17263f",
              border: "none",
            }}
          >
            再読み込み
          </button>
          {/* 原因特定の手がかりとして、エラー内容をそのまま表示しておく(サーバー側のログ収集が無いため)。 */}
          <p style={{ maxWidth: "100%", wordBreak: "break-word", fontSize: "0.75rem", color: "#59627a" }}>
            {error.name}: {error.message}
            {error.digest ? ` (digest: ${error.digest})` : ""}
          </p>
        </main>
      </body>
    </html>
  );
}
