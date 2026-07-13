"use client";

import { useEffect, useState } from "react";
import { isFirebaseConfigured } from "@/core/config/env";
import { favoriteDestinationRepository } from "@/data/repositories/favoriteDestinationRepositoryInstance";
import type { FavoriteDestination } from "@/domain/entities/favoriteDestination";

const LABEL_TEXT: Record<FavoriteDestination["label"], string> = {
  home: "🏠 自宅",
  school: "🏫 学校",
  work: "🏢 職場",
  custom: "⭐",
};

export function FavoritesSettings() {
  const [favorites, setFavorites] = useState<readonly FavoriteDestination[] | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    void favoriteDestinationRepository.listFavorites().then(setFavorites);
  }, []);

  const handleDelete = async (id: string) => {
    await favoriteDestinationRepository.deleteFavorite(id);
    setFavorites(await favoriteDestinationRepository.listFavorites());
  };

  if (!isFirebaseConfigured) {
    return (
      <section className="flex flex-col gap-2 rounded-2xl border border-outline bg-surface-raised-1 p-4">
        <h2 className="text-sm font-semibold text-on-surface-muted">お気に入り</h2>
        <p className="text-sm text-on-surface-muted">
          Firebaseが設定されていないため、お気に入り機能は利用できません（SETUP.md参照）。
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-outline bg-surface-raised-1 p-4">
      <h2 className="text-sm font-semibold text-on-surface-muted">お気に入り</h2>

      {favorites === null && <p className="text-sm text-on-surface-muted">読み込み中…</p>}
      {favorites !== null && favorites.length === 0 && (
        <p className="text-sm text-on-surface-muted">まだお気に入りがありません。</p>
      )}

      <ul className="flex flex-col gap-2">
        {favorites?.map((favorite) => (
          <li
            key={favorite.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-outline p-3"
          >
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="text-on-surface-muted">
                {favorite.label === "custom" ? `⭐ ${favorite.customLabel ?? ""}` : LABEL_TEXT[favorite.label]}
              </span>
              <span className="text-on-surface">{favorite.name}</span>
            </div>
            <button
              type="button"
              onClick={() => void handleDelete(favorite.id)}
              className="shrink-0 text-sm text-on-surface-muted"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
