interface DeadlineInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function DeadlineInput({ value, onChange }: DeadlineInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-on-surface-muted" htmlFor="deadline-input">
        到着時刻
      </label>
      <input
        id="deadline-input"
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-outline bg-surface-raised-1 px-3 py-2 text-on-surface"
      />
    </div>
  );
}
