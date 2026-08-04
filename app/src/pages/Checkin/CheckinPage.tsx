import { useEffect, useState } from 'react'
import { ChevronLeft, LogOut, UserPlus } from 'react-feather'
import { useAuth } from '../../contexts/AuthContext'
import { useSucursal } from '../../contexts/SucursalContext'
import { Drawer } from '../../components/ui/Drawer'
import { ESTADO_BAR_CLASS } from '../../components/ui/BadgeEstado'
import { Footer } from '../../components/layout/Footer'
import { AltaAlumnoForm } from '../alumnos/AltaAlumnoForm'
import { BuscarAlumnoPanel } from './BuscarAlumnoPanel'
import { EstadoCuentaCard } from './EstadoCuentaCard'
import { MarcarAsistenciaStep } from './MarcarAsistenciaStep'
import { formatearHora } from '../../lib/formato'
import type { EstadoCuenta } from '../../lib/estadoCuenta'
import type { Alumno, Asistencia } from '../../types/db'

// Kiosco de uso continuo: tras confirmar, la pantalla vuelve sola a la búsqueda
// para el siguiente alumno, sin depender de que alguien toque un botón.
const AUTO_RESET_MS = 3000

export function CheckinPage() {
  const { signOut } = useAuth()
  const {
    sucursales,
    loadingSucursales,
    errorSucursales,
    reloadSucursales,
    sucursalId,
    setSucursalId,
  } = useSucursal()
  const [altaOpen, setAltaOpen] = useState(false)
  const [dniSinRegistrar, setDniSinRegistrar] = useState('')
  const [alumnoActivo, setAlumnoActivo] = useState<Alumno | null>(null)
  const [asistenciaMarcada, setAsistenciaMarcada] = useState<Asistencia | null>(null)
  const [estadoActivo, setEstadoActivo] = useState<EstadoCuenta | null>(null)

  const sucursalActual = sucursales.find((s) => s.id === sucursalId) ?? null
  const pedirSucursal = !sucursalActual

  useEffect(() => {
    if (!asistenciaMarcada) return
    const timeout = setTimeout(() => {
      setAlumnoActivo(null)
      setAsistenciaMarcada(null)
      setEstadoActivo(null)
    }, AUTO_RESET_MS)
    return () => clearTimeout(timeout)
  }, [asistenciaMarcada])

  function handleAbrirAlta(dni = '') {
    setDniSinRegistrar(dni)
    setAltaOpen(true)
  }

  function handleAltaCreada(alumno: Alumno) {
    setAltaOpen(false)
    setDniSinRegistrar('')
    setAlumnoActivo(alumno)
    setAsistenciaMarcada(null)
  }

  function handleEncontrado(alumno: Alumno) {
    setAlumnoActivo(alumno)
    setAsistenciaMarcada(null)
  }

  function handleVolver() {
    setAlumnoActivo(null)
    setAsistenciaMarcada(null)
    setEstadoActivo(null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-page p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="font-montserrat text-[15px] font-extrabold text-text-primary">
            Aptitud
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAbrirAlta()}
            className="flex items-center gap-1.5 rounded-[10px] bg-accent-cyan px-3 py-2 font-montserrat text-[13px] font-bold text-text-on-accent"
          >
            <UserPlus size={16} />
            ¿Primera vez?
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            aria-label="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-4xl flex-1 grid-cols-1 gap-4 py-6 lg:grid-cols-[1.1fr_1fr]">
        <BuscarAlumnoPanel
          onEncontrado={handleEncontrado}
          onNoEncontrado={handleAbrirAlta}
          onLimpiar={handleVolver}
        />

        <div
          className={`flex flex-1 flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-card p-5 ${
            alumnoActivo && estadoActivo ? `rounded-t-none border-t-4 ${ESTADO_BAR_CLASS[estadoActivo]}` : ''
          }`}
        >
          {!alumnoActivo && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <p className="font-montserrat text-[13px] font-bold text-text-primary">
                Buscá un alumno para empezar
              </p>
              <p className="max-w-[220px] font-inter text-[12px] text-text-secondary">
                Por DNI o por nombre, en el panel de la izquierda.
              </p>
            </div>
          )}

          {alumnoActivo && (
            <>
              <button
                type="button"
                onClick={handleVolver}
                className="flex items-center gap-1 self-start font-inter text-[11px] text-text-secondary hover:text-text-primary"
              >
                <ChevronLeft size={14} />
                Buscar otro alumno
              </button>

              <div>
                <p className="font-montserrat text-base font-extrabold text-text-primary">
                  {alumnoActivo.apellido}, {alumnoActivo.nombre}
                </p>
                <p className="font-inter text-[12px] text-text-secondary">
                  DNI {alumnoActivo.dni}
                </p>
              </div>

              <EstadoCuentaCard alumnoId={alumnoActivo.id} onEstadoChange={setEstadoActivo} />

              <div className="h-px bg-border-subtle" />

              {!asistenciaMarcada && sucursalId && (
                <MarcarAsistenciaStep
                  alumnoId={alumnoActivo.id}
                  sucursalId={sucursalId}
                  onDone={setAsistenciaMarcada}
                />
              )}

              {asistenciaMarcada && (
                <div className="rounded-[10px] border border-border-subtle bg-bg-input p-4">
                  <p className="font-montserrat text-[13px] font-bold text-text-primary">
                    ¡Listo, {alumnoActivo.nombre}!
                  </p>
                  <p className="mt-1 font-inter text-[12px] text-text-secondary">
                    Asistencia registrada a las {formatearHora(asistenciaMarcada.hora)}.
                  </p>
                  <p className="mt-2 font-inter text-[11px] text-text-secondary">
                    Volviendo a la búsqueda para el siguiente alumno…
                  </p>
                  <button
                    type="button"
                    onClick={handleVolver}
                    className="mt-1 font-inter text-[11px] text-accent-cyan"
                  >
                    Ir ahora
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {sucursalActual && (
        <button
          type="button"
          onClick={() => setSucursalId(null)}
          className="mx-auto mt-2 rounded-full border border-border-subtle px-3 py-1 font-inter text-[11px] text-text-secondary"
        >
          Sucursal: {sucursalActual.nombre} · cambiar
        </button>
      )}

      <Footer prominent />

      <Drawer open={pedirSucursal} onClose={() => {}} title="¿Qué sucursal es esta?">
        {loadingSucursales ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
            <div className="h-12 animate-pulse rounded-[10px] bg-bg-input" />
            <div className="h-12 animate-pulse rounded-[10px] bg-bg-input" />
          </div>
        ) : errorSucursales ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="font-inter text-[13px] text-estado-error-text">
              No se pudieron cargar las sucursales. Revisá la conexión e intentá de nuevo.
            </p>
            <button
              type="button"
              onClick={reloadSucursales}
              className="rounded-[10px] bg-accent-cyan px-4 py-2 font-montserrat text-[13px] font-bold text-text-on-accent"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sucursales.map((sucursal) => (
              <button
                key={sucursal.id}
                type="button"
                onClick={() => setSucursalId(sucursal.id)}
                className="rounded-[10px] border border-border-subtle bg-bg-input px-4 py-3 text-left font-montserrat text-[13px] font-bold text-text-primary hover:border-accent-cyan"
              >
                {sucursal.nombre}
              </button>
            ))}
          </div>
        )}
      </Drawer>

      <AltaAlumnoForm
        open={altaOpen}
        mode="kiosco"
        initialDni={dniSinRegistrar}
        onCreated={handleAltaCreada}
        onClose={() => setAltaOpen(false)}
      />
    </div>
  )
}
