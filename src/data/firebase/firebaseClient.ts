import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { clientEnv, isFirebaseConfigured } from "@/core/config/env";

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let anonAuthPromise: Promise<string | null> | null = null;

/** 未設定時はnullを返す（他のGoogle API連携と同じ「壊れず優雅に劣化する」方針）。 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (!app) {
    // NextのHMRで再評価されても複数回初期化しないようgetApps()を確認する
    const existing = getApps();
    app =
      existing.length > 0
        ? existing[0]
        : initializeApp({
            apiKey: clientEnv.firebaseApiKey as string,
            authDomain: clientEnv.firebaseAuthDomain as string,
            projectId: clientEnv.firebaseProjectId as string,
          });
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  authInstance ??= getAuth(firebaseApp);
  return authInstance;
}

export function getFirebaseFirestore(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  firestoreInstance ??= getFirestore(firebaseApp);
  return firestoreInstance;
}

/**
 * 匿名認証でサインインし、uidを返す。未設定時はnull。
 * 複数箇所（Bootstrapコンポーネント・各リポジトリ）から同時に呼ばれても
 * signInAnonymouslyは1回しか実行されないようPromiseをメモ化する。
 */
export function ensureAnonymousAuth(): Promise<string | null> {
  if (!isFirebaseConfigured) return Promise.resolve(null);
  const auth = getFirebaseAuth();
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);

  anonAuthPromise ??= signInAnonymously(auth)
    .then((credential) => credential.user.uid)
    .catch(() => {
      // 失敗を永続的にキャッシュしない。認証プロバイダが後から有効化された場合などに
      // 次回呼び出しでリトライできるようにする。
      anonAuthPromise = null;
      return null;
    });
  return anonAuthPromise;
}
