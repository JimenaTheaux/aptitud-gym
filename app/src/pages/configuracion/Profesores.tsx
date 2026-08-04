import { useEffect, useState, type FormEvent } from 'react'
import { Edit2, Plus } from 'react-feather'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { ConfiguracionSubnav } from './ConfiguracionSubnav'
import { DataTable } from '../../components/ui/DataTable'
import { Drawer } from '../../components/ui/Drawer'
import { FormField } from '../../components/ui/FormField'
import { useAuth } from '../../contexts/AuthContext'
import { createProfesor, listProfesores, updateProfesor } from '../../lib/profesores'
import type { Profesor } from '../../types/db'

const FORM_ID = 'profesor-form'

type DrawerState = { mode: 'new' } | { mode: 'edit'; profesor: Profesor } | null

function ProfesorDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState
  onClose: () => void
  onSaved: () => void
}) {
  const editing = state?.mode === 'edit' ? state.profesor : null

  const [nombre, setNombre] = useState('')
  const [activo, setActivo] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNombre(editing?.nombre ?? '')
    setActivo(editing?.activo ?? true)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!state) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = { nombre: nombre.trim(), activo }
      if (editing) {
        await updateProfesor(editing.id, payload)
      } else {
        await createProfesor(payload)
      }
      onSaved()
    } catch {
      setError('No se pudo guardar el profesor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? 'Editar profesor' : 'Nuevo profesor'}
      footer={
        <button
          type="submit"
          form={FORM_ID}
          disabled={saving}
          className="h-11 w-full rounded-[10px] bg-accent-cyan font-montserrat text-[13px] font-bold text-text-on-accent outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60 xl:h-9"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre y apellido"
          required
        />

        <label className="flex items-center gap-2 font-inter text-[13px] text-text-primary">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="h-4 w-4 rounded accent-accent-cyan outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
          />
          Profesor activo
        </label>

        {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
      </form>
    </Drawer>
  )
}

export function ProfesoresPage() {
  const { rol } = useAuth()
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerState, setDrawerState] = useState<DrawerState>(null)

  async function cargarProfesores() {
    const data = await listProfesores()
    setProfesores(data)
  }

  useEffect(() => {
    let active = true
    listProfesores().then((data) => {
      if (!active) return
      setProfesores(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  if (rol !== 'admin') return <Navigate to="/" replace />

  async function handleSaved() {
    setDrawerState(null)
    await cargarProfesores()
  }

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <ConfiguracionSubnav />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-montserrat text-xl font-extrabold text-text-primary">
              Profesores
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setDrawerState({ mode: 'new' })}
            className="flex items-center gap-1.5 rounded-[10px] bg-accent-cyan px-4 py-2 font-montserrat text-[13px] font-bold text-text-on-accent"
          >
            <Plus size={14} />
            Nuevo profesor
          </button>
        </div>

        <DataTable<Profesor>
          columns={[
            { header: 'Nombre', accessor: (p) => p.nombre },
            {
              header: 'Estado',
              accessor: (p) =>
                p.activo ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-estado-al-dia-bg px-2.5 py-1 font-inter text-[11px] font-semibold text-estado-al-dia-text">
                    <span className="text-[8px] leading-none">●</span>
                    Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-1 font-inter text-[11px] font-semibold text-text-secondary">
                    Inactivo
                  </span>
                ),
            },
            {
              header: '',
              accessor: (p) => (
                <button
                  type="button"
                  onClick={() => setDrawerState({ mode: 'edit', profesor: p })}
                  aria-label="Editar profesor"
                  className="text-text-secondary hover:text-text-primary"
                >
                  <Edit2 size={14} />
                </button>
              ),
              className: 'text-right',
            },
          ]}
          data={profesores}
          keyExtractor={(p) => p.id}
          loading={loading}
          emptyMessage="Todavía no hay profesores cargados."
        />
      </div>

      <ProfesorDrawer state={drawerState} onClose={() => setDrawerState(null)} onSaved={handleSaved} />
    </AppLayout>
  )
}
