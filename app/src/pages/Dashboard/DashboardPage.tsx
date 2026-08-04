import { useAuth } from '../../contexts/AuthContext'

// Placeholder de Fase 2 — el contenido real de cada módulo llega en fases siguientes.
export function DashboardPage() {
  const { perfil } = useAuth()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="font-montserrat text-xl font-extrabold text-text-primary">
          Hola, {perfil?.nombre}
        </h1>
        <p className="mt-1 font-inter text-[13px] text-text-secondary">
          Tablero de control. En desarrollo.
        </p>
      </div>
    </div>
  )
}
