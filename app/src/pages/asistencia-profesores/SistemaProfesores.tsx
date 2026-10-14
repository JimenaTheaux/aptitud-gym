import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { DataTable } from '../../components/ui/DataTable'
import { DateField } from '../../components/ui/DateField'
import { Drawer } from '../../components/ui/Drawer'
import { SelectField } from '../../components/ui/SelectField'
import { TimeField } from '../../components/ui/TimeField'
import { useAuth } from '../../contexts/AuthContext'
import { formatearFecha, formatearHora } from '../../lib/formato'
import {
  OPERACIONES_ERROR,
  listErroresSistema,
  operacionLabel,
  type ErrorSistemaConDetalle,
} from '../../lib/erroresSistema'
import {
  calcularHorasTurno,
  cerrarTurnoManual,
  formatearHoras,
  listTurnosAbiertosProlongados,
} from '../../lib/horariosProfesor'
import { AsistenciaSubnav } from '../asistencias/AsistenciaSubnav'
import type { TurnoAbiertoProlongado } from '../../types/db'

function formatearFechaHora(iso: string): string {
  // hourCycle h23: es-AR usa 12 h por defecto ("03:00 p. m.") — la app es 24 h.
  const hora = new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return `${formatearFecha(iso)} · ${hora}`
}

const CERRAR_TURNO_FORM_ID = 'cerrar-turno-form'

