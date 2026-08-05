import { Fragment, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { DateField } from '../../components/ui/DateField'
import { SelectField } from '../../components/ui/SelectField'
import { useAuth } from '../../contexts/AuthContext'
import { listDisciplinas } from '../../lib/disciplinas'
import { construirGrillaOcupacion, listAsistenciasParaOcupacion, type OcupacionGrid } from '../../lib/ocupacion'
import { hoyISO, periodoActual, rangoDelMes, rangoDeEstaSemana, rangoUltimosDias } from '../../lib/formato'
import { nivelDeOcupacion, OCUPACION_CONFIG, type NivelOcupacion } from '../../config/ocupacion'
import type { Disciplina } from '../../types/db'
import { ResumenesSubnav } from './ResumenesSubnav'

const NIVELES: NivelOcupacion[] = ['libre', 'cupos', 'llena']

function LeyendaOcupacion() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border-subtle bg-bg-card p-3">
      {NIVELES.map((nivel) => {
        const config = OCUPACION_CONFIG[nivel]
        return (
          <span key={nivel} className="flex items-center gap-2 font-inter text-[12px] text-text-secondary">
            <span className={`inline-block h-3 w-3 rounded-[4px] ${config.bg}`} aria-hidden="true" />
            {config.label}
          </span>
        )
      })}
    </div>
  )
}

function GrillaOcupacion({ grid }: { grid: OcupacionGrid }) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[560px] gap-1.5"
        style={{ gridTemplateColumns: `72px repeat(${grid.columnas.length}, 1fr)` }}
      >
        <div />
        {grid.columnas.map((c) => (
          <div
            key={c.key}
            className="pb-1 text-center font-inter text-[11px] font-semibold text-text-secondary"
          >
            {c.label}
          </div>
        ))}

        {grid.filas.map((fila) => (
          <Fragment key={fila.franja.label}>
            <div className="flex items-center justify-end pr-2 font-inter text-[11px] font-semibold text-text-secondary">
              {fila.franja.label}
            </div>
            {grid.columnas.map((c) => {
              const cantidad = fila.celdas[c.key] ?? 0
              const config = OCUPACION_CONFIG[nivelDeOcupacion(cantidad)]
              return (
                <div
                  key={`${fila.franja.label}-${c.key}`}
                  className={`flex h-10 items-center justify-center rounded-[8px] font-montserrat text-[13px] font-bold ${config.bg} ${config.text}`}
                >
                  {cantidad}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export function ResumenTurnos() {
  const { rol } = useAuth()
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [disciplinaId, setDisciplinaId] = useState('')
  const [desde, setDesde] = useState(() => rangoDeEstaSemana().inicio)
  const [hasta, setHasta] = useState(() => rangoDeEstaSemana().fin)
  const [grid, setGrid] = useState<OcupacionGrid | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    listDisciplinas().then((data) => {
      if (!active) return
      const horarioLibre = data.filter((d) => d.activa && d.horario_libre)
      setDisciplinas(horarioLibre)
      setDisciplinaId((actual) => actual || horarioLibre[0]?.id || '')
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!disciplinaId || !desde || !hasta) {
      setGrid(null)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    listAsistenciasParaOcupacion(desde, hasta, disciplinaId).then((asistencias) => {
      if (!active) return
      setGrid(construirGrillaOcupacion(asistencias, desde, hasta))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [disciplinaId, desde, hasta])

  const atajos = useMemo(
    () => [
      { label: '3 días', ...rangoUltimosDias(3) },
      { label: 'Esta semana', ...rangoDeEstaSemana() },
      { label: 'Este mes', ...rangoDelMes(periodoActual()) },
      { label: 'Quincena', ...rangoUltimosDias(15) },
    ],
    [],
  )

  if (rol !== 'admin') return <Navigate to="/resumenes" replace />

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <ResumenesSubnav />

        <div>
          <h1 className="font-montserrat text-xl font-extrabold text-text-primary">Turnos</h1>
          <p className="mt-1 font-inter text-[13px] text-text-secondary">
            Mapa de calor de ocupación de la sala, según asistencias reales.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
            <div className="flex-1">
              <DateField label="Desde" value={desde} onChange={setDesde} max={hasta || undefined} />
            </div>
            <div className="flex-1">
              <DateField label="Hasta" value={hasta} onChange={setHasta} min={desde || undefined} max={hoyISO()} />
            </div>
            {disciplinas.length > 1 && (
              <div className="flex-1">
                <SelectField
                  label="Disciplina"
                  value={disciplinaId}
                  onChange={(e) => setDisciplinaId(e.target.value)}
                >
                  {disciplinas.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </SelectField>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {atajos.map((atajo) => {
              const activo = desde === atajo.inicio && hasta === atajo.fin
              return (
                <button
                  key={atajo.label}
                  type="button"
                  onClick={() => {
                    setDesde(atajo.inicio)
                    setHasta(atajo.fin)
                  }}
                  className={`h-8 shrink-0 rounded-full border px-3 font-inter text-[12px] font-semibold transition-colors ${
                    activo
                      ? 'border-accent-cyan bg-[rgba(46,185,254,0.12)] text-white'
                      : 'border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {atajo.label}
                </button>
              )
            })}
          </div>
        </div>

        {disciplinas.length === 0 ? (
          <p className="rounded-2xl border border-border-subtle bg-bg-card p-6 text-center font-inter text-[13px] text-text-secondary">
            No hay ninguna disciplina de horario libre configurada (Configuración → Disciplinas).
          </p>
        ) : (
          <>
            <LeyendaOcupacion />

            {loading ? (
              <p className="rounded-2xl border border-border-subtle bg-bg-card p-6 text-center font-inter text-[13px] text-text-secondary">
                Cargando…
              </p>
            ) : grid ? (
              <div className="rounded-2xl border border-border-subtle bg-bg-card p-4">
                <p className="mb-3 font-inter text-[11px] text-text-secondary">
                  {grid.criterio === 'fecha'
                    ? 'Mostrando cantidad de alumnos por fecha puntual.'
                    : 'Rango largo: mostrando el promedio de alumnos por franja y día de la semana en el período.'}
                </p>
                <GrillaOcupacion grid={grid} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppLayout>
  )
}
