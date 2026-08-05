import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Edit2, MapPin, Trash2 } from 'react-feather'
import { AppLayout } from '../../components/layout/AppLayout'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { DateField } from '../../components/ui/DateField'
import { Drawer } from '../../components/ui/Drawer'
import { PeriodoField } from '../../components/ui/PeriodoField'
import { SelectField } from '../../components/ui/SelectField'
import { TimeField } from '../../components/ui/TimeField'
import { SucursalFilter } from '../../components/ui/SucursalFilter'
import { useAuth } from '../../contexts/AuthContext'
import { useSucursal } from '../../contexts/SucursalContext'
import { formatearFecha, formatearHora, formatearPeriodo, periodoActual, rangoDelMes } from '../../lib/formato'
import {
  calcularHorasTurno,
  deleteHorarioProfesor,
  formatearHoras,
  listHorariosProfesorEnRango,
  listHorariosProfesorHoy,
  registrarEntradaProfesor,
  registrarSalidaProfesor,
  updateHorarioProfesor,
  type HorarioProfesorConNombre,
} from '../../lib/horariosProfesor'
import { listProfesores } from '../../lib/profesores'
import { ProfesorTurnoCard } from './ProfesorTurnoCard'
import { AsistenciaSubnav } from '../asistencias/AsistenciaSubnav'
import type { Modulo, Profesor } from '../../types/db'

const FORM_ID = 'horario-profesor-form'