// Cierre manual de un turno huérfano: la admin ingresa la hora de salida real
// (corroborada con el profesor) — sin valor por default, para no inventar
// horas. Muestra la duración resultante como control antes de guardar.
function CerrarTurnoDrawer({
  turno,
  onClose,
  onCerrado,
}: {
  turno: TurnoAbiertoProlongado | null
  onClose: () => void
  onCerrado: () => void
}) {
  const [horaSalida, setHoraSalida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setHoraSalida('')
    setError(null)
  }, [turno])

  if (!turno) return null

  const horas = horaSalida ? calcularHorasTurno(turno.hora_entrada, horaSalida) : null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!horaSalida) {
      setError('Indicá la hora de salida.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await cerrarTurnoManual(turno!.id, horaSalida)
      onCerrado()
    } catch (err) {
      console.error(err)
      setError('No se pudo cerrar el turno.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Cerrar turno — ${turno.profesor_nombre}`}
      footer={
        <button
          type="submit"
          form={CERRAR_TURNO_FORM_ID}
          disabled={saving}
          className="h-11 w-full rounded-[10px] bg-accent-cyan font-montserrat text-[13px] font-bold text-text-on-accent outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60 xl:h-9"
        >
          {saving ? 'Guardando…' : 'Cerrar turno'}
        </button>
      }
    >
      <form id={CERRAR_TURNO_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 xl:gap-3">
        <p className="font-inter text-[13px] text-text-secondary">
          Turno del {formatearFecha(turno.fecha)}, entrada{' '}
          {turno.hora_entrada ? formatearHora(turno.hora_entrada) : '—'}. Si la salida es menor que la
          entrada, se toma como del día siguiente.
        </p>

        <TimeField label="Hora salida" value={horaSalida} onChange={setHoraSalida} required />

        {horas !== null && (
          <p className="font-inter text-[13px] text-text-secondary">Duración: {formatearHoras(horas)}</p>
        )}

        {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
      </form>
    </Drawer>
  )
}

function TurnosAbiertosProlongadosSection() {
  const [turnos, setTurnos] = useState<TurnoAbiertoProlongado[]>([])
  const [loading, setLoading] = useState(true)
  const [cerrando, setCerrando] = useState<TurnoAbiertoProlongado | null>(null)

  async function cargar() {
    setLoading(true)
    try {
      setTurnos(await listTurnosAbiertosProlongados())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function handleCerrado() {
    setCerrando(null)
    await cargar()
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-montserrat text-base font-bold text-text-primary">Turnos abiertos prolongados</h2>
        <p className="mt-1 font-inter text-[13px] text-text-secondary">
          Turnos sin hora de salida abiertos hace más de 14 h — probable turno huérfano.
        </p>
      </div>

      <DataTable<TurnoAbiertoProlongado>
        columns={[
          { header: 'Profesor', accessor: (t) => t.profesor_nombre },
          { header: 'Sucursal', accessor: (t) => t.sucursal_nombre },
          { header: 'Fecha', accessor: (t) => formatearFecha(t.fecha) },
          { header: 'Entrada', accessor: (t) => (t.hora_entrada ? formatearHora(t.hora_entrada) : '—') },
          { header: 'Días abierto', accessor: (t) => t.dias_abierto },
          { header: 'Módulo', accessor: (t) => t.modulo ?? '—' },
          {
            header: 'Acciones',
            accessor: (t) => (
              <button
                type="button"
                onClick={() => setCerrando(t)}
                className="rounded-lg border border-accent-cyan px-3 py-1 font-montserrat text-[11px] font-bold text-accent-cyan"
              >
                Cerrar turno
              </button>
            ),
            className: 'text-right',
          },
        ]}
        data={turnos}
        keyExtractor={(t) => t.id}
        loading={loading}
        emptyMessage="Sin turnos abiertos prolongados."
      />

      <CerrarTurnoDrawer turno={cerrando} onClose={() => setCerrando(null)} onCerrado={handleCerrado} />
    </div>
  )
}

function ErroresSistemaSection() {
  const [errores, setErrores] = useState<ErrorSistemaConDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroOperacion, setFiltroOperacion] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    listErroresSistema({
      operacion: filtroOperacion || undefined,
      desde: filtroDesde || undefined,
      hasta: filtroHasta || undefined,
    }).then((data) => {
      if (!active) return
      setErrores(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [filtroOperacion, filtroDesde, filtroHasta])

  const hayFiltrosActivos = Boolean(filtroOperacion || filtroDesde || filtroHasta)

  function limpiarFiltros() {
    setFiltroOperacion('')
    setFiltroDesde('')
    setFiltroHasta('')
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-montserrat text-base font-bold text-text-primary">Errores del sistema</h2>
        <p className="mt-1 font-inter text-[13px] text-text-secondary">
          Fallas al registrar entrada, salida o editar un horario de profesor.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
          <div className="flex-1">
            <SelectField
              label="Operación"
              value={filtroOperacion}
              onChange={(e) => setFiltroOperacion(e.target.value)}
            >
              <option value="">Todas</option>
              {OPERACIONES_ERROR.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex-1">
            <DateField label="Desde" value={filtroDesde} onChange={setFiltroDesde} max={filtroHasta || undefined} />
          </div>

          <div className="flex-1">
            <DateField label="Hasta" value={filtroHasta} onChange={setFiltroHasta} min={filtroDesde || undefined} />
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
      </div>

      <DataTable<ErrorSistemaConDetalle>
        columns={[
          { header: 'Fecha', accessor: (e) => formatearFechaHora(e.created_at) },
          { header: 'Profesor', accessor: (e) => e.profesor?.nombre ?? '—' },
          { header: 'Sucursal', accessor: (e) => e.sucursal?.nombre ?? '—' },
          { header: 'Operación', accessor: (e) => operacionLabel(e.operacion) },
          { header: 'Detalle', accessor: (e) => e.detalle },
        ]}
        data={errores}
        keyExtractor={(e) => e.id}
        loading={loading}
        emptyMessage={hayFiltrosActivos ? 'Ningún error coincide con los filtros.' : 'Sin errores registrados.'}
      />
    </div>
  )
}

export function SistemaProfesores() {
  const { rol } = useAuth()

  if (rol !== 'admin') return <Navigate to="/" replace />

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <AsistenciaSubnav />

        <div>
          <h1 className="font-montserrat text-xl font-extrabold text-text-primary">Sistema</h1>
          <p className="mt-1 font-inter text-[13px] text-text-secondary">
            Turnos huérfanos y fallas de entrada/salida de profesores — diagnóstico, no restauración automática.
          </p>
        </div>

        <TurnosAbiertosProlongadosSection />
        <ErroresSistemaSection />
      </div>
    </AppLayout>
  )
}
