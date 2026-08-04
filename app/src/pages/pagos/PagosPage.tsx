import { useEffect, useState } from 'react'
import { CreditCard, Users } from 'react-feather'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../contexts/AuthContext'
import { listAlumnos } from '../../lib/alumnos'
import { listDisciplinas } from '../../lib/disciplinas'
import { listProfesores } from '../../lib/profesores'
import { CargoFormDrawer } from './CargoFormDrawer'
import { PagoFormDrawer } from './PagoFormDrawer'
import { PagosPendientesSection } from './PagosPendientesSection'
import { SinCargoSection } from './SinCargoSection'
import { DeudoresSection } from './DeudoresSection'
import { HistorialAlumnoSection } from './HistorialAlumnoSection'
import { HistorialPagosSection } from './HistorialPagosSection'
import type { Alumno, Disciplina, Profesor } from '../../types/db'

type Tab = 'historial' | 'historial_completo' | 'pendientes' | 'sin_cargo' | 'deudores'

export function PagosPage() {
  const { rol } = useAuth()
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [tab, setTab] = useState<Tab>('historial')
  const [cargoDrawerOpen, setCargoDrawerOpen] = useState(false)
  const [cargoAlumnoId, setCargoAlumnoId] = useState<string | null>(null)
  const [pagoDrawerOpen, setPagoDrawerOpen] = useState(false)
  const [historialAlumnoId, setHistorialAlumnoId] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([listAlumnos(), listDisciplinas(), listProfesores()]).then(
      ([alumnosData, disciplinasData, profesoresData]) => {
        if (!active) return
        setAlumnos(alumnosData)
        setDisciplinas(disciplinasData)
        setProfesores(profesoresData)
      },
    )
    return () => {
      active = false
    }
  }, [])

  if (rol === 'kiosco') return <Navigate to="/" replace />

  function verAlumnoEnHistorial(alumnoId: string) {
    setHistorialAlumnoId(alumnoId)
    setTab('historial')
    setReloadToken((t) => t + 1)
  }

  function handleAgregarCargo(alumnoId: string) {
    setCargoAlumnoId(alumnoId)
    setCargoDrawerOpen(true)
  }

  const TABS: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: 'historial_completo', label: 'Historial de pagos', adminOnly: true },
    { id: 'pendientes', label: 'Pendientes de validar', adminOnly: true },
    { id: 'sin_cargo', label: 'Sin cargo generado', adminOnly: true },
    { id: 'deudores', label: 'Deudores', adminOnly: true },
    { id: 'historial', label: 'Historial y estado de cuenta' },
  ]
  const tabsVisibles = TABS.filter((t) => !t.adminOnly || rol === 'admin')

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-montserrat text-xl font-extrabold text-text-primary">Pagos</h1>
            <p className="mt-1 font-inter text-[13px] text-text-secondary">
              Cargos, pagos y estado de cuenta de los alumnos.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPagoDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-[10px] bg-accent-cyan px-4 py-2 font-montserrat text-[13px] font-bold text-text-on-accent"
            >
              <CreditCard size={14} />
              Registrar pago
            </button>
          </div>
        </div>

        {tabsVisibles.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-border-subtle">
            {tabsVisibles.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 border-b-2 px-3 py-2.5 font-inter text-[13px] font-medium transition-colors ${
                  tab === t.id
                    ? 'border-accent-cyan text-accent-cyan'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'historial' && (
          <HistorialAlumnoSection
            alumnos={alumnos}
            alumnoId={historialAlumnoId}
            reloadToken={reloadToken}
            onAlumnoChange={setHistorialAlumnoId}
          />
        )}

        {tab === 'historial_completo' && rol === 'admin' && (
          <HistorialPagosSection reloadToken={reloadToken} />
        )}

        {tab === 'pendientes' && rol === 'admin' && (
          <PagosPendientesSection
            reloadToken={reloadToken}
            onValidated={() => setReloadToken((t) => t + 1)}
          />
        )}

        {tab === 'sin_cargo' && rol === 'admin' && (
          <SinCargoSection reloadToken={reloadToken} onAgregarCargo={handleAgregarCargo} />
        )}

        {tab === 'deudores' && rol === 'admin' && (
          <DeudoresSection reloadToken={reloadToken} onVerDetalle={verAlumnoEnHistorial} />
        )}

        {alumnos.length === 0 && (
          <p className="flex items-center gap-1.5 font-inter text-[12px] text-text-secondary">
            <Users size={13} />
            Todavía no hay alumnos registrados.
          </p>
        )}
      </div>

      <CargoFormDrawer
        open={cargoDrawerOpen}
        alumnos={alumnos}
        disciplinas={disciplinas}
        alumnoPreseleccionado={cargoAlumnoId}
        onClose={() => setCargoDrawerOpen(false)}
        onCreated={() => {
          setCargoDrawerOpen(false)
          setReloadToken((t) => t + 1)
        }}
      />

      <PagoFormDrawer
        open={pagoDrawerOpen}
        alumnos={alumnos}
        disciplinas={disciplinas}
        profesores={profesores}
        onClose={() => setPagoDrawerOpen(false)}
        onCreated={(pago) => {
          setPagoDrawerOpen(false)
          verAlumnoEnHistorial(pago.alumno_id)
        }}
      />
    </AppLayout>
  )
}
