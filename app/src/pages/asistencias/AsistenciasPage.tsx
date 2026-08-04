import { useEffect, useState, type FormEvent } from 'react'
import { Edit2 } from 'react-feather'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { AlumnoSelect } from '../../components/ui/AlumnoSelect'
import { AsistenciaSubnav } from './AsistenciaSubnav'
import { DataTable } from '../../components/ui/DataTable'
import { Drawer } from '../../components/ui/Drawer'
import { FormField } from '../../components/ui/FormField'
import { PinButton } from '../../components/ui/PinButton'
import { SelectField } from '../../components/ui/SelectField'
import { TimeField } from '../../components/ui/TimeField'
import { useAuth } from '../../contexts/AuthContext'
import { useSucursal } from '../../contexts/SucursalContext'
import { usePinnedRows } from '../../hooks/usePinnedRows'
import {
  listAsistenciasConDetalle,
  updateAsistencia,
  type AsistenciaConDetalle,
} from '../../lib/asistencias'
import { listAlumnos } from '../../lib/alumnos'
import { listDisciplinas } from '../../lib/disciplinas'
import { formatearFecha, formatearHora } from '../../lib/formato'
import type { Alumno, Disciplina } from '../../types/db'

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

        <FormField label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
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

export function AsistenciasPage() {
  const { rol } = useAuth()
  const { habilitado: pinHabilitado, togglePin, estaFijado, limiteAlcanzado } = usePinnedRows('asistencias')
  const [asistencias, setAsistencias] = useState<AsistenciaConDetalle[]>([])
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<AsistenciaConDetalle | null>(null)
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroDisciplinaId, setFiltroDisciplinaId] = useState('')
  const [filtroAlumno, setFiltroAlumno] = useState('')

  async function reload() {
    const data = await listAsistenciasConDetalle()
    setAsistencias(data)
  }

  useEffect(() => {
    let active = true
    Promise.all([listAsistenciasConDetalle(), listAlumnos(), listDisciplinas()]).then(
      ([asistenciasData, alumnosData, disciplinasData]) => {
        if (!active) return
        setAsistencias(asistenciasData)
        setAlumnos(alumnosData)
        setDisciplinas(disciplinasData)
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [])

  if (rol === 'kiosco') return <Navigate to="/" replace />

  const asistenciasFiltradas = asistencias.filter((a) => {
    if (filtroFecha && a.fecha !== filtroFecha) return false
    if (filtroDisciplinaId && a.disciplina_id !== filtroDisciplinaId) return false
    if (filtroAlumno) {
      const query = filtroAlumno.trim().toLowerCase()
      const nombre = `${a.alumno?.apellido ?? ''} ${a.alumno?.nombre ?? ''}`.toLowerCase()
      const dni = a.alumno?.dni ?? ''
      if (!nombre.includes(query) && !dni.includes(query)) return false
    }
    return true
  })

  const hayFiltrosActivos = Boolean(filtroFecha || filtroDisciplinaId || filtroAlumno)

  function limpiarFiltros() {
    setFiltroFecha('')
    setFiltroDisciplinaId('')
    setFiltroAlumno('')
  }

  async function handleSaved() {
    setEditando(null)
    await reload()
  }

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

        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-card p-4 lg:flex-row lg:items-end lg:gap-3">
          <div className="flex-1">
            <FormField
              label="Fecha"
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
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

        <DataTable<AsistenciaConDetalle>
          columns={[
            {
              header: 'Alumno',
              accessor: (a) => (a.alumno ? `${a.alumno.apellido}, ${a.alumno.nombre}` : '—'),
            },
            { header: 'DNI', accessor: (a) => a.alumno?.dni ?? '—' },
            { header: 'Disciplina', accessor: (a) => a.disciplina?.nombre ?? '—' },
            { header: 'Fecha', accessor: (a) => formatearFecha(a.fecha) },
            { header: 'Hora', accessor: (a) => formatearHora(a.hora) },
            { header: 'Sucursal', accessor: (a) => a.sucursal?.nombre ?? '—' },
            ...(rol === 'admin'
              ? [
                  {
                    header: '',
                    accessor: (a: AsistenciaConDetalle) => (
                      <div className="flex items-center justify-end gap-3">
                        {pinHabilitado && (
                          <PinButton
                            fijado={estaFijado(a.id)}
                            disabled={!estaFijado(a.id) && limiteAlcanzado}
                            onClick={() => togglePin(a.id)}
                            label={`Fijar asistencia de ${a.alumno ? `${a.alumno.apellido}, ${a.alumno.nombre}` : 'alumno'}`}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setEditando(a)}
                          aria-label="Editar asistencia"
                          className="text-text-secondary hover:text-text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    ),
                    className: 'text-right',
                  },
                ]
              : []),
          ]}
          data={asistenciasFiltradas}
          keyExtractor={(a) => a.id}
          loading={loading}
          tablaId="asistencias"
          emptyMessage={
            hayFiltrosActivos
              ? 'Ninguna asistencia coincide con los filtros.'
              : 'Todavía no hay asistencias registradas.'
          }
        />

        {limiteAlcanzado && (
          <p className="font-inter text-[11px] text-text-secondary">Máximo 5 filas fijadas.</p>
        )}
      </div>

      {rol === 'admin' && (
        <EditarAsistenciaDrawer
          asistencia={editando}
          alumnos={alumnos}
          disciplinas={disciplinas}
          onClose={() => setEditando(null)}
          onSaved={handleSaved}
        />
      )}
    </AppLayout>
  )
}
