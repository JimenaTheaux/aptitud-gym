import { useEffect, useState, type FormEvent } from 'react'
import { Edit2, Plus, Trash2 } from 'react-feather'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { ConfiguracionSubnav } from './ConfiguracionSubnav'
import { DataTable } from '../../components/ui/DataTable'
import { Drawer } from '../../components/ui/Drawer'
import { FormField } from '../../components/ui/FormField'
import { SelectField } from '../../components/ui/SelectField'
import { TimeField } from '../../components/ui/TimeField'
import { useAuth } from '../../contexts/AuthContext'
import { useSucursal } from '../../contexts/SucursalContext'
import {
  createDisciplina,
  listDisciplinas,
  updateDisciplina,
} from '../../lib/disciplinas'
import {
  createHorario,
  deleteHorario,
  listHorariosByDisciplina,
} from '../../lib/horariosDisciplina'
import { formatearHora } from '../../lib/formato'
import type { Disciplina, HorarioDisciplina, Sucursal } from '../../types/db'

// Horario tal como vive en el form antes de guardar: los ya existentes en DB
// conservan su id real, los agregados en esta sesión de edición son locales
// (esNuevo) hasta que se confirma todo junto con "Guardar".
type HorarioLocal = {
  id: string
  esNuevo: boolean
  hora_inicio: string
}

