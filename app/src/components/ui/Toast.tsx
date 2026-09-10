import { useEffect } from 'react'
import { CheckCircle, XCircle } from 'react-feather'

export type ToastTipo = 'success' | 'error'

export function Toast({
  mensaje,
  tipo = 'success',
  onClose,
  duracionMs = 3000,
}: {
  mensaje: string | null
  tipo?: ToastTipo
  onClose: () => void
  duracionMs?: number
}) {
  useEffect(() => {
    if (!mensaje) return
    const timer = setTimeout(onClose, duracionMs)
    return () => clearTimeout(timer)
  }, [mensaje, duracionMs, onClose])

  if (!mensaje) return null

  const Icon = tipo === 'success' ? CheckCircle : XCircle

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        role="status"
        className={`pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2.5 font-inter text-[13px] font-semibold shadow-lg ${
          tipo === 'success'
            ? 'border-estado-al-dia-bar bg-estado-al-dia-bg text-estado-al-dia-text'
            : 'border-estado-deuda-bar bg-estado-deuda-bg text-estado-deuda-text'
        }`}
      >
        <Icon size={15} />
        {mensaje}
      </div>
    </div>
  )
}
