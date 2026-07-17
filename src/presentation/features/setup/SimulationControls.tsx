import { DRIVE_SCENARIO_LIST, type DriveScenarioId } from "@/data/datasources/fake/scenarios";
import { SIMULATION_SPEED_MULTIPLIERS } from "@/core/constants/appConstants";

interface SimulationControlsProps {
  readonly scenarioId: DriveScenarioId;
  readonly onScenarioChange: (id: DriveScenarioId) => void;
  readonly speed: number;
  readonly onSpeedChange: (speed: number) => void;
}

export function SimulationControls({
  scenarioId,
  onScenarioChange,
  speed,
  onSpeedChange,
}: SimulationControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {DRIVE_SCENARIO_LIST.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onScenarioChange(scenario.id)}
            title={scenario.descriptionJa}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              scenarioId === scenario.id
                ? "pill-selected border-accent-primary text-on-surface"
                : "border-outline text-on-surface-muted"
            }`}
          >
            {scenario.labelJa}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-muted">
        <span>速度</span>
        {SIMULATION_SPEED_MULTIPLIERS.map((mult) => (
          <button
            key={mult}
            type="button"
            onClick={() => onSpeedChange(mult)}
            className={`rounded-full border px-2.5 py-1 ${
              speed === mult
                ? "pill-selected border-accent-primary text-on-surface"
                : "border-outline"
            }`}
          >
            ×{mult}
          </button>
        ))}
      </div>
    </div>
  );
}