function HorariosEditor({
  horarios,
  onAgregar,
  onQuitar,
}: {
  horarios: HorarioLocal[]
  onAgregar: (horaInicio: string) => void
  onQuitar: (id: string) => void
}) {
  const [horaInicio, setHoraInicio] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ordenados = [...horarios].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

  function handleAgregarClick() {
    if (!horaInicio) {
      setError('Completá la hora de inicio.')
      return
    }
    setError(null)
    onAgregar(horaInicio)
    setHoraInicio('')
  }

  return (
    <div className="mt-5 border-t border-border-subtle pt-4">
      <h3 className="mb-3 font-montserrat text-[13px] font-bold text-text-primary">
        Horarios
      </h3>

      {ordenados.length === 0 ? (
        <p className="mb-3 font-inter text-[13px] text-text-secondary">
          Todavía no agregaste horarios.
        </p>
      ) : (
        <ul className="mb-3 flex flex-wrap gap-2">
          {ordenados.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-2 rounded-full border border-border-subtle bg-bg-input py-1.5 pl-3 pr-2 font-inter text-[13px] text-text-primary"
            >
              {formatearHora(h.hora_inicio)}
              <button
                type="button"
                onClick={() => onQuitar(h.id)}
                aria-label={`Quitar horario ${formatearHora(h.hora_inicio)}`}
                className="rounded text-text-secondary outline-none hover:text-estado-error-text focus-visible:ring-2 focus-visible:ring-accent-cyan"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <TimeField label="Hora inicio" value={horaInicio} onChange={setHoraInicio} />
        <button
          type="button"
          onClick={handleAgregarClick}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] border border-border-subtle px-3 font-montserrat text-[12px] font-bold text-text-secondary outline-none hover:border-accent-cyan hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-cyan xl:h-10"
        >
          <Plus size={14} />
          Agregar
        </button>
      </div>

      {error && <p className="mt-2 font-inter text-[11px] text-estado-error-text">{error}</p>}
    </div>
  )
}

type DrawerState = { mode: 'new' } | { mode: 'edit'; disciplina: Disciplina } | null

function DisciplinaDrawer({
  state,
  sucursales,
  defaultSucursalId,
  onClose,
  onSaved,
}: {
  state: DrawerState
  sucursales: Sucursal[]
  defaultSucursalId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const editing = state?.mode === 'edit' ? state.disciplina : null

  const [nombre, setNombre] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [activa, setActiva] = useState(true)
  const [horarioLibre, setHorarioLibre] = useState(false)
  const [horarios, setHorarios] = useState<HorarioLocal[]>([])
  const [horariosOriginales, setHorariosOriginales] = useState<HorarioDisciplina[]>([])
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNombre(editing?.nombre ?? '')
    setSucursalId(editing?.sucursal_id ?? defaultSucursalId ?? sucursales[0]?.id ?? '')
    setActiva(editing?.activa ?? true)
    setHorarioLibre(editing?.horario_libre ?? false)
    setError(null)

    if (editing) {
      setLoadingHorarios(true)
      listHorariosByDisciplina(editing.id).then((data) => {
        setHorariosOriginales(data)
        setHorarios(
          data.map((h) => ({
            id: h.id,
            esNuevo: false,
            hora_inicio: h.hora_inicio,
          })),
        )
        setLoadingHorarios(false)
      })
    } else {
      setHorariosOriginales([])
      setHorarios([])
      setLoadingHorarios(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!state) return null

  function handleAgregarHorario(horaInicio: string) {
    setHorarios((prev) => [
      ...prev,
      { id: crypto.randomUUID(), esNuevo: true, hora_inicio: horaInicio },
    ])
  }

  function handleQuitarHorario(id: string) {
    setHorarios((prev) => prev.filter((h) => h.id !== id))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (!sucursalId) {
      setError('Seleccioná una sucursal.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        nombre: nombre.trim(),
        sucursal_id: sucursalId,
        activa,
        horario_libre: horarioLibre,
      }
      const saved = editing
        ? await updateDisciplina(editing.id, payload)
        : await createDisciplina(payload)

      if (horarioLibre) {
        // Al pasar a horario libre no debería quedar ninguna franja cargada.
        await Promise.all(horariosOriginales.map((h) => deleteHorario(h.id)))
      } else {
        const aEliminar = horariosOriginales.filter(
          (original) => !horarios.some((h) => h.id === original.id),
        )
        const aCrear = horarios.filter((h) => h.esNuevo)
        await Promise.all([
          ...aEliminar.map((h) => deleteHorario(h.id)),
          ...aCrear.map((h) =>
            createHorario({
              disciplina_id: saved.id,
              hora_inicio: h.hora_inicio,
            }),
          ),
        ])
      }

      onSaved()
    } catch {
      setError('No se pudo guardar la disciplina.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? 'Editar disciplina' : 'Nueva disciplina'}
      footer={
        <button
          type="submit"
          form="disciplina-form"
          disabled={saving || loadingHorarios}
          className="h-11 w-full rounded-[10px] bg-accent-cyan font-montserrat text-[13px] font-bold text-text-on-accent outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60 xl:h-9"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      }
    >
      <form id="disciplina-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Funcional, Yoga, Pilates…"
          required
        />
        <SelectField
          label="Sucursal"
          value={sucursalId}
          onChange={(e) => setSucursalId(e.target.value)}
          required
        >
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </SelectField>

        <div className="flex flex-col rounded-[10px] border border-border-subtle bg-bg-input px-3">
          <label className="flex items-center gap-2 border-b border-border-subtle py-2.5 font-inter text-[13px] text-text-primary">
            <input
              type="checkbox"
              checked={activa}
              onChange={(e) => setActiva(e.target.checked)}
              className="h-4 w-4 rounded accent-accent-cyan outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
            />
            Disciplina activa
          </label>

          <label className="flex items-center gap-2 py-2.5 font-inter text-[13px] text-text-primary">
            <input
              type="checkbox"
              checked={horarioLibre}
              onChange={(e) => setHorarioLibre(e.target.checked)}
              className="h-4 w-4 rounded accent-accent-cyan outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
            />
            Horario libre (sin franjas fijas — ej. musculación)
          </label>
        </div>

        {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
      </form>

      {horarioLibre ? (
        <p className="mt-5 border-t border-border-subtle pt-4 font-inter text-[13px] text-text-secondary">
          Esta disciplina usa horario libre — no se configuran franjas horarias.
        </p>
      ) : loadingHorarios ? (
        <p className="mt-5 border-t border-border-subtle pt-4 font-inter text-[13px] text-text-secondary">
          Cargando horarios…
        </p>
      ) : (
        <HorariosEditor
          horarios={horarios}
          onAgregar={handleAgregarHorario}
          onQuitar={handleQuitarHorario}
        />
      )}
    </Drawer>
  )
}

export function DisciplinasPage() {
  const { rol } = useAuth()
  const { sucursales, sucursalId } = useSucursal()
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerState, setDrawerState] = useState<DrawerState>(null)

  async function cargarDisciplinas() {
    const data = await listDisciplinas()
    setDisciplinas(data)
  }

  useEffect(() => {
    let active = true
    listDisciplinas().then((data) => {
      if (!active) return
      setDisciplinas(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  if (rol !== 'admin') return <Navigate to="/" replace />

  async function handleSaved() {
    setDrawerState(null)
    await cargarDisciplinas()
  }

  const disciplinasFiltradas = sucursalId
    ? disciplinas.filter((d) => d.sucursal_id === sucursalId)
    : disciplinas

  const sucursalNombre = (id: string) => sucursales.find((s) => s.id === id)?.nombre ?? '—'

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <ConfiguracionSubnav />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-montserrat text-xl font-extrabold text-text-primary">
              Disciplinas
            </h1>
            <p className="mt-1 font-inter text-[13px] text-text-secondary">
              Disciplinas y horarios disponibles por sucursal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerState({ mode: 'new' })}
            className="flex items-center gap-1.5 rounded-[10px] bg-accent-cyan px-4 py-2 font-montserrat text-[13px] font-bold text-text-on-accent"
          >
            <Plus size={14} />
            Nueva disciplina
          </button>
        </div>

        <DataTable<Disciplina>
          columns={[
            { header: 'Nombre', accessor: (d) => d.nombre },
            { header: 'Sucursal', accessor: (d) => sucursalNombre(d.sucursal_id) },
            {
              header: 'Estado',
              accessor: (d) =>
                d.activa ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-estado-al-dia-bg px-2.5 py-1 font-inter text-[11px] font-semibold text-estado-al-dia-text">
                    <span className="text-[8px] leading-none">●</span>
                    Activa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-1 font-inter text-[11px] font-semibold text-text-secondary">
                    Inactiva
                  </span>
                ),
            },
            {
              header: '',
              accessor: (d) => (
                <button
                  type="button"
                  onClick={() => setDrawerState({ mode: 'edit', disciplina: d })}
                  aria-label="Editar disciplina"
                  className="text-text-secondary hover:text-text-primary"
                >
                  <Edit2 size={14} />
                </button>
              ),
              className: 'text-right',
            },
          ]}
          data={disciplinasFiltradas}
          keyExtractor={(d) => d.id}
          loading={loading}
          emptyMessage={
            sucursalId
              ? 'Esta sucursal todavía no tiene disciplinas cargadas.'
              : 'Todavía no hay disciplinas cargadas.'
          }
        />
      </div>

      <DisciplinaDrawer
        state={drawerState}
        sucursales={sucursales}
        defaultSucursalId={sucursalId}
        onClose={() => setDrawerState(null)}
        onSaved={handleSaved}
      />
    </AppLayout>
  )
}
