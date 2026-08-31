"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useActiveDriveStore } from "@/presentation/stores/activeDriveStore";
import { RiskBanner } from "@/presentation/components/RiskBanner";
import { MapView } from "@/presentation/components/MapView";
import { DriveSummaryCard } from "@/presentation/components/DriveSummaryCard";
import { AdviceList } from "@/presentation/components/AdviceList";
import { WakeLockWarningBanner } from "@/presentation/components/WakeLockWarningBanner";
import { LocationErrorBanner } from "@/presentation/components/LocationErrorBanner";
import { NotificationToast } from "@/presentation/components/NotificationToast";
import { TurnByTurnBanner } from "@/presentation/components/TurnByTurnBanner";
import { buildGoogleMapsDirectionsUrl } from "@/core/utils/googleMapsLink";
import { formatDurationJa } from "@/core/utils/durationFormatter";

export function HomeScreen() {
  const phase = useActiveDriveStore((s) => s.phase);
  const driveStatus = useActiveDriveStore((s) => s.driveStatus);
  const currentPosition = useActiveDriveStore((s) => s.currentPosition);
  const destination = useActiveDriveStore((s) => s.destination);
  const lastEta = useActiveDriveStore((s) => s.lastEta);
  const scenicWaypoint = useActiveDriveStore((s) => s.scenicWaypoint);
  const scenicWaypointVisited = useActiveDriveStore((s) => s.scenicWaypointVisited);
  const arrivalGuaranteeModeTriggered = useActiveDriveStore((s) => s.arrivalGuaranteeModeTriggered);
  const displayRoutePolyline = useActiveDriveStore((s) => s.displayRoutePolyline);
  const routeLineForceVisible = useActiveDriveStore((s) => s.routeLineForceVisible);
  const summary = useActiveDriveStore((s) => s.summary);
  const endDrive = useActiveDriveStore((s) => s.endDrive);
  const turnBackNow = useActiveDriveStore((s) => s.turnBackNow);
  const dismissSummary = useActiveDriveStore((s) => s.dismissSummary);
  const locationError = useActiveDriveStore((s) => s.locationError);
  const wakeLockActive = useActiveDriveStore((s) => s.wakeLockActive);
  const directionsError = useActiveDriveStore((s) => s.directionsError);
  const lastNotification = useActiveDriveStore((s) => s.lastNotification);
  const fastestRoute = useActiveDriveStore((s) => s.fastestRoute);
  const fastestRouteLoading = useActiveDriveStore((s) => s.fastestRouteLoading);

  const isRedTone = driveStatus?.kind === "arrivalGuaranteeFailure";
  const isTurnBackTiming =
    driveStatus?.kind === "arrivalGuaranteeFailure" ||
    (driveStatus?.kind === "onTrack" &&
      (driveStatus.risk === "warning" || driveStatus.risk === "critical"));
  // 「今すぐ折り返す」を押した後は、リスクレベルに関わらずルート線を表示し続ける。
  const shouldShowRouteLine = isTurnBackTiming || routeLineForceVisible;

  const mapsUrl =
    currentPosition && destination
      ? buildGoogleMapsDirectionsUrl(currentPosition, destination)
      : null;

  // 景観ルートの経由地に未到達の間は、地図の目的地ピン・ルート線を経由地基準で見せる。
  // 到達後、または一度でも到着保証モード(締切に間に合わない)に入った後は、景観ルートを
  // 続けている場合ではないため、渋滞解消等で回復しても本来の目的地基準のまま維持する。
  const awaitingScenicWaypoint =
    !!scenicWaypoint && !scenicWaypointVisited && !arrivalGuaranteeModeTriggered;
  const mapDestination = awaitingScenicWaypoint ? scenicWaypoint : destination;

  // 画面上部の状態オーバーレイが実際に占める高さ(画面上端からの距離)を計測し、MapViewへ
  // 渡す。走行中の追従カメラがこの分だけ地図中心をずらし、現在地が見た目の実質的な
  // 中央(オーバーレイの下の空き領域の中央)に来るようにするため。
  const topOverlayRef = useRef<HTMLDivElement | null>(null);
  const [topOverlayHeight, setTopOverlayHeight] = useState(0);
  useEffect(() => {
    const el = topOverlayRef.current;
    if (!el) return;
    const updateHeight = () => setTopOverlayHeight(el.getBoundingClientRect().bottom);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (phase === "ended" && summary) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4">
        <DriveSummaryCard summary={summary} />
        <AdviceList adviceJa={summary.adviceJa} />
        <button
          type="button"
          onClick={dismissSummary}
          className="btn-primary-gradient h-14 rounded-2xl text-base font-bold text-on-surface"
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
            <h1 className="text-2xl font-bold text-on-surface">DriveTimer</h1>
            <p className="mt-1 text-on-surface-muted">
              空き時間を安心してドライブに使えるアプリ
            </p>
          </div>
          <Link
            href="/setup"
            className="btn-primary-gradient rounded-2xl px-8 py-4 text-base font-bold text-on-surface"
          >
            ドライブを計画する
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col">
      <MapView
        currentPosition={currentPosition}
        destination={mapDestination}
        routePolyline={
          awaitingScenicWaypoint
            ? (displayRoutePolyline ?? undefined)
            : // 景観ルートを選んで走行中の間(経由地に到達済みでも「今すぐ折り返す」で
              // scenicWaypointが破棄されるまで)は、リスクレベルに関わらず常に目的地までの
              // ルート線を表示する。景観ルート由来でなければ従来通りwarning以上でのみ表示する。
              scenicWaypoint || shouldShowRouteLine
              ? lastEta?.overviewPolyline
              : undefined
        }
        criticalMode={isRedTone}
        fullBleed
        centerOffsetTopPx={topOverlayHeight}
      />

      {/* 地図上部: 状態バナー類を半透明オーバーレイとして重ねる。左上のテーマ切替ピルと
          被らないよう、その高さ分だけ空けて開始する。 */}
      <div
        ref={topOverlayRef}
        className="pointer-events-none absolute inset-x-3 top-16 z-10 flex flex-col gap-2"
      >
        {!wakeLockActive && <WakeLockWarningBanner />}
        {locationError && <LocationErrorBanner error={locationError} />}
        {directionsError && (
          <p className="rounded-xl bg-surface-raised-1/90 px-3 py-2 text-center text-xs text-on-surface-muted shadow-lg">
            渋滞情報の取得に失敗しました。前回の情報を表示しています。
          </p>
        )}

        {driveStatus?.kind === "onTrack" && <RiskBanner status={driveStatus} />}
        {driveStatus?.kind === "arrivalGuaranteeFailure" && (
          <p className="rounded-xl bg-accent-urgent/90 px-3 py-2 text-center text-sm font-bold text-on-accent shadow-lg">
            🔴 締切に約{formatDurationJa(driveStatus.delayMs)}遅れる見込みです
          </p>
        )}
        {!driveStatus && !locationError && (
          <p className="rounded-xl bg-surface-raised-1/90 px-3 py-2 text-center text-sm text-on-surface-muted shadow-lg">
            現在地を取得しています…
          </p>
        )}

        {lastNotification && <NotificationToast event={lastNotification} />}
        {lastEta && lastEta.steps.length > 0 && <TurnByTurnBanner step={lastEta.steps[0]} />}
      </div>

      {/* 地図下部: 小さめの操作ボタンを重ねる。右下の現在地に戻るボタンと被らないよう
          少し上に余白を持たせている。 */}
      <div className="pointer-events-none absolute inset-x-3 bottom-4 z-10 flex flex-col items-center gap-2">
        {fastestRoute && (
          <p className="pointer-events-auto rounded-full bg-surface-raised-1/90 px-3 py-1.5 text-center text-xs text-on-surface-muted shadow-lg">
            最短ルートで約{formatDurationJa(fastestRoute.durationMs)}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-accent-primary underline"
              >
                Google Mapsで開く
              </a>
            )}
          </p>
        )}
        <div className="pointer-events-auto flex gap-3">
          <button
            type="button"
            onClick={turnBackNow}
            disabled={fastestRouteLoading}
            className="btn-primary-gradient rounded-full px-5 py-3 text-sm font-bold text-on-surface shadow-lg disabled:opacity-60"
          >
            🔄 {fastestRouteLoading ? "検索中…" : "今すぐ折り返す"}
          </button>
          <button
            type="button"
            onClick={endDrive}
            className="btn-danger-gradient rounded-full px-5 py-3 text-sm font-bold text-on-accent shadow-lg"
          >
            ⏹ ドライブ終了
          </button>
        </div>
      </div>
    </main>
  );
}
