import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../contexts/AuthContext'
import { ResumenesSubnav } from './ResumenesSubnav'

// Placeholder — el contenido (ocupación de horarios por disciplina) se define
// en una iteración siguiente.
export function ResumenTurnos() {
  const { rol } = useAuth()
  if (rol !== 'admin') return <Navigate to="/resumenes" replace />

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <ResumenesSubnav />

        <div>
          <h1 className="font-montserrat text-xl font-extrabold text-text-primary">Turnos</h1>
          <p className="mt-1 font-inter text-[13px] text-text-secondary">
            Ocupación de horarios por disciplina.
          </p>
        </div>

        <p className="rounded-2xl border border-border-subtle bg-bg-card p-6 text-center font-inter text-[13px] text-text-secondary">
          Próximamente.
        </p>
      </div>
    </AppLayout>
  )
}
