import { useEffect, useState } from 'react'
import { Check, Edit2 } from 'react-feather'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { PinButton } from '../../components/ui/PinButton'
import { usePinnedRows } from '../../hooks/usePinnedRows'
import { listPagosPendientes, validarPago, type PagoPendienteConDetalle } from '../../lib/pagos'
import { formatearFecha, formatearMonto, formatearPeriodo } from '../../lib/formato'
import { PagoFormDrawer } from './PagoFormDrawer'
import type { Alumno, Disciplina, Profesor } from '../../types/db'

const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  combinado: 'Combinado',
}

export function PagosPendientesSection({
  reloadToken,
  alumnos,
  disciplinas,
  profesores,
  onValidated,
}: {
  reloadToken: number
  alumnos: Alumno[]
  disciplinas: Disciplina[]
  profesores: Profesor[]
  onValidated: () => void
}) {
  const { habilitado: pinHabilitado, togglePin, estaFijado, limiteAlcanzado } = usePinnedRows('pagos_pendientes')
  const [pagos, setPagos] = useState<PagoPendienteConDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [aValidar, setAValidar] = useState<PagoPendienteConDetalle | null>(null)
  const [validando, setValidando] = useState(false)
  const [aEditar, setAEditar] = useState<PagoPendienteConDetalle | null>(null)

  async function reload() {
    setLoading(true)
    const data = await listPagosPendientes()
    setPagos(data)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    listPagosPendientes().then((data) => {
      if (!active) return
      setPagos(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [reloadToken])

  async function handleValidar() {
    if (!aValidar) return
    setValidando(true)
    try {
      await validarPago(aValidar.id)
      setAValidar(null)
      await reload()
      onValidated()
    } finally {
      setValidando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-inter text-[13px] text-text-secondary">
        Pagos registrados por profesores, pendientes de validación.
      </p>

      <DataTable<PagoPendienteConDetalle>
        columns={[
          {
            header: 'Alumno',
            accessor: (p) => (p.alumno ? `${p.alumno.apellido}, ${p.alumno.nombre}` : '—'),
          },
          { header: 'DNI', accessor: (p) => p.alumno?.dni ?? '—' },
          { header: 'Período', accessor: (p) => formatearPeriodo(p.periodo) },
          { header: 'Monto', accessor: (p) => formatearMonto(p.monto) },
          { header: 'Forma de pago', accessor: (p) => FORMA_PAGO_LABEL[p.forma_pago] ?? p.forma_pago },
          { header: 'Registrado', accessor: (p) => formatearFecha(p.created_at) },
          {
            header: '',
            accessor: (p) => (
              <div className="flex items-center justify-end gap-2">
                {pinHabilitado && (
                  <PinButton
                    fijado={estaFijado(p.id)}
                    disabled={!estaFijado(p.id) && limiteAlcanzado}
                    onClick={() => togglePin(p.id)}
                    label={`Fijar pago de ${p.alumno ? `${p.alumno.apellido}, ${p.alumno.nombre}` : 'alumno'}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setAEditar(p)}
                  aria-label={`Editar pago de ${p.alumno ? `${p.alumno.apellido}, ${p.alumno.nombre}` : 'alumno'}`}
                  className="shrink-0 text-text-secondary hover:text-text-primary"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setAValidar(p)}
                  className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[10px] border border-accent-cyan px-2.5 py-1.5 font-montserrat text-[12px] font-bold text-accent-cyan outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
                >
                  <Check size={13} />
                  Validar
                </button>
              </div>
            ),
            className: 'text-right',
          },
        ]}
        data={pagos}
        keyExtractor={(p) => p.id}
        loading={loading}
        tablaId="pagos_pendientes"
        emptyMessage="No hay pagos pendientes de validación."
      />

      {limiteAlcanzado && (
        <p className="font-inter text-[11px] text-text-secondary">Máximo 5 filas fijadas.</p>
      )}

      <ConfirmDialog
        open={Boolean(aValidar)}
        title="Validar pago"
        message={
          aValidar
            ? `Confirmás validar el pago de ${formatearMonto(aValidar.monto)} de ${aValidar.alumno?.apellido}, ${aValidar.alumno?.nombre}?`
            : ''
        }
        confirmLabel={validando ? 'Validando…' : 'Validar'}
        onConfirm={handleValidar}
        onCancel={() => setAValidar(null)}
      />

      <PagoFormDrawer
        open={Boolean(aEditar)}
        alumnos={alumnos}
        disciplinas={disciplinas}
        profesores={profesores}
        pago={aEditar}
        onClose={() => setAEditar(null)}
        onUpdated={() => {
          setAEditar(null)
          reload()
        }}
      />
    </div>
  )
}
