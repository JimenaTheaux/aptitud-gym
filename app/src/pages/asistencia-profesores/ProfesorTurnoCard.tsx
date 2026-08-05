import { useState } from 'react'
import { LogIn, LogOut } from 'react-feather'
import { formatearFecha, formatearHora } from '../../lib/formato'
import type { HorarioProfesorConNombre } from '../../lib/horariosProfesor'
import type { Modulo, Profesor } from '../../types/db'

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
  onRegistrarEntrada: (modulo: Modulo | null) => void
  onRegistrarSalida: () => void
}) {
  const [modulo, setModulo] = useState<Modulo | null>(null)
  const enTurno = Boolean(turnoAbierto)
  const disabled = saving || (!enTurno && !sucursalDisponible)

  function toggleModulo(valor: Modulo) {
    setModulo((actual) => (actual === valor ? null : valor))
  }

  function handleRegistrarEntrada() {
    onRegistrarEntrada(modulo)
    setModulo(null)
  }

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

      {!enTurno && (
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={saving}
            onClick={() => toggleModulo('2hs')}
            aria-pressed={modulo === '2hs'}
            className={`h-6 flex-1 rounded-md border font-inter text-[10px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60 ${
              modulo === '2hs'
                ? 'border-accent-cyan bg-accent-cyan/10 text-[#8FDBFF]'
                : 'border-border-subtle text-text-secondary'
            }`}
          >
            Mod 2hs
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => toggleModulo('3hs')}
            aria-pressed={modulo === '3hs'}
            className={`h-6 flex-1 rounded-md border font-inter text-[10px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60 ${
              modulo === '3hs'
                ? 'border-accent-cyan bg-accent-cyan/10 text-[#8FDBFF]'
                : 'border-border-subtle text-text-secondary'
            }`}
          >
            Mod 3hs
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={enTurno ? onRegistrarSalida : handleRegistrarEntrada}
        className="flex h-7 items-center justify-center gap-1 rounded-lg border border-accent-cyan font-montserrat text-[11px] font-bold text-accent-cyan outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60"
      >
        {enTurno ? <LogOut size={12} /> : <LogIn size={12} />}
        {saving ? 'Guardando…' : enTurno ? 'Registrar salida' : 'Registrar entrada'}
      </button>
    </div>
  )
}
