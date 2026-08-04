import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Edit2, Eye } from 'react-feather'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { AlumnoSelect } from '../../components/ui/AlumnoSelect'
import { AsistenciaSubnav } from './AsistenciaSubnav'
import { DataTable } from '../../components/ui/DataTable'
import { DateField } from '../../components/ui/DateField'
import { Drawer } from '../../components/ui/Drawer'
import { FormField } from '../../components/ui/FormField'
import { PinButton } from '../../components/ui/PinButton'
import { SelectField } from '../../components/ui/SelectField'
import { TimeField } from '../../components/ui/TimeField'
import { useAuth } from '../../contexts/AuthContext'
import { useSucursal } from '../../contexts/SucursalContext'
import { usePinnedRows } from '../../hooks/usePinnedRows'
import {
  listAsistenciasEnRango,
  updateAsistencia,
  type AsistenciaConDetalle,
} from '../../lib/asistencias'
import { listAlumnos } from '../../lib/alumnos'
import { listDisciplinas } from '../../lib/disciplinas'
import { formatearFecha, formatearHora, hoyISO, periodoActual, rangoDelMes, rangoDeEstaSemana } from '../../lib/formato'
import type { Alumno, Disciplina } from '../../types/db'

type FilaAsistenciaAlumno = {
  alumnoId: string
  alumno: { apellido: string; nombre: string; dni: string } | null
  cantidad: number
}

function agruparPorAlumno(asistencias: AsistenciaConDetalle[]): FilaAsistenciaAlumno[] {
  const filas = new Map<string, FilaAsistenciaAlumno>()
  for (const a of asistencias) {
    const fila = filas.get(a.alumno_id)
    if (fila) {
      fila.cantidad += 1
    } else {
      filas.set(a.alumno_id, { alumnoId: a.alumno_id, alumno: a.alumno, cantidad: 1 })
    }
  }
  return Array.from(filas.values()).sort((a, b) => b.cantidad - a.cantidad)
}

function nombreAlumno(alumno: FilaAsistenciaAlumno['alumno']): string {
  return alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Alumno'
}

function EditarAsistenciaDrawer({
  asistencia,
  alumnos,
  disciplinas,
  onClose,
  onSaved,
}: {
  asistencia: AsistenciaConDetalle | null
  alumnos: Alumno[]
  disciplinas: Disciplina[]
  onClose: () => void
  onSaved: () => void
}) {
  const { sucursales } = useSucursal()

  const [alumnoId, setAlumnoId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!asistencia) return
    setAlumnoId(asistencia.alumno_id)
    setDisciplinaId(asistencia.disciplina_id ?? '')
    setFecha(asistencia.fecha)
    setHora(formatearHora(asistencia.hora))
    setSucursalId(asistencia.sucursal_id)
    setError(null)
  }, [asistencia])

  if (!asistencia) return null
  const asistenciaId = asistencia.id

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!alumnoId || !fecha || !hora || !sucursalId) {
      setError('Completá todos los campos obligatorios.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateAsistencia(asistenciaId, {
        alumno_id: alumnoId,
        disciplina_id: disciplinaId || null,
        fecha,
        hora,
        sucursal_id: sucursalId,
      })
      onSaved()
    } catch {
      setError('No se pudo guardar la asistencia.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open onClose={onClose} title="Editar asistencia">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AlumnoSelect label="Alumno" alumnos={alumnos} value={alumnoId} onChange={setAlumnoId} required />

        <SelectField
          label="Disciplina"
          value={disciplinaId}
          onChange={(e) => setDisciplinaId(e.target.value)}
        >
          <option value="">Sin disciplina</option>
          {disciplinas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </SelectField>

        <DateField label="Fecha" value={fecha} onChange={setFecha} required />
        <TimeField label="Hora" value={hora} onChange={setHora} required />

        <SelectField label="Sucursal" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </SelectField>

        {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 h-11 rounded-[10px] bg-accent-cyan font-montserrat text-[13px] font-bold text-text-on-accent disabled:opacity-60 xl:h-9"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </Drawer>
  )
}

function DetalleAsistenciasAlumnoDrawer({
  alumno,
  asistencias,
  onClose,
  onEditar,
}: {
  alumno: { id: string; nombre: string } | null
  asistencias: AsistenciaConDetalle[]
  onClose: () => void
  onEditar: (a: AsistenciaConDetalle) => void
}) {
  if (!alumno) return null

  const registros = asistencias.filter((a) => a.alumno_id === alumno.id)

  return (
    <Drawer open onClose={onClose} title={`Asistencias de ${alumno.nombre}`}>
      <div className="flex flex-col gap-2">
        {registros.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-bg-input px-3 py-2.5"
          >
            <div>
              <p className="font-inter text-[13px] text-text-primary">
                {formatearFecha(a.fecha)} · {formatearHora(a.hora)}
              </p>
              <p className="font-inter text-[11px] text-text-secondary">{a.disciplina?.nombre ?? 'Sin disciplina'}</p>
            </div>
            <button
              type="button"
              onClick={() => onEditar(a)}
              aria-label="Editar asistencia"
              className="text-text-secondary hover:text-text-primary"
            >
              <Edit2 size={14} />
            </button>
          </div>
        ))}
        {registros.length === 0 && (
          <p className="font-inter text-[13px] text-text-secondary">Sin registros en el período filtrado.</p>
        )}
      </div>
    </Drawer>
  )
}

