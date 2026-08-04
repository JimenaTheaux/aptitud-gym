import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { ConfiguracionSubnav } from './ConfiguracionSubnav'
import { useAuth } from '../../contexts/AuthContext'
import { getConfiguracionWhatsapp, updateConfiguracionWhatsapp } from '../../lib/configuracion'

export function WhatsappConfigPage() {
  const { rol } = useAuth()
  const [mensajeDeudores, setMensajeDeudores] = useState('')
  const [mensajeBienvenida, setMensajeBienvenida] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    let active = true
    getConfiguracionWhatsapp().then((data) => {
      if (!active) return
      setMensajeDeudores(data.mensaje_deudores)
      setMensajeBienvenida(data.mensaje_bienvenida)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  if (rol !== 'admin') return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setGuardado(false)
    try {
      await updateConfiguracionWhatsapp({
        mensaje_deudores: mensajeDeudores,
        mensaje_bienvenida: mensajeBienvenida,
      })
      setGuardado(true)
    } catch {
      setError('No se pudo guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <ConfiguracionSubnav />

        <div>
          <h1 className="font-montserrat text-xl font-extrabold text-text-primary">WhatsApp</h1>
          <p className="mt-1 font-inter text-[13px] text-text-secondary">
            Plantillas de mensaje que se usan al enviar WhatsApp desde Alumnos y desde Pagos &gt; Deudores.
          </p>
        </div>

        {loading ? (
          <p className="font-inter text-[13px] text-text-secondary">Cargando…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="mensaje-bienvenida"
                className="font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary"
              >
                Mensaje de bienvenida (alumnos nuevos)
              </label>
              <textarea
                id="mensaje-bienvenida"
                value={mensajeBienvenida}
                onChange={(e) => setMensajeBienvenida(e.target.value)}
                rows={4}
                className="w-full rounded-[10px] border border-border-subtle bg-bg-input p-3 font-inter text-[13px] text-text-primary outline-none transition-colors focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan"
              />
              <p className="font-inter text-[11px] text-text-secondary">
                Se usa en el botón de WhatsApp del listado de Alumnos. Usá{' '}
                <span className="text-text-primary">{'{nombre}'}</span> — se reemplaza por el nombre del
                alumno. Incluí acá el link a la comunidad de WhatsApp.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="mensaje-deudores"
                className="font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary"
              >
                Mensaje de deudores
              </label>
              <textarea
                id="mensaje-deudores"
                value={mensajeDeudores}
                onChange={(e) => setMensajeDeudores(e.target.value)}
                rows={4}
                className="w-full rounded-[10px] border border-border-subtle bg-bg-input p-3 font-inter text-[13px] text-text-primary outline-none transition-colors focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan"
              />
              <p className="font-inter text-[11px] text-text-secondary">
                Se usa en el botón de WhatsApp de Pagos &gt; Deudores. Usá{' '}
                <span className="text-text-primary">{'{nombre}'}</span> y{' '}
                <span className="text-text-primary">{'{monto}'}</span> — se reemplazan por cada alumno al
                enviar.
              </p>
            </div>

            {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
            {guardado && !error && (
              <p className="font-inter text-[11px] text-estado-al-dia-text">Configuración guardada.</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-[10px] bg-accent-cyan px-6 font-montserrat text-[13px] font-bold text-text-on-accent outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60 xl:h-9 xl:self-start"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
