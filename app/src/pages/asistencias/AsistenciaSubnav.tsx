import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { path: '/asistencias', label: 'Alumnos' },
  { path: '/asistencias/profesores', label: 'Profesores' },
]

export function AsistenciaSubnav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-border-subtle">
      {TABS.map((t) => (
        <button
          key={t.path}
          type="button"
          onClick={() => navigate(t.path)}
          className={`shrink-0 border-b-2 px-3 py-2.5 font-inter text-[13px] font-medium transition-colors ${
            location.pathname === t.path
              ? 'border-accent-cyan text-accent-cyan'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