export function AsistenciasPage() {
  const { rol } = useAuth()
  const { habilitado: pinHabilitado, togglePin, estaFijado, limiteAlcanzado } = usePinnedRows('asistencias_alumnos')
  const [asistencias, setAsistencias] = useState<AsistenciaConDetalle[]>([])
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<AsistenciaConDetalle | null>(null)
  const [alumnoDetalle, setAlumnoDetalle] = useState<{ id: string; nombre: string } | null>(null)
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroDisciplinaId, setFiltroDisciplinaId] = useState('')
  const [filtroAlumno, setFiltroAlumno] = useState('')

  async function reload() {
    const data = await listAsistenciasEnRango({
      desde: filtroDesde || undefined,
      hasta: filtroHasta || undefined,
      disciplinaId: filtroDisciplinaId || undefined,
    })
    setAsistencias(data)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    listAsistenciasEnRango({
      desde: filtroDesde || undefined,
      hasta: filtroHasta || undefined,
      disciplinaId: filtroDisciplinaId || undefined,
    }).then((data) => {
      if (!active) return
      setAsistencias(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [filtroDesde, filtroHasta, filtroDisciplinaId])

  useEffect(() => {
    let active = true
    Promise.all([listAlumnos(), listDisciplinas()]).then(([alumnosData, disciplinasData]) => {
      if (!active) return
      setAlumnos(alumnosData)
      setDisciplinas(disciplinasData)
    })
    return () => {
      active = false
    }
  }, [])

  if (rol === 'kiosco') return <Navigate to="/" replace />

  const filas = useMemo(() => agruparPorAlumno(asistencias), [asistencias])

  const filasFiltradas = filas.filter((f) => {
    if (!filtroAlumno) return true
    const query = filtroAlumno.trim().toLowerCase()
    const nombre = nombreAlumno(f.alumno).toLowerCase()
    const dni = f.alumno?.dni ?? ''
    return nombre.includes(query) || dni.includes(query)
  })

  const hayFiltrosActivos = Boolean(filtroDesde || filtroHasta || filtroDisciplinaId || filtroAlumno)

  function limpiarFiltros() {
    setFiltroDesde('')
    setFiltroHasta('')
    setFiltroDisciplinaId('')
    setFiltroAlumno('')
  }

  async function handleSaved() {
    setEditando(null)
    await reload()
  }

  const atajos = [
    { label: 'Hoy', inicio: hoyISO(), fin: hoyISO() },
    { label: 'Esta semana', ...rangoDeEstaSemana() },
    { label: 'Este mes', ...rangoDelMes(periodoActual()) },
  ]

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        {rol === 'admin' && <AsistenciaSubnav />}

        <div>
          <h1 className="font-montserrat text-xl font-extrabold text-text-primary">
            Asistencias
          </h1>
          <p className="mt-1 font-inter text-[13px] text-text-secondary">
            Registro de asistencias de alumnos.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
            <div className="flex-1">
              <DateField
                label="Desde"
                value={filtroDesde}
                onChange={setFiltroDesde}
                max={filtroHasta || undefined}
              />
            </div>

            <div className="flex-1">
              <DateField
                label="Hasta"
                value={filtroHasta}
                onChange={setFiltroHasta}
                min={filtroDesde || undefined}
              />
            </div>

            <div className="flex-1">
              <SelectField
                label="Disciplina"
                value={filtroDisciplinaId}
                onChange={(e) => setFiltroDisciplinaId(e.target.value)}
              >
                <option value="">Todas</option>
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="flex-1">
              <FormField
                label="Alumno"
                placeholder="Nombre o DNI…"
                value={filtroAlumno}
                onChange={(e) => setFiltroAlumno(e.target.value)}
              />
            </div>

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-11 shrink-0 rounded-[10px] border border-border-subtle px-4 font-montserrat text-[13px] font-bold text-text-secondary hover:text-text-primary xl:h-10"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {atajos.map((atajo) => {
              const activo = filtroDesde === atajo.inicio && filtroHasta === atajo.fin
              return (
                <button
                  key={atajo.label}
                  type="button"
                  onClick={() => {
                    setFiltroDesde(atajo.inicio)
                    setFiltroHasta(atajo.fin)
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

        <DataTable<FilaAsistenciaAlumno>
          columns={[
            { header: 'Alumno', accessor: (f) => nombreAlumno(f.alumno) },
            { header: 'DNI', accessor: (f) => f.alumno?.dni ?? '—' },
            { header: 'Asistencias en el período', accessor: (f) => String(f.cantidad) },
            ...(rol === 'admin'
              ? [
                  {
                    header: '',
                    accessor: (f: FilaAsistenciaAlumno) => (
                      <div className="flex items-center justify-end gap-3">
                        {pinHabilitado && (
                          <PinButton
                            fijado={estaFijado(f.alumnoId)}
                            disabled={!estaFijado(f.alumnoId) && limiteAlcanzado}
                            onClick={() => togglePin(f.alumnoId)}
                            label={`Fijar asistencias de ${nombreAlumno(f.alumno)}`}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setAlumnoDetalle({ id: f.alumnoId, nombre: nombreAlumno(f.alumno) })}
                          aria-label="Ver detalle de asistencias"
                          className="text-text-secondary hover:text-text-primary"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    ),
                    className: 'text-right',
                  },
                ]
              : []),
          ]}
          data={filasFiltradas}
          keyExtractor={(f) => f.alumnoId}
          loading={loading}
          tablaId="asistencias_alumnos"
          emptyMessage={
            hayFiltrosActivos
              ? 'Ningún alumno coincide con los filtros.'
              : 'Todavía no hay asistencias registradas.'
          }
        />

        {limiteAlcanzado && (
          <p className="font-inter text-[11px] text-text-secondary">Máximo 5 filas fijadas.</p>
        )}
      </div>

      {rol === 'admin' && (
        <>
          <DetalleAsistenciasAlumnoDrawer
            alumno={alumnoDetalle}
            asistencias={asistencias}
            onClose={() => setAlumnoDetalle(null)}
            onEditar={(a) => {
              setAlumnoDetalle(null)
              setEditando(a)
            }}
          />
          <EditarAsistenciaDrawer
            asistencia={editando}
            alumnos={alumnos}
            disciplinas={disciplinas}
            onClose={() => setEditando(null)}
            onSaved={handleSaved}
          />
        </>
      )}
    </AppLayout>
  )
}
