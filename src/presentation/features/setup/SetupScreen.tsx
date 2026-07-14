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
import { useSettingsStore } from "@/presentation/stores/settingsStore";
import { isDeadlineInPast, resolveDeadlineForToday } from "@/domain/services/deadlineResolver";
import type { DriveScenarioId } from "@/data/datasources/fake/scenarios";
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

function parseValidDeadline(deadlineValue: string): Date | null {
  const [hoursStr, minutesStr] = deadlineValue.split(":");
  const deadline = resolveDeadlineForToday(Number(hoursStr), Number(minutesStr), new Date());
  if (isDeadlineInPast(deadline, new Date())) return null;
  return deadline;
}

export function SetupScreen() {
  const router = useRouter();
  const safetyBufferMinutes = useSettingsStore((s) => s.safetyBufferMinutes);
  const setSafetyBufferMinutes = useSettingsStore((s) => s.setSafetyBufferMinutes);

  const [simulationMode, setSimulationMode] = useState(true);
  const [scenarioId, setScenarioId] = useState<DriveScenarioId>("normal");
  const [speed, setSpeed] = useState(5);

  const [destination, setDestination] = useState<SelectedDestination | null>(null);
  const [deadlineValue, setDeadlineValue] = useState(defaultDeadlineValue());
  const [error, setError] = useState<string | null>(null);

  const [scenicResult, setScenicResult] = useState<GenerateScenicRouteCandidatesResult | null>(
    null,
  );
  const [scenicLoading, setScenicLoading] = useState(false);
  const [scenicError, setScenicError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

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
    const deadline = parseValidDeadline(deadlineValue);
    if (!deadline) {
      setError("到着時刻は現在時刻より後にしてください。");
      return;
    }

    // 景観ルート提案(selectedCandidateId)はあくまで一度きりの提案であり、
    // 走行中のライブ安全計算(activeDriveStore)には一切組み込まない。
    startRealDrive(destination.point, deadline, safetyBufferMinutes);
    router.push("/");
  };

  const handleGenerateScenicRoutes = async () => {
    if (!destination) return;
    const deadline = parseValidDeadline(deadlineValue);
    if (!deadline) {
      setError("到着時刻は現在時刻より後にしてください。");
      return;
    }

    setError(null);
    setScenicError(null);
    setScenicLoading(true);
    setScenicResult(null);
    setSelectedCandidateId(null);
    try {
      const currentPosition = await getCurrentPositionOnce();
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
            <FavoriteDestinationPicker onSelect={setDestination} />
            <DestinationSearchField
              onSelect={setDestination}
              selectedDestinationName={destination?.name}
            />
            <SaveFavoriteButton destination={destination} />
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
                  <p className="text-xs text-on-surface-muted">
                    ※ 提案は参考です。この選択は出発時のルートに反映されません（安全計算は常に現在地基準で行われます）。
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
