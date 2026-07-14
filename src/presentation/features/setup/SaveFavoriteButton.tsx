"use client";

import { useState } from "react";
import { isFirebaseConfigured } from "@/core/config/env";
import { favoriteDestinationRepository } from "@/data/repositories/favoriteDestinationRepositoryInstance";
import type { FavoriteLabel } from "@/domain/entities/favoriteDestination";
import type { SelectedDestination } from "./DestinationSearchField";

interface SaveFavoriteButtonProps {
  readonly destination: SelectedDestination | null;
  /** 保存成功時に呼ばれる(お気に入り一覧の再取得トリガー用)。 */
  readonly onSaved?: () => void;
}

const LABEL_OPTIONS: ReadonlyArray<{ label: FavoriteLabel; text: string }> = [
  { label: "home", text: "自宅" },
  { label: "school", text: "学校" },
  { label: "work", text: "職場" },
];

/** 選択中の目的地を自宅/学校/職場/カスタム名でお気に入り登録するボタン。 */
export function SaveFavoriteButton({ destination, onSaved }: SaveFavoriteButtonProps) {
  const [open, setOpen] = useState(false);
  const [customLabelText, setCustomLabelText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isFirebaseConfigured || !destination) return null;

  const handleSave = async (label: FavoriteLabel, customLabel: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await favoriteDestinationRepository.saveFavorite({
        label,
        customLabel,
        name: destination.name,
        address: null,
        point: destination.point,
      });
      setSaved(true);
      setOpen(false);
      onSaved?.();
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return <p className="text-xs text-accent-safe">お気に入りに追加しました。</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs text-accent-primary"
      >
        ⭐ お気に入りに追加
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-outline p-3">
      <span className="text-xs text-on-surface-muted">ラベルを選択</span>
      <div className="flex flex-wrap gap-2">
        {LABEL_OPTIONS.map(({ label, text }) => (
          <button
            key={label}
            type="button"
            disabled={saving}
            onClick={() => void handleSave(label, null)}
            className="rounded-full border border-outline px-3 py-1 text-xs text-on-surface disabled:opacity-50"
          >
            {text}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={customLabelText}
          onChange={(e) => setCustomLabelText(e.target.value)}
          placeholder="カスタム名"
          className="flex-1 rounded-lg border border-outline bg-surface-raised-1 px-2 py-1 text-xs text-on-surface"
        />
        <button
          type="button"
          disabled={saving || !customLabelText.trim()}
          onClick={() => void handleSave("custom", customLabelText.trim())}
          className="rounded-full border border-outline px-3 py-1 text-xs text-on-surface disabled:opacity-50"
        >
          保存
        </button>
      </div>
      {error && <p className="text-xs text-accent-urgent">{error}</p>}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="self-start text-xs text-on-surface-muted"
      >
        キャンセル
      </button>
    </div>
  );
}
