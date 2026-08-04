import { useSucursal } from '../../contexts/SucursalContext'

function chipClass(active: boolean, disabled: boolean) {
  return `rounded-full border px-4 py-1.5 font-montserrat text-[12px] font-bold outline-none transition-colors ${
    disabled ? 'cursor-not-allowed' : 'focus-visible:ring-2 focus-visible:ring-accent-cyan'
  } ${
    active
      ? 'border-accent-cyan bg-bg-input text-[#8FDBFF]'
      : disabled
        ? 'border-border-subtle text-text-muted opacity-60'
        : 'border-border-subtle text-text-secondary hover:text-text-primary'
  }`
}

export function SucursalFilter({ disabled = false }: { disabled?: boolean }) {
  const { sucursales, sucursalId, setSucursalId } = useSucursal()

  return (
    <div role="group" aria-label="Filtro de sucursal" className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setSucursalId(null)}
        disabled={disabled}
        aria-pressed={sucursalId === null}
        className={chipClass(sucursalId === null, disabled)}
      >
        Todas
      </button>
      {sucursales.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => setSucursalId(s.id)}
          disabled={disabled}
          aria-pressed={sucursalId === s.id}
          className={chipClass(sucursalId === s.id, disabled)}
        >
          {s.nombre}
        </button>
      ))}
    </div>
  )
}
