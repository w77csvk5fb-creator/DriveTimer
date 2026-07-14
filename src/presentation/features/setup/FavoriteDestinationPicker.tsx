"use client";

import { useEffect, useState } from "react";
import { isFirebaseConfigured } from "@/core/config/env";
import { favoriteDestinationRepository } from "@/data/repositories/favoriteDestinationRepositoryInstance";
import type { FavoriteDestination, FavoriteLabel } from "@/domain/entities/favoriteDestination";
import type { SelectedDestination } from "./DestinationSearchField";

const PRESET_LABELS: ReadonlyArray<{ label: FavoriteLabel; text: string }> = [
  { label: "home", text: "🏠 自宅" },
  { label: "school", text: "🏫 学校" },
  { label: "work", text: "🏢 職場" },
];

interface FavoriteDestinationPickerProps {
  readonly onSelect: (destination: SelectedDestination) => void;
  /** この値が変わるたびにお気に入り一覧を再取得する(新規保存後の反映用)。 */
  readonly refreshKey?: number;
}

export function FavoriteDestinationPicker({ onSelect, refreshKey }: FavoriteDestinationPickerProps) {
  const [favorites, setFavorites] = useState<readonly FavoriteDestination[] | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    void favoriteDestinationRepository.listFavorites().then(setFavorites);
  }, [refreshKey]);

  if (!isFirebaseConfigured) {
    return (
      <p className="text-xs text-on-surface-muted">
        お気に入りを使うにはFirebaseの設定が必要です（SETUP.md参照）。
      </p>
    );
  }

  if (favorites === null) {
    return <p className="text-xs text-on-surface-muted">お気に入りを読み込み中…</p>;
  }

  const presets = PRESET_LABELS.map(({ label, text }) => ({
    text,
    favorite: favorites.find((f) => f.label === label),
  })).filter((p) => p.favorite);
  const customFavorites = favorites.filter((f) => f.label === "custom");

  if (presets.length === 0 && customFavorites.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-on-surface-muted">お気に入りから選ぶ</span>
      <div className="flex flex-wrap gap-2">
        {presets.map(({ text, favorite }) => (
          <button
            key={favorite!.id}
            type="button"
            onClick={() => onSelect({ name: favorite!.name, point: favorite!.point })}
            className="rounded-full border border-outline px-3 py-1.5 text-sm text-on-surface"
          >
            {text}
          </button>
        ))}
        {customFavorites.map((favorite) => (
          <button
            key={favorite.id}
            type="button"
            onClick={() => onSelect({ name: favorite.name, point: favorite.point })}
            className="rounded-full border border-outline px-3 py-1.5 text-sm text-on-surface"
          >
            ⭐ {favorite.customLabel ?? favorite.name}
          </button>
        ))}
      </div>
    </div>
  );
}
