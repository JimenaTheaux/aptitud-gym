import { LogIn, LogOut } from 'react-feather'
import { formatearFecha, formatearHora } from '../../lib/formato'
import type { HorarioProfesorConNombre } from '../../lib/horariosProfesor'
import type { Profesor } from '../../types/db'

export function ProfesorTurnoCard({
  profesor,
  turnoAbierto,
  saving,
  sucursalDisponible,
  onRegistrarEntrada,
  onRegistrarSalida,
}: {
  profesor: Profesor
  turnoAbierto: HorarioProfesorConNombre | null
  saving: boolean
  // Registrar entrada necesita una sucursal concreta en contexto (Fase 1 la
  // auto-selecciona sola); registrar salida no la necesita, solo actualiza
  // la fila ya abierta.
  sucursalDisponible: boolean
  onRegistrarEntrada: () => void
  onRegistrarSalida: () => void
}) {
  const enTurno = Boolean(turnoAbierto)
  const disabled = saving || (!enTurno && !sucursalDisponible)

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-montserrat text-[13px] font-bold text-text-primary">{profesor.nombre}</p>
        {enTurno ? (
          <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-estado-al-dia-bar px-2 py-0.5 font-inter text-[10px] font-semibold text-text-on-accent">
            <span className="text-[7px] leading-none">●</span>
            En turno
          </span>
        ) : (
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-border-subtle px-2 py-0.5 font-inter text-[10px] font-semibold text-text-secondary">
            Sin turno abierto
          </span>
        )}
      </div>

      {turnoAbierto?.hora_entrada && (
        <p className="font-inter text-[11px] text-text-secondary">
          Entrada: {formatearHora(turnoAbierto.hora_entrada)} ({formatearFecha(turnoAbierto.fecha)})
        </p>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={enTurno ? onRegistrarSalida : onRegistrarEntrada}
        className="flex h-7 items-center justify-center gap-1 rounded-lg border border-accent-cyan font-montserrat text-[11px] font-bold text-accent-cyan outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60"
      >
        {enTurno ? <LogOut size={12} /> : <LogIn size={12} />}
        {saving ? 'Guardando…' : enTurno ? 'Registrar salida' : 'Registrar entrada'}
      </button>
    </div>
  )
}
