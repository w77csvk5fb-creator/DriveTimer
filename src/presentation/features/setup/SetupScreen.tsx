"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DestinationSearchField, type SelectedDestination } from "./DestinationSearchField";
import { DeadlineInput } from "./DeadlineInput";
import { SafetyBufferSelect } from "./SafetyBufferSelect";
import { SimulationControls } from "./SimulationControls";
import { startSimulatedDrive } from "./startSimulatedDrive";
import { useSettingsStore } from "@/presentation/stores/settingsStore";
import { isDeadlineInPast, resolveDeadlineForToday } from "@/domain/services/deadlineResolver";
import type { DriveScenarioId } from "@/data/datasources/fake/scenarios";

function defaultDeadlineValue(): string {
  const in90Minutes = new Date(Date.now() + 90 * 60_000);
  const hh = in90Minutes.getHours().toString().padStart(2, "0");
  const mm = in90Minutes.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
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
    const [hoursStr, minutesStr] = deadlineValue.split(":");
    const deadline = resolveDeadlineForToday(Number(hoursStr), Number(minutesStr), new Date());
    if (isDeadlineInPast(deadline, new Date())) {
      setError("到着時刻は現在時刻より後にしてください。");
      return;
    }

    // 実GPS/実Directionsを使ったドライブ開始はPhase 7/8で有効化する
    setError("実際のドライブ機能は準備中です。シミュレーションモードをお試しください。");
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
        <section className="flex flex-col gap-4 rounded-2xl border border-outline bg-surface-raised-1 p-4">
          <DestinationSearchField onSelect={setDestination} />
          <DeadlineInput value={deadlineValue} onChange={setDeadlineValue} />
        </section>
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
