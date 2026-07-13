"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { driveHistoryRepository } from "@/data/repositories/driveHistoryRepositoryInstance";
import type { DriveHistoryEntry } from "@/domain/entities/driveHistoryEntry";
import { formatDateTimeJa, formatDurationJa, formatTimeJa } from "@/core/utils/durationFormatter";
import { getRiskPresentation } from "@/presentation/components/riskLevelPresentation";

export function SettingsScreen() {
  const [history, setHistory] = useState<readonly DriveHistoryEntry[] | null>(null);

  useEffect(() => {
    void driveHistoryRepository.listSessions().then(setHistory);
  }, []);

  const handleDelete = async (id: string) => {
    await driveHistoryRepository.deleteSession(id);
    setHistory(await driveHistoryRepository.listSessions());
  };

  const handleClearAll = async () => {
    await driveHistoryRepository.clearAll();
    setHistory([]);
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-on-surface">設定</h1>
        <Link href="/" className="text-sm text-accent-primary">
          ホームへ戻る
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-outline bg-surface-raised-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-on-surface-muted">ドライブ履歴</h2>
          {history && history.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-sm text-accent-urgent"
            >
              履歴をすべて削除
            </button>
          )}
        </div>

        {history === null && (
          <p className="text-sm text-on-surface-muted">読み込み中…</p>
        )}
        {history !== null && history.length === 0 && (
          <p className="text-sm text-on-surface-muted">まだドライブ履歴がありません。</p>
        )}

        <ul className="flex flex-col gap-2">
          {history?.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-outline p-3"
            >
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="text-on-surface-muted">{formatDateTimeJa(entry.recordedAt)}</span>
                <span className="tabular-nums text-on-surface">
                  走行 {formatDurationJa(entry.drivingDurationMs)} ／ 到着{" "}
                  {formatTimeJa(entry.actualArrival)}（予定 {formatTimeJa(entry.scheduledArrival)}）
                </span>
                <span className={getRiskPresentation(entry.maxRiskLevel).textClass}>
                  {entry.arrivalGuaranteeModeTriggered
                    ? "🔴 到着保証モード発動"
                    : `${getRiskPresentation(entry.maxRiskLevel).emoji} 最大リスク: ${getRiskPresentation(entry.maxRiskLevel).labelJa}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(entry.id)}
                className="shrink-0 text-sm text-on-surface-muted"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
