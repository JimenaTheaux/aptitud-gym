import { useEffect, type ComponentType, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  CheckSquare,
  Users,
  CreditCard,
  BarChart2,
  Settings,
  LogOut,
  MapPin,
} from 'react-feather'
import { Footer } from './Footer'
import { SucursalFilter } from '../ui/SucursalFilter'
import { useAuth } from '../../contexts/AuthContext'
import { useSucursal } from '../../contexts/SucursalContext'

type NavItem = {
  label: string
  icon: ComponentType<{ size?: number }>
  path?: string
  // Prefijo para marcar el item activo cuando tiene submenús (ej. Configuración
  // agrupa /configuracion/disciplinas y /configuracion/profesores).
  activePrefix?: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', icon: Home, path: '/' },
  // Submenús (admin): Alumnos (/asistencias) y Profesores (/asistencias/profesores).
  { label: 'Asistencia', icon: CheckSquare, path: '/asistencias', activePrefix: '/asistencias' },
  { label: 'Alumnos', icon: Users, path: '/alumnos' },
  { label: 'Pagos', icon: CreditCard, path: '/pagos' },
  // Submenús (admin): Profesores (/resumenes/profesores) y Turnos (/resumenes/turnos).
  { label: 'Resúmenes', icon: BarChart2, path: '/resumenes', activePrefix: '/resumenes' },
  // Submenús (admin): Disciplinas, Profesores y WhatsApp (mensajes de deudores
  // y bienvenida) — ver ConfiguracionSubnav.
  {
    label: 'Configuración',
    icon: Settings,
    path: '/configuracion/disciplinas',
    activePrefix: '/configuracion',
    adminOnly: true,
  },
]

function TopNavLink({
  item,
  active,
  disabled,
  onClick,
}: {
  item: NavItem
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 font-inter text-[13px] font-medium transition-colors ${
        disabled
          ? 'cursor-not-allowed border-transparent text-text-muted opacity-50'
          : active
            ? 'border-accent-cyan text-accent-cyan'
            : 'border-transparent text-text-secondary hover:text-text-primary'
      }`}
    >
      <Icon size={16} />
      {item.label}
    </button>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { perfil, signOut } = useAuth()
  const { sucursales, sucursalId, setSucursalId, loadingSucursales } = useSucursal()
  const navigate = useNavigate()
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || perfil?.rol === 'admin')

  const sucursalesActivas = sucursales.filter((s) => s.activa)
  const mostrarFiltroSucursal = perfil?.rol === 'admin' && !loadingSucursales && sucursales.length > 0
  const filtroSucursalDeshabilitado = sucursalesActivas.length <= 1

  // Fase 1: una sola sucursal operativa — se ve el filtro (para no esconder la
  // UI final) pero deshabilitado, fijo en la única sucursal activa. Se habilita
  // solo cuando haya más de una sucursal activa (ver doc 02).
  // No se limita a admin: profesor también necesita sucursalId en contexto
  // para que quede registrado al crear un pago (mismo criterio que asistencias).
  useEffect(() => {
    const activas = sucursales.filter((s) => s.activa)
    if (!loadingSucursales && sucursalId === null && activas.length === 1) {
      setSucursalId(activas[0].id)
    }
  }, [loadingSucursales, sucursalId, sucursales, setSucursalId])

  return (
    <div className="flex min-h-screen flex-col bg-bg-page">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle bg-bg-card px-4 md:px-6">
        {/* Scrollea horizontal en vez de wrappear: el header tiene alto fijo
            (h-14) y el nav de abajo depende de ese alto exacto (sticky top-14),
            así que el contenido nunca puede crecer en alto sin romper esa cuenta. */}
        <div className="drawer-scroll flex flex-1 items-center gap-2 overflow-x-auto">
          <img src="/icons/icon-192.png" alt="" className="h-7 w-7 shrink-0 rounded-md" />
          <span className="shrink-0 font-montserrat text-base font-extrabold tracking-tight text-text-primary md:text-lg">
            Aptitud Centro
          </span>

          {mostrarFiltroSucursal && (
            <div className="ml-2 flex shrink-0 items-center gap-2">
              <MapPin size={14} className="shrink-0 text-text-secondary" />
              <SucursalFilter disabled={filtroSucursalDeshabilitado} />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          aria-label="Cerrar sesión"
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary"
        >
          <LogOut size={16} />
        </button>
      </header>

      <nav className="sticky top-14 z-30 flex overflow-x-auto border-b border-border-subtle bg-bg-card px-2 md:px-6">
        {visibleItems.map((item) => (
          <TopNavLink
            key={item.label}
            item={item}
            active={!!item.path && location.pathname.startsWith(item.activePrefix ?? item.path)}
            disabled={!item.path}
            onClick={() => item.path && navigate(item.path)}
          />
        ))}
      </nav>

      <main className="flex-1 px-4 pb-8 pt-4 md:px-6 md:pt-6">{children}</main>

      <Footer />
    </div>
  )
}
