"use client";

import { useEffect } from "react";

// PWA化のためのService Worker登録。開発時はnext.config.tsでSW自体を無効化しているため
// (キャッシュがホットリロードを妨げるのを防ぐ)、このコンポーネントは本番ビルドでのみ意味を持つ。
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
