import { useEffect, useState } from 'react'
import { ChevronLeft } from 'react-feather'
import { listDisciplinas } from '../../lib/disciplinas'
import { listHorariosByDisciplina } from '../../lib/horariosDisciplina'
import { marcarAsistencia, horaActual } from '../../lib/asistencias'
import { formatearHora } from '../../lib/formato'
import type { Asistencia, Disciplina, HorarioDisciplina } from '../../types/db'

type ConfirmandoLibre = { disciplina: Disciplina; hora: string }
type ConfirmandoHorario = { disciplina: Disciplina; horario: HorarioDisciplina }

export function MarcarAsistenciaStep({
  alumnoId,
  sucursalId,
  onDone,
}: {
  alumnoId: string
  sucursalId: string
  onDone: (asistencia: Asistencia) => void
}) {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionada, setSeleccionada] = useState<Disciplina | null>(null)
  const [horarios, setHorarios] = useState<HorarioDisciplina[]>([])
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  // Horario libre (ej. musculación): no hay franjas para elegir, así que antes
  // de registrar se congela la hora actual y se le pide confirmación al alumno
  // — la hora que ve acá es exactamente la que se guarda al confirmar.
  const [confirmandoLibre, setConfirmandoLibre] = useState<ConfirmandoLibre | null>(null)
  // Con horario elegido tampoco se guarda al toque: se pide confirmación
  // explícita para evitar registros por un tap accidental.
  const [confirmandoHorario, setConfirmandoHorario] = useState<ConfirmandoHorario | null>(null)
  const [marcando, setMarcando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listDisciplinas().then((data) => {
      if (!active) return
      setDisciplinas(data.filter((d) => d.activa && d.sucursal_id === sucursalId))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [sucursalId])

  async function handleElegirDisciplina(disciplina: Disciplina) {
    setError(null)

    if (disciplina.horario_libre) {
      setConfirmandoLibre({ disciplina, hora: horaActual() })
      return
    }

    setSeleccionada(disciplina)
    setLoadingHorarios(true)
    const data = await listHorariosByDisciplina(disciplina.id)
    setHorarios(data)
    setLoadingHorarios(false)
  }

  function handleElegirHorario(horario: HorarioDisciplina) {
    if (!seleccionada) return
    setError(null)
    setConfirmandoHorario({ disciplina: seleccionada, horario })
  }

  async function handleConfirmarHorario() {
    if (!confirmandoHorario) return
    setError(null)
    setMarcando(true)
    try {
      const asistencia = await marcarAsistencia({
        alumnoId,
        disciplina: confirmandoHorario.disciplina,
        sucursalId,
        profesorId: null,
        hora: confirmandoHorario.horario.hora_inicio,
      })
      onDone(asistencia)
    } catch {
      setError('No se pudo registrar la asistencia. Probá de nuevo.')
      setMarcando(false)
    }
  }

  function handleCancelarHorario() {
    setConfirmandoHorario(null)
    setError(null)
  }

  async function handleConfirmarLibre() {
    if (!confirmandoLibre) return
    setError(null)
    setMarcando(true)
    try {
      const asistencia = await marcarAsistencia({
        alumnoId,
        disciplina: confirmandoLibre.disciplina,
        sucursalId,
        profesorId: null,
        hora: confirmandoLibre.hora,
      })
      onDone(asistencia)
    } catch {
      setError('No se pudo registrar la asistencia. Probá de nuevo.')
      setMarcando(false)
    }
  }

  function handleCancelarLibre() {
    setConfirmandoLibre(null)
    setError(null)
  }

  if (loading) {
    return <p className="font-inter text-[13px] text-text-secondary">Cargando disciplinas…</p>
  }

  if (disciplinas.length === 0) {
    return (
      <p className="font-inter text-[13px] text-text-secondary">
        Todavía no hay disciplinas configuradas en esta sucursal.
      </p>
    )
  }

  if (confirmandoLibre) {
    return (
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={handleCancelarLibre}
          disabled={marcando}
          className="flex items-center gap-1 self-start font-inter text-[11px] text-text-secondary hover:text-text-primary disabled:opacity-60"
        >
          <ChevronLeft size={14} />
          Elegir otra disciplina
        </button>

        <div className="flex flex-col items-center gap-1 rounded-[10px] border border-border-subtle bg-bg-input p-4 text-center">
          <p className="font-inter text-[12px] text-text-secondary">
            Vas a registrar tu ingreso a {confirmandoLibre.disciplina.nombre} a las
          </p>
          <p className="font-montserrat text-2xl font-extrabold text-text-primary">
            {formatearHora(confirmandoLibre.hora)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleConfirmarLibre}
          disabled={marcando}
          className="h-12 rounded-[10px] bg-accent-cyan font-montserrat text-[14px] font-bold text-text-on-accent disabled:opacity-60"
        >
          {marcando ? 'Registrando…' : 'Confirmar ingreso'}
        </button>

        {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
      </div>
    )
  }

  if (confirmandoHorario) {
    return (
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={handleCancelarHorario}
          disabled={marcando}
          className="flex items-center gap-1 self-start font-inter text-[11px] text-text-secondary hover:text-text-primary disabled:opacity-60"
        >
          <ChevronLeft size={14} />
          Elegir otro horario
        </button>

        <div className="flex flex-col items-center gap-1 rounded-[10px] border border-border-subtle bg-bg-input p-4 text-center">
          <p className="font-inter text-[12px] text-text-secondary">
            Vas a registrar tu ingreso a {confirmandoHorario.disciplina.nombre} a las
          </p>
          <p className="font-montserrat text-2xl font-extrabold text-text-primary">
            {formatearHora(confirmandoHorario.horario.hora_inicio)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleConfirmarHorario}
          disabled={marcando}
          className="h-12 rounded-[10px] bg-accent-cyan font-montserrat text-[14px] font-bold text-text-on-accent disabled:opacity-60"
        >
          {marcando ? 'Registrando…' : 'Confirmar registro'}
        </button>

        {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="font-montserrat text-[13px] font-bold text-text-primary">
        {seleccionada ? `¿A qué horario venís? (${seleccionada.nombre})` : '¿A qué disciplina venís?'}
      </p>

      {!seleccionada && (
        <div className="flex flex-wrap gap-2">
          {disciplinas.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => handleElegirDisciplina(d)}
              disabled={marcando}
              className="rounded-[10px] border border-border-subtle bg-bg-input px-4 py-3 font-montserrat text-[13px] font-bold text-text-primary hover:border-accent-cyan disabled:opacity-60"
            >
              {d.nombre}
            </button>
          ))}
        </div>
      )}

      {seleccionada && (
        <>
          <button
            type="button"
            onClick={() => {
              setSeleccionada(null)
              setHorarios([])
              setError(null)
            }}
            className="flex items-center gap-1 self-start font-inter text-[11px] text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft size={14} />
            Elegir otra disciplina
          </button>

          {loadingHorarios ? (
            <p className="font-inter text-[13px] text-text-secondary">Cargando horarios…</p>
          ) : horarios.length === 0 ? (
            <p className="font-inter text-[13px] text-text-secondary">
              Esta disciplina todavía no tiene horarios cargados.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {horarios.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleElegirHorario(h)}
                  disabled={marcando}
                  className="rounded-[10px] border border-border-subtle bg-bg-input px-4 py-3 font-montserrat text-[13px] font-bold text-text-primary hover:border-accent-cyan disabled:opacity-60"
                >
                  {formatearHora(h.hora_inicio)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
    </div>
  )
}
