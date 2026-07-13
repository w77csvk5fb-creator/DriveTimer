interface AdviceListProps {
  readonly adviceJa: readonly string[];
}

export function AdviceList({ adviceJa }: AdviceListProps) {
  if (adviceJa.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-outline bg-surface-raised-1 p-4">
      <p className="text-sm font-semibold text-on-surface-muted">次回への提案</p>
      <ul className="flex flex-col gap-1 text-sm text-on-surface">
        {adviceJa.map((text) => (
          <li key={text}>・{text}</li>
        ))}
      </ul>
    </section>
  );
}
