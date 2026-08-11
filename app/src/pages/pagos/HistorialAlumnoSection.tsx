import { useEffect, useState } from 'react'
import { Edit2, Trash2 } from 'react-feather'
import { AlumnoSelect } from '../../components/ui/AlumnoSelect'
import { BadgeEstado, ESTADO_BAR_CLASS } from '../../components/ui/BadgeEstado'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { EstadoCuentaCard } from '../Checkin/EstadoCuentaCard'
import { useAuth } from '../../contexts/AuthContext'
import { listCargosByAlumno } from '../../lib/cargos'
import { deletePago, listPagosByAlumno, type PagoConDetalle } from '../../lib/pagos'
import { formatearCantidadDias, formatearFecha, formatearMonto, formatearPeriodo } from '../../lib/formato'
import { CargoFormDrawer } from './CargoFormDrawer'
import { PagoFormDrawer } from './PagoFormDrawer'
import type { EstadoCuenta } from '../../lib/estadoCuenta'
import type { Alumno, Cargo, Disciplina, Profesor } from '../../types/db'

const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  combinado: 'Combinado',
}

export function HistorialAlumnoSection({
  alumnos,
  disciplinas,
  profesores,
  alumnoId,
  reloadToken,
  onAlumnoChange,
}: {
  alumnos: Alumno[]
  disciplinas: Disciplina[]
  profesores: Profesor[]
  alumnoId: string
  reloadToken: number
  onAlumnoChange: (alumnoId: string) => void
}) {
  const { rol } = useAuth()
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [pagos, setPagos] = useState<PagoConDetalle[]>([])
  const [loading, setLoading] = useState(false)
  const [estadoAlumno, setEstadoAlumno] = useState<EstadoCuenta | null>(null)

  // Token propio de esta sección — se suma a reloadToken (viene de PagosPage)
  // para refrescar cargos/pagos y forzar un remount de EstadoCuentaCard
  // después de editar/eliminar acá, sin depender de que el padre lo sepa.
  const [localToken, setLocalToken] = useState(0)

  const [cargoAEditar, setCargoAEditar] = useState<Cargo | null>(null)
  const [pagoAEditar, setPagoAEditar] = useState<PagoConDetalle | null>(null)
  const [pagoAEliminar, setPagoAEliminar] = useState<PagoConDetalle | null>(null)
  const [eliminandoPago, setEliminandoPago] = useState(false)
  const [errorEliminarPago, setErrorEliminarPago] = useState<string | null>(null)

  const cantidadDiasLabel = formatearCantidadDias(
    alumnos.find((a) => a.id === alumnoId)?.cantidad_dias ?? null,
  )

  useEffect(() => {
    if (!alumnoId) {
      setCargos([])
      setPagos([])
      return
    }
    let active = true
    setLoading(true)
    Promise.all([listCargosByAlumno(alumnoId), listPagosByAlumno(alumnoId)]).then(
      ([cargosData, pagosData]) => {
        if (!active) return
        setCargos(cargosData)
        setPagos(pagosData)
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [alumnoId, reloadToken, localToken])

  async function handleEliminarPago() {
    if (!pagoAEliminar) return
    setEliminandoPago(true)
    setErrorEliminarPago(null)
    try {
      await deletePago(pagoAEliminar.id)
      setPagoAEliminar(null)
      setLocalToken((t) => t + 1)
    } catch {
      setErrorEliminarPago('No se pudo eliminar el pago. Probá de nuevo.')
    } finally {
      setEliminandoPago(false)
    }
  }

  const cargosColumns: DataTableColumn<Cargo>[] = [
    { header: 'Período', accessor: (c) => formatearPeriodo(c.periodo) },
    { header: 'Monto', accessor: (c) => formatearMonto(c.monto) },
    { header: 'Creado', accessor: (c) => formatearFecha(c.created_at) },
  ]
  if (rol === 'admin') {
    cargosColumns.push({
      header: '',
      accessor: (c) => (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setCargoAEditar(c)}
            aria-label={`Editar cargo del período ${formatearPeriodo(c.periodo)}`}
            className="shrink-0 text-text-secondary hover:text-text-primary"
          >
            <Edit2 size={14} />
          </button>
        </div>
      ),
      className: 'text-right',
    })
  }

  const pagosColumns: DataTableColumn<PagoConDetalle>[] = [
    { header: 'Fecha', accessor: (p) => formatearFecha(p.fecha_pago) },
    { header: 'Período', accessor: (p) => formatearPeriodo(p.periodo) },
    { header: 'Monto', accessor: (p) => formatearMonto(p.monto) },
    {
      header: 'Forma de pago',
      accessor: (p) => FORMA_PAGO_LABEL[p.forma_pago] ?? p.forma_pago,
    },
    { header: 'Parcial', accessor: (p) => (p.parcial ? 'Sí' : 'No') },
    {
      header: 'Estado',
      accessor: (p) =>
        p.validado_por ? (
          <div className="flex flex-col gap-0.5">
            <BadgeEstado estado="al_dia" label="Validado" />
            <span className="font-inter text-[11px] text-text-secondary">
              {p.validador?.nombre ?? '—'} · {p.validado_at ? formatearFecha(p.validado_at) : '—'}
            </span>
          </div>
        ) : (
          <BadgeEstado estado="pendiente" />
        ),
    },
  ]
  if (rol === 'admin') {
    pagosColumns.push({
      header: '',
      accessor: (p) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPagoAEditar(p)}
            aria-label={`Editar pago del ${formatearFecha(p.fecha_pago)}`}
            className="shrink-0 text-text-secondary hover:text-text-primary"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => setPagoAEliminar(p)}
            aria-label={`Eliminar pago del ${formatearFecha(p.fecha_pago)}`}
            className="shrink-0 text-estado-error-text hover:opacity-80"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
      className: 'text-right',
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <AlumnoSelect label="Alumno" alumnos={alumnos} value={alumnoId} onChange={onAlumnoChange} />

      {!alumnoId && (
        <p className="font-inter text-[13px] text-text-secondary">
          Elegí un alumno para ver su historial y estado de cuenta.
        </p>
      )}

      {alumnoId && (
        <>
          <div
            className={`rounded-b-[10px] rounded-t-none border border-t-4 border-border-subtle bg-bg-input p-3 ${
              estadoAlumno ? ESTADO_BAR_CLASS[estadoAlumno] : ''
            }`}
          >
            <EstadoCuentaCard
              key={`${alumnoId}-${reloadToken}-${localToken}`}
              alumnoId={alumnoId}
              onEstadoChange={setEstadoAlumno}
            />
          </div>

          {cantidadDiasLabel && (
            <p className="font-inter text-[13px] text-text-secondary">
              Cantidad de días: <span className="text-text-primary">{cantidadDiasLabel}</span>
            </p>
          )}

          <div>
            <p className="mb-2 font-montserrat text-[13px] font-bold text-text-primary">Cargos</p>
            <DataTable<Cargo>
              columns={cargosColumns}
              data={cargos}
              keyExtractor={(c) => c.id}
              loading={loading}
              emptyMessage="Sin cargos registrados."
            />
          </div>

          <div>
            <p className="mb-2 font-montserrat text-[13px] font-bold text-text-primary">Pagos</p>
            <DataTable<PagoConDetalle>
              columns={pagosColumns}
              data={pagos}
              keyExtractor={(p) => p.id}
              loading={loading}
              emptyMessage="Sin pagos registrados."
            />
            {errorEliminarPago && (
              <p className="mt-2 font-inter text-[11px] text-estado-error-text">{errorEliminarPago}</p>
            )}
          </div>
        </>
      )}

      <CargoFormDrawer
        open={Boolean(cargoAEditar)}
        alumnos={alumnos}
        disciplinas={disciplinas}
        cargo={cargoAEditar}
        onClose={() => setCargoAEditar(null)}
        onUpdated={() => {
          setCargoAEditar(null)
          setLocalToken((t) => t + 1)
        }}
      />

      <PagoFormDrawer
        open={Boolean(pagoAEditar)}
        alumnos={alumnos}
        disciplinas={disciplinas}
        profesores={profesores}
        pago={pagoAEditar}
        onClose={() => setPagoAEditar(null)}
        onUpdated={() => {
          setPagoAEditar(null)
          setLocalToken((t) => t + 1)
        }}
      />

      <ConfirmDialog
        open={Boolean(pagoAEliminar)}
        title="Eliminar pago"
        message={
          pagoAEliminar
            ? `¿Eliminar el pago de ${formatearMonto(pagoAEliminar.monto)} del ${formatearFecha(pagoAEliminar.fecha_pago)}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel={eliminandoPago ? 'Eliminando…' : 'Eliminar'}
        danger
        onConfirm={handleEliminarPago}
        onCancel={() => setPagoAEliminar(null)}
      />
    </div>
  )
}
