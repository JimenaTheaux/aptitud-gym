import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'react-feather'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Drawer({
  open,
  onClose,
  title,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  footer?: ReactNode
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Panel'}
        className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border-subtle bg-bg-card md:max-h-[88vh] md:w-full md:max-w-[640px] md:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-4 md:px-6 md:py-4">
          {title && (
            <h2 id={titleId} className="font-montserrat text-base font-bold text-text-primary">
              {title}
            </h2>
          )}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-cyan"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-scroll flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-border-subtle px-4 py-4 md:px-6 md:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
