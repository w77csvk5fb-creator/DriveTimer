"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DestinationSearchField, type SelectedDestination } from "./DestinationSearchField";
import { DeadlineInput } from "./DeadlineInput";
import { SafetyBufferSelect } from "./SafetyBufferSelect";
import { SimulationControls } from "./SimulationControls";
import { startSimulatedDrive } from "./startSimulatedDrive";
import { startRealDrive } from "./startRealDrive";
import { FavoriteDestinationPicker } from "./FavoriteDestinationPicker";
import { SaveFavoriteButton } from "./SaveFavoriteButton";
import { RouteCard } from "./RouteCard";
import { MapView } from "@/presentation/components/MapView";
import { useSettingsStore } from "@/presentation/stores/settingsStore";
import { resolveUpcomingDeadline } from "@/domain/services/deadlineResolver";
import type { DriveScenarioId } from "@/data/datasources/fake/scenarios";
import type { GeoPoint } from "@/domain/entities/geoPoint";
import { getCurrentPositionOnce } from "@/data/datasources/browser/getCurrentPositionOnce";
import { RemoteDirectionsRepository } from "@/data/datasources/remote/directionsClient";
import {
  generateScenicRouteCandidates,
  type GenerateScenicRouteCandidatesResult,
} from "@/domain/usecases/generateScenicRouteCandidates";

