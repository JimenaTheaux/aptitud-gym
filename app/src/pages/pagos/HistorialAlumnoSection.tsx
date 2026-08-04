import { useEffect, useState } from 'react'
import { AlumnoSelect } from '../../components/ui/AlumnoSelect'
import { BadgeEstado, ESTADO_BAR_CLASS } from '../../components/ui/BadgeEstado'
import { DataTable } from '../../components/ui/DataTable'
import { EstadoCuentaCard } from '../Checkin/EstadoCuentaCard'
import { listCargosByAlumno } from '../../lib/cargos'
import { listPagosByAlumno, type PagoConDetalle } from '../../lib/pagos'
import { formatearFecha, formatearMonto, formatearPeriodo } from '../../lib/formato'
import type { EstadoCuenta } from '../../lib/estadoCuenta'
import type { Alumno, Cargo } from '../../types/db'

const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  combinado: 'Combinado',
}

export function HistorialAlumnoSection({
  alumnos,
  alumnoId,
  reloadToken,
  onAlumnoChange,
}: {
  alumnos: Alumno[]
  alumnoId: string
  reloadToken: number
  onAlumnoChange: (alumnoId: string) => void
}) {
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [pagos, setPagos] = useState<PagoConDetalle[]>([])
  const [loading, setLoading] = useState(false)
  const [estadoAlumno, setEstadoAlumno] = useState<EstadoCuenta | null>(null)

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
  }, [alumnoId, reloadToken])

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
            <EstadoCuentaCard alumnoId={alumnoId} onEstadoChange={setEstadoAlumno} />
          </div>

          <div>
            <p className="mb-2 font-montserrat text-[13px] font-bold text-text-primary">Cargos</p>
            <DataTable<Cargo>
              columns={[
                { header: 'Período', accessor: (c) => formatearPeriodo(c.periodo) },
                { header: 'Monto', accessor: (c) => formatearMonto(c.monto) },
                { header: 'Creado', accessor: (c) => formatearFecha(c.created_at) },
              ]}
              data={cargos}
              keyExtractor={(c) => c.id}
              loading={loading}
              emptyMessage="Sin cargos registrados."
            />
          </div>

          <div>
            <p className="mb-2 font-montserrat text-[13px] font-bold text-text-primary">Pagos</p>
            <DataTable<PagoConDetalle>
              columns={[
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
              ]}
              data={pagos}
              keyExtractor={(p) => p.id}
              loading={loading}
              emptyMessage="Sin pagos registrados."
            />
          </div>
        </>
      )}
    </div>
  )
}
