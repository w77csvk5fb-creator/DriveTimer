"use client";

import { useEffect } from "react";

const RELOAD_FLAG_KEY = "drivetimer.chunkErrorReloaded";
// このミリ秒だけ問題なく動けたら「復旧成功」とみなし、次に別のチャンクエラーが
// 起きた時にも再度自動リロードできるようフラグを解除する。
const STABLE_AFTER_MS = 10_000;

function looksLikeChunkLoadError(reason: unknown): boolean {
  if (!reason) return false;
  const name = reason instanceof Error ? reason.name : "";
  const message = reason instanceof Error ? reason.message : String(reason);
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

/**
 * Service Workerのキャッシュが更新された直後など、ブラウザに残っている古いJSが
 * (もう存在しない)webpackチャンクを読み込もうとして失敗するケースを検知し、
 * 自動的に1回だけ再読み込みする。これが無いと、真っ白な画面のまま操作不能になりうる。
 * 同一セッション内での無限リロードを避けるため、sessionStorageのフラグで一度きりに制限する。
 */
export function ChunkErrorRecovery() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    function reloadOnce() {
      try {
        if (sessionStorage.getItem(RELOAD_FLAG_KEY)) return;
        sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
      } catch {
        // sessionStorageが使えない環境ではガード無しで進む(それでも無限ループにはなりにくい)
      }
      window.location.reload();
    }

    function handleError(event: ErrorEvent) {
      if (looksLikeChunkLoadError(event.error)) reloadOnce();
    }
    function handleRejection(event: PromiseRejectionEvent) {
      if (looksLikeChunkLoadError(event.reason)) reloadOnce();
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    const stableTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG_KEY);
      } catch {
        // 無視して良い
      }
    }, STABLE_AFTER_MS);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      clearTimeout(stableTimer);
    };
  }, []);

  return null;
}
