import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { DateField } from '../../components/ui/DateField'
import { SelectField } from '../../components/ui/SelectField'
import { useAuth } from '../../contexts/AuthContext'
import { formatearFecha, formatearHora } from '../../lib/formato'
import {
  OPERACIONES_ERROR,
  listErroresSistema,
  operacionLabel,
  type ErrorSistemaConDetalle,
} from '../../lib/erroresSistema'
import {
  cerrarTurnoManual,
  listTurnosAbiertosProlongados,
} from '../../lib/horariosProfesor'
import { AsistenciaSubnav } from '../asistencias/AsistenciaSubnav'
import type { TurnoAbiertoProlongado } from '../../types/db'

function formatearFechaHora(iso: string): string {
  const hora = new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${formatearFecha(iso)} · ${hora}`
}

function TurnosAbiertosProlongadosSection() {
  const [turnos, setTurnos] = useState<TurnoAbiertoProlongado[]>([])
  const [loading, setLoading] = useState(true)
  const [cerrando, setCerrando] = useState<TurnoAbiertoProlongado | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  async function handleConfirmarCierre() {
    if (!cerrando) return
    try {
      await cerrarTurnoManual(cerrando.id)
      setCerrando(null)
      await cargar()
    } catch (err) {
      console.error(err)
      setError('No se pudo cerrar el turno.')
      setCerrando(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-montserrat text-base font-bold text-text-primary">Turnos abiertos prolongados</h2>
        <p className="mt-1 font-inter text-[13px] text-text-secondary">
          Turnos sin hora de salida de días anteriores a hoy — probable turno huérfano.
        </p>
      </div>

      {error && (
        <p className="rounded-[10px] border border-estado-error-text bg-estado-deuda-bg px-3 py-2 font-inter text-[12px] text-estado-error-text">
          {error}
        </p>
      )}

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

      <ConfirmDialog
        open={Boolean(cerrando)}
        title="Cerrar turno"
        message={
          cerrando
            ? `¿Cerrar el turno de ${cerrando.profesor_nombre} del ${formatearFecha(cerrando.fecha)}? Se registra la salida a las 23:59 de esa fecha — se puede afinar después desde "Editar" en Asistencia Profesores.`
            : ''
        }
        confirmLabel="Cerrar turno"
        onConfirm={handleConfirmarCierre}
        onCancel={() => setCerrando(null)}
      />
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
