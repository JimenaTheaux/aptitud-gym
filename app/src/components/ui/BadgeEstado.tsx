export type Estado = 'al_dia' | 'pendiente' | 'deuda' | 'error'

// Tag sólido: fondo = color lleno del estado (mismo que la barra de la card),
// texto oscuro para contraste — no el wash al 15% que se probó antes.
const ESTADO_CONFIG: Record<Estado, { bg: string; text: string; label: string }> = {
  al_dia: { bg: 'bg-estado-al-dia-bar', text: 'text-text-on-accent', label: 'Al día' },
  pendiente: { bg: 'bg-estado-pendiente-bar', text: 'text-text-on-accent', label: 'Pendiente' },
  deuda: { bg: 'bg-estado-deuda-bar', text: 'text-text-on-accent', label: 'Deuda' },
  error: { bg: '', text: 'text-estado-error-text', label: 'Error' },
}

// Color de la barra superior (4px) de cualquier card que muestre un estado de
// cuenta — siempre el color real del estado, nunca accent-cyan fijo (doc 08).
// "error" no tiene barra: no es un estado de cuenta, es una falla de carga.
export const ESTADO_BAR_CLASS: Record<'al_dia' | 'pendiente' | 'deuda', string> = {
  al_dia: 'border-t-estado-al-dia-bar',
  pendiente: 'border-t-estado-pendiente-bar',
  deuda: 'border-t-estado-deuda-bar',
}

export function BadgeEstado({
  estado,
  label,
}: {
  estado: Estado
  label?: string
}) {
  const config = ESTADO_CONFIG[estado]

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 font-inter text-[11px] font-semibold ${config.bg} ${config.text}`}
    >
      <span className="text-[8px] leading-none">●</span>
      {label ?? config.label}
    </span>
  )
}
