import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function FullScreenState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4">
      <div className="max-w-sm text-center font-inter text-[13px] text-text-secondary">
        {children}
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const { session, perfil, loading, signOut } = useAuth()

  if (loading) {
    return (
      <FullScreenState>
        <span className="font-montserrat text-sm font-bold text-text-primary">
          Cargando…
        </span>
      </FullScreenState>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!perfil) {
    return (
      <FullScreenState>
        <p className="font-montserrat text-base font-bold text-text-primary">
          Sin perfil asignado
        </p>
        <p className="mt-2">
          Tu usuario no tiene un perfil (rol) configurado en el sistema.
          Contactá a administración.
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-4 rounded-lg border border-border-subtle px-4 py-2 font-montserrat text-[13px] font-bold text-text-secondary"
        >
          Cerrar sesión
        </button>
      </FullScreenState>
    )
  }

  return <Outlet />
}