function EditarHorarioDrawer({
  horario,
  onClose,
  onSaved,
}: {
  horario: HorarioProfesorConNombre | null
  onClose: () => void
  onSaved: () => void
}) {
  const [fecha, setFecha] = useState('')
  const [horaEntrada, setHoraEntrada] = useState('')
  const [horaSalida, setHoraSalida] = useState('')
  const [modulo, setModulo] = useState<Modulo | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!horario) return
    setFecha(horario.fecha)
    setHoraEntrada(horario.hora_entrada ? formatearHora(horario.hora_entrada) : '')
    setHoraSalida(horario.hora_salida ? formatearHora(horario.hora_salida) : '')
    setModulo(horario.modulo ?? '')
    setError(null)
  }, [horario])

  if (!horario) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!fecha) {
      setError('Indicá la fecha.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateHorarioProfesor(horario!.id, {
        fecha,
        hora_entrada: horaEntrada || null,
        hora_salida: horaSalida || null,
        sucursal_id: horario!.sucursal_id,
        modulo: modulo || null,
      })
      onSaved()
    } catch {
      setError('No se pudo guardar el registro.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Editar horario — ${horario.profesor?.nombre ?? '—'}`}
      footer={
        <button
          type="submit"
          form={FORM_ID}
          disabled={saving}
          className="h-11 w-full rounded-[10px] bg-accent-cyan font-montserrat text-[13px] font-bold text-text-on-accent outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60 xl:h-9"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 xl:gap-3">
        <DateField label="Fecha" value={fecha} onChange={setFecha} required />

        <div className="grid grid-cols-2 gap-3">
          <TimeField label="Hora entrada" value={horaEntrada} onChange={setHoraEntrada} />
          <TimeField label="Hora salida" value={horaSalida} onChange={setHoraSalida} />
        </div>

        <SelectField
          label="Módulo"
          value={modulo}
          onChange={(e) => setModulo(e.target.value as Modulo | '')}
        >
          <option value="">Sin módulo</option>
          <option value="2hs">2hs</option>
          <option value="3hs">3hs</option>
        </SelectField>

        {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
      </form>
    </Drawer>
  )
}

export function AsistenciaProfesores() {
  const { rol } = useAuth()
  const { sucursales, sucursalId } = useSucursal()

  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [turnosHoy, setTurnosHoy] = useState<HorarioProfesorConNombre[]>([])
  const [savingProfesorId, setSavingProfesorId] = useState<string | null>(null)

  const [periodo, setPeriodo] = useState(periodoActual())
  const [horarios, setHorarios] = useState<HorarioProfesorConNombre[]>([])
  const [loadingTabla, setLoadingTabla] = useState(true)
  const [editando, setEditando] = useState<HorarioProfesorConNombre | null>(null)
  const [borrando, setBorrando] = useState<HorarioProfesorConNombre | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const filtroSucursalDeshabilitado = sucursales.filter((s) => s.activa).length <= 1

  async function cargarRoster() {
    const [profesoresData, turnosData] = await Promise.all([listProfesores(), listHorariosProfesorHoy()])
    setProfesores(profesoresData.filter((p) => p.activo))
    setTurnosHoy(turnosData)
  }

  useEffect(() => {
    let active = true
    cargarRoster().catch(() => {
      if (!active) return
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let active = true
    setLoadingTabla(true)
    const { inicio, fin } = rangoDelMes(periodo)
    listHorariosProfesorEnRango(inicio, fin, sucursalId).then((data) => {
      if (!active) return
      setHorarios([...data].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)))
      setLoadingTabla(false)
    })
    return () => {
      active = false
    }
  }, [periodo, sucursalId])

  if (rol === 'kiosco') return <Navigate to="/" replace />

  function turnoAbiertoDe(profesorId: string): HorarioProfesorConNombre | null {
    const abiertos = turnosHoy.filter((h) => h.profesor_id === profesorId && !h.hora_salida)
    if (abiertos.length === 0) return null
    return abiertos.sort((a, b) => (a.hora_entrada! < b.hora_entrada! ? 1 : -1))[0]
  }

  async function recargarTabla() {
    const { inicio, fin } = rangoDelMes(periodo)
    const data = await listHorariosProfesorEnRango(inicio, fin, sucursalId)
    setHorarios([...data].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)))
  }

  async function handleRegistrarEntrada(profesorId: string, modulo: Modulo | null) {
    if (!sucursalId) return
    setSavingProfesorId(profesorId)
    setErrorAccion(null)
    try {
      await registrarEntradaProfesor(profesorId, sucursalId, modulo)
      await Promise.all([cargarRoster(), recargarTabla()])
    } catch (err) {
      console.error(err)
      setErrorAccion('No se pudo registrar la entrada. Probá de nuevo.')
    } finally {
      setSavingProfesorId(null)
    }
  }

  async function handleRegistrarSalida(profesorId: string) {
    const turno = turnoAbiertoDe(profesorId)
    if (!turno) return
    setSavingProfesorId(profesorId)
    setErrorAccion(null)
    try {
      await registrarSalidaProfesor(turno.id)
      await Promise.all([cargarRoster(), recargarTabla()])
    } catch (err) {
      console.error(err)
      setErrorAccion('No se pudo registrar la salida. Probá de nuevo.')
    } finally {
      setSavingProfesorId(null)
    }
  }

  async function handleSaved() {
    setEditando(null)
    await Promise.all([recargarTabla(), cargarRoster()])
  }

  async function handleConfirmarBorrado() {
    if (!borrando) return
    try {
      await deleteHorarioProfesor(borrando.id)
      setBorrando(null)
      await Promise.all([recargarTabla(), cargarRoster()])
    } catch (err) {
      console.error(err)
      setErrorAccion('No se pudo eliminar el registro.')
      setBorrando(null)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {/* Admin la ve como submenú "Profesores" dentro de Asistencia; para el
            profesor esta pantalla es su Inicio, sin hermanos de tab. */}
        {rol === 'admin' && <AsistenciaSubnav />}

        <div>
          <h1 className="font-montserrat text-xl font-extrabold text-text-primary">Asistencia Profesores</h1>
          <p className="mt-1 font-inter text-[13px] text-text-secondary">
            Registro de entrada y salida del equipo de profesores.
          </p>
        </div>

        {sucursales.length > 0 && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="shrink-0 text-text-secondary" />
            <SucursalFilter disabled={filtroSucursalDeshabilitado} />
          </div>
        )}

        {errorAccion && (
          <p className="rounded-[10px] border border-estado-error-text bg-estado-deuda-bg px-3 py-2 font-inter text-[12px] text-estado-error-text">
            {errorAccion}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          {profesores.map((p) => (
            <ProfesorTurnoCard
              key={p.id}
              profesor={p}
              turnoAbierto={turnoAbiertoDe(p.id)}
              saving={savingProfesorId === p.id}
              sucursalDisponible={Boolean(sucursalId)}
              onRegistrarEntrada={(modulo) => handleRegistrarEntrada(p.id, modulo)}
              onRegistrarSalida={() => handleRegistrarSalida(p.id)}
            />
          ))}
          {profesores.length === 0 && (
            <p className="col-span-full font-inter text-[13px] text-text-secondary">
              Todavía no hay profesores activos en el roster.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="max-w-[280px]">
            <PeriodoField label="Período" value={periodo} onChange={setPeriodo} />
          </div>

          <DataTable<HorarioProfesorConNombre>
            columns={[
              { header: 'Profesor', accessor: (h) => h.profesor?.nombre ?? '—' },
              { header: 'Fecha', accessor: (h) => formatearFecha(h.fecha) },
              { header: 'Entrada', accessor: (h) => (h.hora_entrada ? formatearHora(h.hora_entrada) : '—') },
              { header: 'Salida', accessor: (h) => (h.hora_salida ? formatearHora(h.hora_salida) : 'En curso') },
              {
                header: 'Horas',
                accessor: (h) => {
                  const horas = calcularHorasTurno(h.hora_entrada, h.hora_salida)
                  return horas === null ? '—' : formatearHoras(horas)
                },
              },
              { header: 'Módulo', accessor: (h) => h.modulo ?? '—' },
              ...(rol === 'admin'
                ? [
                    {
                      header: 'Acciones',
                      accessor: (h: HorarioProfesorConNombre) => (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setEditando(h)}
                            aria-label={`Editar horario de ${h.profesor?.nombre ?? 'profesor'}`}
                            className="text-text-secondary hover:text-text-primary"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setBorrando(h)}
                            aria-label={`Eliminar horario de ${h.profesor?.nombre ?? 'profesor'}`}
                            className="text-estado-error-text hover:opacity-80"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ),
                      className: 'text-right',
                    },
                  ]
                : []),
            ]}
            data={horarios}
            keyExtractor={(h) => h.id}
            loading={loadingTabla}
            emptyMessage={`Sin registros en ${formatearPeriodo(periodo)}.`}
          />
        </div>
      </div>

      {rol === 'admin' && (
        <EditarHorarioDrawer horario={editando} onClose={() => setEditando(null)} onSaved={handleSaved} />
      )}

      <ConfirmDialog
        open={Boolean(borrando)}
        title="Eliminar registro"
        message={
          borrando
            ? `¿Eliminar el registro de ${borrando.profesor?.nombre ?? 'este profesor'} del ${formatearFecha(borrando.fecha)}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={handleConfirmarBorrado}
        onCancel={() => setBorrando(null)}
      />
    </AppLayout>
  )
}