function defaultDeadlineValue(): string {
  const in90Minutes = new Date(Date.now() + 90 * 60_000);
  const hh = in90Minutes.getHours().toString().padStart(2, "0");
  const mm = in90Minutes.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseDeadline(deadlineValue: string): Date {
  const [hoursStr, minutesStr] = deadlineValue.split(":");
  return resolveUpcomingDeadline(Number(hoursStr), Number(minutesStr), new Date());
}

export function SetupScreen() {
  const router = useRouter();
  const safetyBufferMinutes = useSettingsStore((s) => s.safetyBufferMinutes);
  const setSafetyBufferMinutes = useSettingsStore((s) => s.setSafetyBufferMinutes);

  const [simulationMode, setSimulationMode] = useState(false);
  const [scenarioId, setScenarioId] = useState<DriveScenarioId>("normal");
  const [speed, setSpeed] = useState(1);

  const [destination, setDestination] = useState<SelectedDestination | null>(null);
  const [deadlineValue, setDeadlineValue] = useState(defaultDeadlineValue());
  const [error, setError] = useState<string | null>(null);
  const [favoritesRefreshKey, setFavoritesRefreshKey] = useState(0);

  const [scenicResult, setScenicResult] = useState<GenerateScenicRouteCandidatesResult | null>(
    null,
  );
  const [scenicLoading, setScenicLoading] = useState(false);
  const [scenicError, setScenicError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [scenicOrigin, setScenicOrigin] = useState<GeoPoint | null>(null);

  const handleStart = () => {
    setError(null);

    if (simulationMode) {
      startSimulatedDrive(scenarioId, speed, safetyBufferMinutes);
      router.push("/");
      return;
    }

    if (!destination) {
      setError("目的地を選択してください。");
      return;
    }
    const deadline = parseDeadline(deadlineValue);

    // 景観ルート提案(selectedCandidateId)の経由地は地図の表示にのみ使い、
    // 走行中のライブ安全計算(activeDriveStore)には一切組み込まない。
    const selectedWaypoint =
      scenicResult?.candidates.find((c) => c.id === selectedCandidateId)?.waypoint ?? null;
    startRealDrive(destination.point, deadline, safetyBufferMinutes, selectedWaypoint);
    router.push("/");
  };

  const handleGenerateScenicRoutes = async () => {
    if (!destination) return;
    const deadline = parseDeadline(deadlineValue);

    setError(null);
    setScenicError(null);
    setScenicLoading(true);
    setScenicResult(null);
    setSelectedCandidateId(null);
    try {
      const currentPosition = await getCurrentPositionOnce();
      setScenicOrigin(currentPosition);
      const result = await generateScenicRouteCandidates({
        directionsRepository: new RemoteDirectionsRepository(),
        origin: currentPosition,
        destination: destination.point,
        deadline,
        safetyBufferMinutes,
        now: new Date(),
      });
      setScenicResult(result);
      setSelectedCandidateId(result.candidates[0]?.id ?? null);
    } catch {
      setScenicError(
        "景観ルートを取得できませんでした。位置情報の許可やAPIキーの設定をご確認ください。",
      );
    } finally {
      setScenicLoading(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-on-surface">ドライブを計画する</h1>

      <div className="flex items-center justify-between rounded-2xl border border-outline bg-surface-raised-1 p-4">
        <span className="text-sm font-semibold text-on-surface">シミュレーションモード</span>
        <button
          type="button"
          onClick={() => setSimulationMode((v) => !v)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            simulationMode
              ? "bg-accent-primary text-on-surface"
              : "border border-outline text-on-surface-muted"
          }`}
        >
          {simulationMode ? "ON" : "OFF"}
        </button>
      </div>

      {simulationMode ? (
        <section className="rounded-2xl border border-outline bg-surface-raised-1 p-4">
          <SimulationControls
            scenarioId={scenarioId}
            onScenarioChange={setScenarioId}
            speed={speed}
            onSpeedChange={setSpeed}
          />
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-2xl border border-outline bg-surface-raised-1 p-4">
            <FavoriteDestinationPicker onSelect={setDestination} refreshKey={favoritesRefreshKey} />
            <DestinationSearchField
              onSelect={setDestination}
              selectedDestinationName={destination?.name}
            />
            <SaveFavoriteButton
              destination={destination}
              onSaved={() => setFavoritesRefreshKey((k) => k + 1)}
            />
            <DeadlineInput value={deadlineValue} onChange={setDeadlineValue} />
          </section>

          {destination && (
            <section className="flex flex-col gap-3 rounded-2xl border border-outline bg-surface-raised-1 p-4">
              <button
                type="button"
                onClick={() => void handleGenerateScenicRoutes()}
                disabled={scenicLoading}
                className="rounded-xl border border-outline px-4 py-2.5 text-sm font-semibold text-on-surface disabled:opacity-50"
              >
                {scenicLoading ? "検索中…" : "🌄 景色の良いルートを提案"}
              </button>

              {scenicError && <p className="text-sm text-accent-urgent">{scenicError}</p>}

              {scenicResult?.skippedReason === "insufficientFreeTime" && (
                <p className="text-sm text-on-surface-muted">
                  自由時間が少ないため、景観ルートの提案はスキップされました。
                </p>
              )}

              {scenicResult && scenicResult.candidates.length === 0 && !scenicResult.skippedReason && (
                <p className="text-sm text-on-surface-muted">
                  条件に合う景観ルートが見つかりませんでした。
                </p>
              )}

              {scenicResult && scenicResult.candidates.length > 0 && (
                <div className="flex flex-col gap-2">
                  {scenicResult.candidates.map((candidate) => (
                    <RouteCard
                      key={candidate.id}
                      candidate={candidate}
                      directDurationMs={scenicResult.directDurationMs}
                      selected={selectedCandidateId === candidate.id}
                      onSelect={() => setSelectedCandidateId(candidate.id)}
                    />
                  ))}

                  {selectedCandidateId && (
                    <div className="flex h-56">
                      <MapView
                        currentPosition={scenicOrigin}
                        destination={destination.point}
                        waypoint={
                          scenicResult.candidates.find((c) => c.id === selectedCandidateId)
                            ?.waypoint ?? null
                        }
                      />
                    </div>
                  )}

                  <p className="text-xs text-on-surface-muted">
                    ※
                    表示は参考のルートプレビューです（出発時のルートには反映されません。安全計算は常に現在地基準で行われます）。選択後、下の「出発」ボタンを押すとドライブを開始します。
                  </p>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <section className="rounded-2xl border border-outline bg-surface-raised-1 p-4">
        <SafetyBufferSelect value={safetyBufferMinutes} onChange={setSafetyBufferMinutes} />
      </section>

      {error && <p className="text-sm text-accent-urgent">{error}</p>}

      <button
        type="button"
        onClick={handleStart}
        className="rounded-xl bg-accent-primary px-4 py-2.5 font-semibold text-on-surface"
      >
        出発
      </button>
    </main>
  );
}
