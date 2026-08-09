/// <reference lib="webworker" />
// Service Worker本体。ビルド時に@serwist/nextがprecacheマニフェストを注入する。
// 型チェック(tsc --noEmit)対象からは除外している(tsconfig.jsonのexclude参照)。
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// defaultCacheの同一オリジンページ/その他リソース向けエントリにはネットワークタイムアウトが
// 設定されておらず、運転中で電波が不安定な時にネットワーク応答を無期限に待ち続けて画面が
// 固まる(真っ白のまま操作不能になる)おそれがある。同条件のエントリを先に定義し、
// タイムアウト付きのNetworkFirstで上書きする(マッチした最初のルートが使われるため先勝ち)。
const NAVIGATION_TIMEOUT_SECONDS = 8;

const timeoutBoundedCaching: RuntimeCaching[] = [
  {
    matcher: ({ request, url, sameOrigin }) =>
      request.headers.get("Content-Type")?.includes("text/html") === true &&
      sameOrigin &&
      !url.pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "pages",
      networkTimeoutSeconds: NAVIGATION_TIMEOUT_SECONDS,
    }),
  },
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && !url.pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "others",
      networkTimeoutSeconds: NAVIGATION_TIMEOUT_SECONDS,
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...timeoutBoundedCaching, ...defaultCache],
});

serwist.addEventListeners();
