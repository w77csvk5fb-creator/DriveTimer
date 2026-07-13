import { SAFETY_BUFFER_OPTIONS_MINUTES } from "@/core/constants/appConstants";

interface SafetyBufferSelectProps {
  readonly value: number;
  readonly onChange: (minutes: number) => void;
}

export function SafetyBufferSelect({ value, onChange }: SafetyBufferSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-on-surface-muted">安全バッファ</span>
      <div className="flex flex-wrap gap-2">
        {SAFETY_BUFFER_OPTIONS_MINUTES.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => onChange(minutes)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              value === minutes
                ? "border-accent-primary bg-accent-primary/20 text-on-surface"
                : "border-outline text-on-surface-muted"
            }`}
          >
            {minutes}分
          </button>
        ))}
      </div>
    </div>
  );
}
