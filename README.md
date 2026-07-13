# DriveTime（仮）

「空き時間を安心してドライブに使えるアプリ」。目的地への到着時刻を守ることを最優先にしつつ、余った自由時間で安心してドライブできるよう、現在地から目的地までのリアルタイム逆算・折り返し通知・到着保証モードを提供するPWA（Progressive Web App）です。

App Store / Google Playを経由せず、Webサイトから直接ホーム画面に追加して使えます。

## コンセプト

- 目的地までの所要時間（渋滞考慮）と締切時刻から「自由に走れる時間」を算出
- 走行中は20秒 or 300m移動ごとに現在地を再取得し、自由時間・折り返し時刻・到着予定時刻をリアルタイム更新
- 15分前 / 10分前 / 5分前 / 時間切れの折り返し通知（一度きり発火、タイミングは設定画面で選択可能）
- 安全バッファを考慮してもなお締切に間に合わない場合は**到着保証モード**へ移行し、最短ルートへの切り替えを提案
- 実車に乗らなくても動作確認できる**シミュレーションモード**を搭載（4シナリオ×速度倍率）
- 自宅・学校・職場・カスタムの**お気に入り目的地**をFirebase（匿名認証＋Firestore）に保存
- 自由時間に応じて景色が良い/海沿い/山道/夜景/ワインディング/街中の**景観ルート提案**をヒューリスティックに生成（V3、あくまで参考提案であり走行中の安全計算には影響しません）

現在の実装範囲は **Version 1〜3** です。V4以降の計画は本READMEの末尾を参照してください。

## 技術スタック

| 領域 | 採用技術 |
|---|---|
| フレームワーク | Next.js (App Router) / TypeScript |
| 状態管理 | Zustand |
| スタイリング | Tailwind CSS v4 |
| 地図 | Google Maps JavaScript API |
| 経路探索 | Google Directions API（サーバー側プロキシ経由） |
| 目的地検索 | Google Places API (New)（サーバー側プロキシ経由） |
| 通知 | Web Notifications API + Vibration API + Web Audio API |
| PWA | Serwist（Service Worker / manifest） |
| 永続化 | localStorage（設定・ドライブ履歴）、Firebase Firestore（お気に入り目的地） |
| テスト | Vitest + Testing Library |

## ディレクトリ構成（抜粋）

```
src/
├── app/                 # Next.js App Router（ページ・API Route）
├── core/                # 定数・設定・共通ユーティリティ
├── domain/              # フレームワーク非依存の純粋ロジック（entities/services/usecases/repositories）
├── data/                # domainのrepositoryインターフェースの実装（本番/Simulated）
└── presentation/        # UIコンポーネント・画面・Zustandストア
```

`domain`層はテストで最も厳密に検証している部分です（`turnBackCalculator`＝折り返し計算の中核、`notificationThresholdEvaluator`＝通知の一度きり発火制御など）。

## セットアップ

初回セットアップの詳細手順（Google Cloud Console でのAPIキー発行など）は [SETUP.md](./SETUP.md) を参照してください。要約:

```bash
npm install
cp .env.local.example .env.local   # 値を編集する
npm run dev
```

**APIキーが未設定でも、シミュレーションモードで主要機能（リアルタイム逆算・リスクメーター・通知・到着保証モード・最短ルート提案・ドライブ終了アシスト）はすべて動作します。** 目的地検索・実地図描画・実GPS走行・お気に入り保存・景観ルート提案のみAPIキー/実機/Firebase設定が必要です（未設定時はそれぞれ「未設定です」という案内表示に切り替わり、クラッシュしません）。

## 開発コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動（`--webpack`固定。理由は下記「Turbopackについて」参照） |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番ビルドの起動 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest（1回実行） |
| `npm run test:watch` | Vitest（watchモード） |
| `npm run format` | Prettier整形 |

### Turbopackについて

Next.js 16はデフォルトでTurbopackを使用しますが、PWA化に使っている `@serwist/next` は現時点でTurbopackに未対応（webpackのみ対応）です。そのため `dev`/`build` スクリプトは明示的に `--webpack` を指定しています。将来 `@serwist/next` がTurbopackに対応した場合、または `@serwist/turbopack` へ移行した場合はこの制約を外せます。

## テスト方針

`domain`層（折り返し計算エンジン・通知の一度きり発火制御・ヒューリスティック系ロジック）と `data`層のブラウザAPIラッパー（Geolocation/WakeLock/Notification/Vibration）、APIルート（`/api/places`, `/api/directions`）を中心にVitestでカバーしています。UIの結線確認はシミュレーションモードを使ったブラウザでの手動確認で行っています。

## 今後の予定（V4）

- カフェ巡り・写真スポット・AIおすすめコース（Places周辺検索・LLM連携が必要、今回のV3スコープ外）
- CarPlay/Android Auto、燃料残量・天気・日没・交通事故情報の考慮
