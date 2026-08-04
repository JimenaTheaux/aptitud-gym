import { useEffect, useState } from 'react'
import { BadgeEstado } from '../../components/ui/BadgeEstado'
import { getEstadoCuenta, type EstadoCuenta, type EstadoCuentaResultado } from '../../lib/estadoCuenta'
import { formatearMonto, formatearPeriodo } from '../../lib/formato'

// Solo el tag + el detalle — sin card ni borde propios. La card completa que
// contiene esto (check-in, historial, etc.) es la que lleva la barra superior
// de 4px con el color real del estado, vía onEstadoChange.
export function EstadoCuentaCard({
  alumnoId,
  onEstadoChange,
}: {
  alumnoId: string
  onEstadoChange?: (estado: EstadoCuenta | null) => void
}) {
  const [resultado, setResultado] = useState<EstadoCuentaResultado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    setResultado(null)

    getEstadoCuenta(alumnoId)
      .then((data) => {
        if (active) setResultado(data)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [alumnoId])

  useEffect(() => {
    onEstadoChange?.(resultado?.estado ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado])

  if (loading) {
    return (
      <p className="font-inter text-[12px] text-text-secondary">Consultando estado de cuenta…</p>
    )
  }

  if (error || !resultado) {
    return <BadgeEstado estado="error" label="No se pudo consultar el estado de cuenta" />
  }

  return (
    <div className="flex flex-col gap-1.5">
      {resultado.estado && <BadgeEstado estado={resultado.estado} />}
      {resultado.cargo ? (
        <p className="font-inter text-[11px] text-text-secondary">
          Período {formatearPeriodo(resultado.cargo.periodo)} · pagado {formatearMonto(resultado.totalPagado)}{' '}
          de {formatearMonto(resultado.cargo.monto)}
        </p>
      ) : (
        <p className="font-inter text-[11px] text-text-secondary">
          Sin cargo generado para este período todavía.
        </p>
      )}
    </div>
  )
}
