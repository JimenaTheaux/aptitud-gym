import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Footer } from '../components/layout/Footer'
import { BadgeEstado, ESTADO_BAR_CLASS } from '../components/ui/BadgeEstado'
import { Drawer } from '../components/ui/Drawer'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FormField } from '../components/ui/FormField'

type EstadoConBarra = 'al_dia' | 'pendiente' | 'deuda'

// Un ejemplo de card por estado — cada barra superior toma el color real del
// estado (doc 08). Antes acá había una sola card con la barra fija en
// accent-cyan sin importar qué badge mostraba: ese era el bug.
const ESTADOS_DEMO: { estado: EstadoConBarra; nombre: string; detalle: string }[] = [
  { estado: 'al_dia', nombre: 'Juana Pérez', detalle: 'Pagó $15.000 de $15.000' },
  { estado: 'pendiente', nombre: 'Martín Gómez', detalle: 'Pagó $8.000 de $15.000' },
  { estado: 'deuda', nombre: 'Lucía Fernández', detalle: 'Sin pagos este período' },
]

function CheckinDemo({ onVolver }: { onVolver: () => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-page p-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="font-montserrat text-lg font-extrabold text-text-primary">
          Pantalla de check-in (footer prominent)
        </p>
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg border border-border-subtle px-4 py-2 font-montserrat text-[13px] font-bold text-text-secondary"
        >
          Volver
        </button>
      </div>
      <Footer prominent />
    </div>
  )
}

export function StyleGuidePage() {
  const [vista, setVista] = useState<'app' | 'checkin'>('app')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (vista === 'checkin') {
    return <CheckinDemo onVolver={() => setVista('app')} />
  }

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div>
          <h1 className="font-montserrat text-xl font-extrabold text-text-primary">
            Fase 1 — Identidad visual
          </h1>
          <p className="mt-1 font-inter text-[13px] text-text-secondary">
            Tokens, tipografía y componentes base de Aptitud Centro.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-montserrat text-base font-bold text-text-primary">
            Estados de cuenta
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ESTADOS_DEMO.map((demo) => (
              <div
                key={demo.estado}
                className={`rounded-b-2xl rounded-t-none border border-t-4 border-border-subtle bg-bg-card p-4 ${ESTADO_BAR_CLASS[demo.estado]}`}
              >
                <h3 className="font-montserrat text-[14px] font-bold text-text-primary">
                  {demo.nombre}
                </h3>
                <p className="mb-2 font-inter text-[12px] text-text-secondary">{demo.detalle}</p>
                <BadgeEstado estado={demo.estado} />
              </div>
            ))}
          </div>
          <p className="mt-3 font-inter text-[12px] text-text-secondary">
            <BadgeEstado estado="error" label="Error al guardar" /> — sin barra superior: no es un
            estado de cuenta, es una falla de carga.
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-bg-card p-5">
          <h2 className="mb-3 font-montserrat text-base font-bold text-text-primary">
            Formulario de ejemplo
          </h2>
          <div className="flex max-w-sm flex-col gap-4">
            <FormField label="Nombre y apellido" placeholder="Juana Pérez" required />
            <FormField
              label="DNI"
              placeholder="30123456"
              error="Campo obligatorio"
              required
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-[10px] bg-accent-cyan px-4 py-2 font-montserrat text-[13px] font-bold text-text-on-accent"
          >
            Abrir drawer
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-[10px] border border-border-subtle px-4 py-2 font-montserrat text-[13px] font-bold text-text-secondary"
          >
            Abrir confirm dialog
          </button>
          <button
            type="button"
            onClick={() => setVista('checkin')}
            className="rounded-[10px] border border-border-subtle px-4 py-2 font-montserrat text-[13px] font-bold text-text-secondary"
          >
            Ver footer prominent
          </button>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Detalle"
      >
        <p className="font-inter text-[13px] text-text-secondary">
          Contenido de ejemplo del Drawer.
        </p>
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Confirmar acción?"
        message="Esto es un ejemplo de ConfirmDialog reutilizable."
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </AppLayout>
  )
}
