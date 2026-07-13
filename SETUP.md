# SETUP

DriveTime（仮）を実際のGPS・地図・経路探索付きで動かすためのセットアップ手順です。

**シミュレーションモードだけを試したい場合、この手順は不要です。** `npm install && npm run dev` の後、アプリ内の「シミュレーションモード」をONにすれば、APIキー無しでV1の主要機能（リアルタイム逆算・リスクメーター・通知・到着保証モード・最短ルート提案・ドライブ終了アシスト）を確認できます。

## 1. 前提条件

- Node.js 20以上 / npm
- Googleアカウント（Google Cloud Console用）
- デプロイする場合はNode.jsが動くホスティング（Vercel等）。本アプリはサーバー側API Route（`/api/directions`, `/api/places`）を使うため、**静的エクスポート(`next export`)非対応**です。

## 2. Google Cloud Consoleでのプロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) で新規プロジェクトを作成する。
2. 「APIとサービス」→「ライブラリ」から以下を有効化する。
   - **Maps JavaScript API**（地図表示用）
   - **Directions API**（経路・所要時間取得用）
   - **Places API (New)**（目的地検索用）
3. 「認証情報」からAPIキーを **2つ** 発行する（用途ごとに制限を分けるため）。

### 2-1. クライアント用キー（地図表示用）

- 用途: `NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY`
- ブラウザで直接使われるため、**必ずHTTPリファラー制限**をかける（本番ドメイン + `http://localhost:3000/*` を開発用に追加）。
- 許可するAPI: Maps JavaScript API のみに制限する。

### 2-2. サーバー用キー（Directions/Places用）

- 用途: `GOOGLE_DIRECTIONS_API_KEY`, `GOOGLE_PLACES_API_KEY`（同じキーを使い回しても、別々に発行してもよい）
- サーバー(Next.jsのAPI Route)からのみ呼び出すため、クライアントに露出しない。IP制限をかけられる環境ではサーバーのIPで制限するとより安全。
- 許可するAPI: Directions API, Places API (New) に制限する。

## 3. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開き、`REPLACE_ME_...` となっている値を実際のキーに置き換える。

```
NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY=あなたのMaps JSキー
GOOGLE_DIRECTIONS_API_KEY=あなたのDirectionsキー
GOOGLE_PLACES_API_KEY=あなたのPlacesキー
```

`NEXT_PUBLIC_FIREBASE_*` はV2（お気に入り保存機能）で使用予定のため、V1では未設定のままで構いません。

キーが未設定（プレースホルダーのまま）の場合、アプリは地図・目的地検索を無効化し、「APIキーが未設定です」という案内を表示します（クラッシュしません）。

## 4. 起動

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。

## 5. PWAアイコンの差し替え

`public/icons/` には開発用のプレースホルダーアイコン（`scripts/gen-icons.mjs` で生成した幾何学模様）が入っています。本番公開前に実際のブランドアイコンへ差し替えてください。

- `icon-192.png` (192x192)
- `icon-512.png` (512x512)
- `icon-maskable-512.png` (512x512, Android用maskableアイコン。中央80%のセーフゾーンに主要な絵柄を収める)
- `apple-touch-icon.png` (180x180)

プレースホルダーを再生成したい場合:

```bash
node scripts/gen-icons.mjs
```

## 6. デプロイ

Node.jsが動くホスティング（Vercel、または自前のNode/Dockerサーバー等）を想定しています。デプロイ先の環境変数に、`.env.local` と同じキーを設定してください。

`npm run build` は `next build --webpack` を実行します（PWA化に使っている `@serwist/next` が現時点でTurbopack未対応のため）。デプロイ先のビルドコマンドをカスタマイズできる場合は `npm run build` をそのまま使ってください。

## 7. Firebase（V2で使用予定、V1では不要）

V2（お気に入り保存機能）を実装する際は、以下の手順を想定しています。

1. [Firebase Console](https://console.firebase.google.com/) で新規プロジェクトを作成。
2. Firestore Database を有効化（本番モード、ロケーションは `asia-northeast1` 等）。
3. Authentication で「匿名」プロバイダを有効化（ログインUIは設けない想定）。
4. プロジェクト設定からWeb アプリを追加し、`NEXT_PUBLIC_FIREBASE_*` の値を `.env.local` に設定。
5. Firestore セキュリティルールで、`users/{uid}/**` を本人のみread/write可能に制限する。

## トラブルシューティング

- **地図が表示されない**: `NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY` が正しいか、Maps JavaScript APIが有効化されているか、HTTPリファラー制限に開発中のURLが含まれているかを確認してください。
- **目的地検索が「APIキーが未設定です」と表示される**: `GOOGLE_PLACES_API_KEY` を確認してください（サーバー側の環境変数のため、開発サーバーの再起動が必要な場合があります）。
- **位置情報が取得できない**: ブラウザの位置情報許可設定を確認してください。HTTPS（またはlocalhost）でない環境ではGeolocation APIがブロックされます。
- **通知が来ない**: 通知許可は「出発」ボタンを押した際にリクエストされます。ブラウザの通知設定で拒否されていないか確認してください。iOS Safariはホーム画面に追加したPWAでのみWeb Push相当の挙動をサポートします（V1はフォアグラウンド通知のみを想定）。
