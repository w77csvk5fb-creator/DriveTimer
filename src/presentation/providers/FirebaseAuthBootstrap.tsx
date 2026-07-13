"use client";

import { useEffect } from "react";
import { ensureAnonymousAuth } from "@/data/firebase/firebaseClient";

// アプリ起動時に匿名認証を済ませておく（未設定時は何もしない）。表示は持たない。
export function FirebaseAuthBootstrap() {
  useEffect(() => {
    void ensureAnonymousAuth();
  }, []);

  return null;
}
