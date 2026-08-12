const PLACEHOLDER_PATTERN = /^REPLACE_ME/;

function isConfigured(value: string | undefined): boolean {
  return !!value && !PLACEHOLDER_PATTERN.test(value);
}

/**
 * クライアント側で参照可能な設定値。サーバー専用キー(Directions/Places)は
 * ここでは公開しない。未設定時はAPIキー入力を促す案内UIに切り替える。
 */
export const clientEnv = {
  googleMapsJsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY,
  /**
   * Vector Map ID。設定時のみ地図がベクターレンダリングになり、回転・チルトが機能する。
   * ダーク/ライト両方のCloud Consoleスタイルを同じMap IDに登録し、地図のcolorSchemeオプションで
   * どちらを見せるか切り替える(mapId自体は1つで済む)。
   */
  googleMapsMapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
  firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
} as const;

// Vector Map(WebGL描画)は、モバイル端末でGPUメモリが逼迫した際にコンテキストロストが
// 起こり地図が真っ白のまま操作不能になる不具合の発生源になっている。検知してのリビルドを
// 実装済みだが再発が続くため、raster map(WebGL非依存のタイル描画)に固定して原因ごと排除する。
export const isVectorMapConfigured = false;

export const isGoogleMapsConfigured = isConfigured(clientEnv.googleMapsJsApiKey);

export const isFirebaseConfigured =
  isConfigured(clientEnv.firebaseApiKey) &&
  isConfigured(clientEnv.firebaseAuthDomain) &&
  isConfigured(clientEnv.firebaseProjectId);

/** サーバー(API Route)専用。クライアントバンドルには含まれない。 */
export const serverEnv = {
  googleDirectionsApiKey: process.env.GOOGLE_DIRECTIONS_API_KEY,
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
} as const;

export function isServerKeyConfigured(value: string | undefined): boolean {
  return isConfigured(value);
}
