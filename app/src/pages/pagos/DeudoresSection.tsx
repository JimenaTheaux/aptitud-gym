import { useEffect, useState } from 'react'
import { Eye, MessageCircle } from 'react-feather'
import { BadgeEstado } from '../../components/ui/BadgeEstado'
import { DataTable } from '../../components/ui/DataTable'
import { PinButton } from '../../components/ui/PinButton'
import { useAuth } from '../../contexts/AuthContext'
import { usePinnedRows } from '../../hooks/usePinnedRows'
import { getConfiguracionWhatsapp } from '../../lib/configuracion'
import { listDeudores, type Deudor } from '../../lib/pagos'
import { formatearMonto, formatearPeriodo } from '../../lib/formato'
import { aplicarPlantillaDeuda, linkWhatsapp, registrarWhatsappEnvio } from '../../lib/whatsapp'
import type { ConfiguracionWhatsapp } from '../../types/db'

export function DeudoresSection({
  reloadToken,
  onVerDetalle,
}: {
  reloadToken: number
  onVerDetalle: (alumnoId: string) => void
}) {
  const { perfil } = useAuth()
  const { habilitado: pinHabilitado, togglePin, estaFijado, limiteAlcanzado } = usePinnedRows('deudores')
  const [deudores, setDeudores] = useState<Deudor[]>([])
  const [loading, setLoading] = useState(true)
  const [configWhatsapp, setConfigWhatsapp] = useState<ConfiguracionWhatsapp | null>(null)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    listDeudores().then((data) => {
      if (!active) return
      setDeudores(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [reloadToken])

  useEffect(() => {
    let active = true
    getConfiguracionWhatsapp().then((data) => {
      if (active) setConfigWhatsapp(data)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleEnviarWhatsapp(deudor: Deudor) {
    if (!perfil || !deudor.alumno.celular || !configWhatsapp) return
    setError(null)
    setEnviandoId(deudor.alumno.id)
    const montoPendiente = Number(deudor.cargo.monto) - deudor.totalPagado
    const mensaje = aplicarPlantillaDeuda(configWhatsapp.mensaje_deudores, deudor.alumno, montoPendiente)
    try {
      window.open(linkWhatsapp(deudor.alumno.celular, mensaje), '_blank', 'noopener,noreferrer')
      await registrarWhatsappEnvio({
        alumno_id: deudor.alumno.id,
        plantilla_usada: mensaje,
        enviado_por: perfil.id,
      })
    } catch {
      setError('El link de WhatsApp se abrió, pero no se pudo guardar el registro del envío.')
    } finally {
      setEnviandoId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-inter text-[13px] text-text-secondary">
        Alumnos con cargo generado este período que todavía no están al día.
      </p>

      <DataTable<Deudor>
        columns={[
          {
            header: 'Alumno',
            accessor: (d) => `${d.alumno.apellido}, ${d.alumno.nombre}`,
          },
          { header: 'DNI', accessor: (d) => d.alumno.dni },
          { header: 'Período', accessor: (d) => formatearPeriodo(d.cargo.periodo) },
          { header: 'Estado', accessor: (d) => <BadgeEstado estado={d.estado} /> },
          {
            header: 'Pagado',
            accessor: (d) => `${formatearMonto(d.totalPagado)} de ${formatearMonto(d.cargo.monto)}`,
          },
          {
            header: '',
            accessor: (d) => (
              <div className="flex items-center justify-end gap-3">
                {pinHabilitado && (
                  <PinButton
                    fijado={estaFijado(d.alumno.id)}
                    disabled={!estaFijado(d.alumno.id) && limiteAlcanzado}
                    onClick={() => togglePin(d.alumno.id)}
                    label={`Fijar ${d.alumno.apellido}, ${d.alumno.nombre}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleEnviarWhatsapp(d)}
                  disabled={!d.alumno.celular || !configWhatsapp || enviandoId === d.alumno.id}
                  aria-label={`Enviar WhatsApp a ${d.alumno.apellido}, ${d.alumno.nombre}`}
                  title={d.alumno.celular ? undefined : 'Sin celular cargado'}
                  className="text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <MessageCircle size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onVerDetalle(d.alumno.id)}
                  className="flex items-center gap-1.5 rounded-[10px] border border-accent-cyan px-3 py-1.5 font-montserrat text-[12px] font-bold text-accent-cyan outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
                >
                  <Eye size={13} />
                  Ver detalle
                </button>
              </div>
            ),
            className: 'text-right',
          },
        ]}
        data={deudores}
        keyExtractor={(d) => d.alumno.id}
        loading={loading}
        tablaId="deudores"
        emptyMessage="No hay deudores este período."
      />

      {limiteAlcanzado && (
        <p className="font-inter text-[11px] text-text-secondary">Máximo 5 filas fijadas.</p>
      )}
      {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
    </div>
  )
}
