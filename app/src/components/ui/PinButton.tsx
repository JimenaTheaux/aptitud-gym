import { PinIcon } from '../icons/PinIcon'

// Primer ícono del cluster de acciones, antes de WhatsApp/editar/eliminar
// (doc 08, sección "Fijar filas"): outline text-secondary sin fijar, sólido
// accent-cyan fijado. Deshabilitado al llegar al límite, con tooltip — el
// mensaje inline visible va aparte, cerca de la tabla (ver `limiteAlcanzado`
// de usePinnedRows en cada pantalla).
export function PinButton({
  fijado,
  disabled,
  onClick,
  label,
}: {
  fijado: boolean
  disabled?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={fijado}
      title={disabled && !fijado ? 'Máximo 5 filas fijadas' : undefined}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:cursor-not-allowed disabled:opacity-40 ${
        fijado ? 'text-accent-cyan' : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      <PinIcon size={14} filled={fijado} />
    </button>
  )
}
