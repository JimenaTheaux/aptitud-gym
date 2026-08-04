import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Shield, User, Users } from 'react-feather'
import { useAuth } from '../../contexts/AuthContext'
import { FormField } from '../../components/ui/FormField'
import { Footer } from '../../components/layout/Footer'

type RoleTab = {
  key: 'admin' | 'profesor' | 'kiosco'
  label: string
  icon: typeof Shield
  hint: string
}

const ROLE_TABS: RoleTab[] = [
  { key: 'admin', label: 'Admin', icon: Shield, hint: 'Ingresá con tu usuario de administrador.' },
  { key: 'profesor', label: 'Profesor', icon: User, hint: 'Ingresá con el usuario compartido de profesores.' },
  { key: 'kiosco', label: 'Alumnos', icon: Users, hint: 'Ingresá con el usuario de la pantalla de check-in.' },
]

function RoleChip({
  tab,
  active,
  onClick,
}: {
  tab: RoleTab
  active: boolean
  onClick: () => void
}) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1.5 rounded-[10px] border px-3 py-3 font-montserrat text-[13px] font-bold transition-colors ${
        active
          ? 'border-accent-cyan bg-bg-input text-[#8FDBFF]'
          : 'border-border-subtle text-text-secondary'
      }`}
    >
      <Icon size={18} />
      {tab.label}
    </button>
  )
}

export function LoginPage() {
  const { session, perfil, signIn } = useAuth()
  const [roleTab, setRoleTab] = useState<RoleTab['key']>('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (session && perfil) {
    return <Navigate to="/" replace />
  }

  const activeTab = ROLE_TABS.find((tab) => tab.key === roleTab)!

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)
    if (signInError) {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-page px-4">
      <div className="flex flex-1 flex-col items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <img src="/icons/icon-192.png" alt="Aptitud Centro" className="h-24 w-24 rounded-2xl" />
          </div>

          <div className="rounded-2xl border border-border-subtle bg-bg-card p-5">
            <div className="mb-4 flex gap-2">
              {ROLE_TABS.map((tab) => (
                <RoleChip
                  key={tab.key}
                  tab={tab}
                  active={tab.key === roleTab}
                  onClick={() => setRoleTab(tab.key)}
                />
              ))}
            </div>

            <p className="mb-4 font-inter text-[13px] text-text-secondary">
              {activeTab.hint}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <FormField
                label="Email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <FormField
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {error && (
                <p className="font-inter text-[13px] text-estado-error-text">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 h-11 rounded-[10px] bg-accent-cyan font-montserrat text-[13px] font-bold text-text-on-accent disabled:opacity-60"
              >
                {submitting ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
