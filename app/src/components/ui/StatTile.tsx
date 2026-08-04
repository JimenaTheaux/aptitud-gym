import type { ComponentType } from 'react'

export function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon?: ComponentType<{ size?: number }>
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border-subtle bg-bg-card p-4">
      <div className="flex items-center gap-1.5 font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary">
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <span className="font-montserrat text-[28px] font-extrabold leading-none text-text-primary">
        {value}
      </span>
    </div>
  )
}
