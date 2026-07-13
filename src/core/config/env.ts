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
  firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
} as const;

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
