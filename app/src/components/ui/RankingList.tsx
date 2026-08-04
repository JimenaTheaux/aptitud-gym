export type RankingItem = {
  key: string
  label: string
  sublabel?: string
  value: number
  valueLabel: string
}

// Lista ranqueada con barra proporcional (magnitud, un solo hue) — usada por
// los resúmenes de ocupación/asistencias/horas (doc 04, Fase 6).
export function RankingList({
  items,
  emptyMessage = 'Sin datos para este período.',
  maxItems = 8,
}: {
  items: RankingItem[]
  emptyMessage?: string
  maxItems?: number
}) {
  const visibles = items.slice(0, maxItems)
  const max = visibles.reduce((m, i) => Math.max(m, i.value), 0)

  if (visibles.length === 0) {
    return (
      <p className="rounded-2xl border border-border-subtle bg-bg-card p-4 text-center font-inter text-[13px] text-text-secondary">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-card p-4">
      {visibles.map((item) => (
        <div key={item.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-inter text-[13px] text-text-primary">
              {item.label}
              {item.sublabel && (
                <span className="ml-1.5 font-inter text-[11px] text-text-secondary">{item.sublabel}</span>
              )}
            </span>
            <span className="shrink-0 font-inter text-[13px] font-semibold text-text-primary">
              {item.valueLabel}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-input">
            <div
              className="h-full rounded-full bg-accent-cyan"
              style={{ width: max > 0 ? `${(item.value / max) * 100}%` : '0%' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
