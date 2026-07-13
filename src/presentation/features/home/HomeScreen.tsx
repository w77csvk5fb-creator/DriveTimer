"use client";

import Link from "next/link";
import { useActiveDriveStore } from "@/presentation/stores/activeDriveStore";
import { RiskBanner } from "@/presentation/components/RiskBanner";
import { ArrivalGuaranteeBanner } from "@/presentation/components/ArrivalGuaranteeBanner";
import { MapView } from "@/presentation/components/MapView";
import { DriveSummaryCard } from "@/presentation/components/DriveSummaryCard";
import { AdviceList } from "@/presentation/components/AdviceList";
import { WakeLockWarningBanner } from "@/presentation/components/WakeLockWarningBanner";
import { LocationErrorBanner } from "@/presentation/components/LocationErrorBanner";
import { NotificationToast } from "@/presentation/components/NotificationToast";
import { FastestRouteButton } from "@/presentation/components/FastestRouteButton";

export function HomeScreen() {
  const phase = useActiveDriveStore((s) => s.phase);
  const driveStatus = useActiveDriveStore((s) => s.driveStatus);
  const currentPosition = useActiveDriveStore((s) => s.currentPosition);
  const destination = useActiveDriveStore((s) => s.destination);
  const summary = useActiveDriveStore((s) => s.summary);
  const endDrive = useActiveDriveStore((s) => s.endDrive);
  const dismissSummary = useActiveDriveStore((s) => s.dismissSummary);
  const locationError = useActiveDriveStore((s) => s.locationError);
  const wakeLockActive = useActiveDriveStore((s) => s.wakeLockActive);
  const directionsError = useActiveDriveStore((s) => s.directionsError);
  const lastNotification = useActiveDriveStore((s) => s.lastNotification);

  const isRedTone = driveStatus?.kind === "arrivalGuaranteeFailure";

  if (phase === "ended" && summary) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4">
        <DriveSummaryCard summary={summary} />
        <AdviceList adviceJa={summary.adviceJa} />
        <button
          type="button"
          onClick={dismissSummary}
          className="rounded-xl bg-accent-primary px-4 py-2.5 font-semibold text-on-surface"
        >
          閉じる
        </button>
      </main>
    );
  }

  if (phase === "idle") {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex justify-end">
          <Link href="/settings" className="text-sm text-accent-primary">
            設定
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">DriveTime</h1>
            <p className="mt-1 text-on-surface-muted">
              空き時間を安心してドライブに使えるアプリ
            </p>
          </div>
          <Link
            href="/setup"
            className="rounded-xl bg-accent-primary px-6 py-3 font-semibold text-on-surface"
          >
            ドライブを計画する
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`flex flex-1 flex-col gap-4 p-4 transition-colors ${
        isRedTone ? "bg-accent-urgent/15" : ""
      }`}
    >
      {!wakeLockActive && <WakeLockWarningBanner />}
      {locationError && <LocationErrorBanner error={locationError} />}
      {directionsError && (
        <p className="text-center text-xs text-on-surface-muted">
          渋滞情報の取得に失敗しました。前回の情報を表示しています。
        </p>
      )}

      {driveStatus?.kind === "onTrack" && <RiskBanner status={driveStatus} />}
      {driveStatus?.kind === "arrivalGuaranteeFailure" && (
        <>
          <ArrivalGuaranteeBanner status={driveStatus} />
          <FastestRouteButton />
        </>
      )}
      {!driveStatus && !locationError && (
        <p className="text-center text-sm text-on-surface-muted">現在地を取得しています…</p>
      )}

      {lastNotification && <NotificationToast event={lastNotification} />}

      <MapView currentPosition={currentPosition} destination={destination} />

      <button
        type="button"
        onClick={endDrive}
        className="rounded-xl border border-outline px-4 py-2.5 font-semibold text-on-surface"
      >
        ドライブ終了
      </button>
    </main>
  );
}
