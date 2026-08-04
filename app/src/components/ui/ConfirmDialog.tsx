export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-[380px] rounded-2xl border border-border-subtle bg-bg-card p-5">
        <h2 className="font-montserrat text-base font-bold text-text-primary">
          {title}
        </h2>
        <p className="mt-2 font-inter text-[13px] text-text-secondary">
          {message}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border-subtle px-4 py-2 font-montserrat text-[13px] font-bold text-text-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 font-montserrat text-[13px] font-bold ${
              danger
                ? 'bg-transparent text-estado-error-text ring-1 ring-inset ring-estado-error-text'
                : 'bg-accent-cyan text-text-on-accent'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
