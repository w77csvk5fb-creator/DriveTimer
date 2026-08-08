"use client";

import { useEffect } from "react";
import { GeolocationDataSource } from "@/data/datasources/browser/geolocationDataSource";
import { RemoteDirectionsRepository } from "@/data/datasources/remote/directionsClient";
import { useActiveDriveStore, loadPersistedDrive } from "@/presentation/stores/activeDriveStore";
import { driveHistoryRepository } from "@/data/repositories/driveHistoryRepositoryInstance";

/**
 * ページの予期しない再読み込み(バックグラウンド化によるWebViewの再生成、Service Worker更新時の
 * チャンク読み込み失敗等)が起きても、直前まで進行中だった実走行(シミュレーションは対象外)を
 * 自動的に再開する。アプリ起動時に一度だけ実行する。表示は持たない。
 */
export function ActiveDriveResumeBootstrap() {
  useEffect(() => {
    const persisted = loadPersistedDrive();
    if (!persisted) return;
    // 通常のアプリ内遷移では発生しないはずだが、念のため既にアクティブな場合は何もしない
    if (useActiveDriveStore.getState().phase !== "idle") return;

    useActiveDriveStore.getState().startDrive({
      destination: persisted.destination,
      deadline: new Date(persisted.deadline),
      safetyBufferMinutes: persisted.safetyBufferMinutes,
      scenicWaypoint: persisted.scenicWaypoint,
      notificationLeadTimesMinutes: persisted.notificationLeadTimesMinutes,
      locationRepository: new GeolocationDataSource(),
      directionsRepository: new RemoteDirectionsRepository(),
      historyRepository: driveHistoryRepository,
      now: () => new Date(),
      persistable: true,
      resumeSessionStartedAt: new Date(persisted.sessionStartedAt),
    });
  }, []);

  return null;
}
