import { useEffect, useState, type FormEvent } from 'react'
import { AlumnoSelect } from '../../components/ui/AlumnoSelect'
import { Drawer } from '../../components/ui/Drawer'
import { FormField } from '../../components/ui/FormField'
import { PeriodoField } from '../../components/ui/PeriodoField'
import { SelectField } from '../../components/ui/SelectField'
import { useAuth } from '../../contexts/AuthContext'
import { createCargo } from '../../lib/cargos'
import type { Alumno, Cargo, Disciplina } from '../../types/db'

const FORM_ID = 'cargo-form'

function periodoActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

export function CargoFormDrawer({
  open,
  alumnos,
  disciplinas,
  alumnoPreseleccionado,
  onClose,
  onCreated,
}: {
  open: boolean
  alumnos: Alumno[]
  disciplinas: Disciplina[]
  alumnoPreseleccionado?: string | null
  onClose: () => void
  onCreated: (cargo: Cargo) => void
}) {
  const { perfil } = useAuth()

  const [alumnoId, setAlumnoId] = useState('')
  const [periodo, setPeriodo] = useState(periodoActual())
  const [disciplinaId, setDisciplinaId] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setAlumnoId(alumnoPreseleccionado ?? '')
    setPeriodo(periodoActual())
    setDisciplinaId('')
    setMonto('')
    setError(null)
  }, [open, alumnoPreseleccionado])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!alumnoId) {
      setError('Seleccioná un alumno.')
      return
    }
    if (!periodo) {
      setError('Indicá el período.')
      return
    }
    const montoNumero = Number(monto)
    if (!monto || Number.isNaN(montoNumero) || montoNumero <= 0) {
      setError('Ingresá un monto válido.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const cargo = await createCargo({
        alumno_id: alumnoId,
        periodo,
        monto: montoNumero,
        disciplina_id: disciplinaId || null,
        created_by: perfil?.id ?? null,
      })
      onCreated(cargo)
    } catch {
      setError('No se pudo guardar el cargo. Probá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nuevo cargo"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-[10px] border border-border-subtle font-montserrat text-[13px] font-bold text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan xl:h-9"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={FORM_ID}
            disabled={saving}
            className="h-11 flex-1 rounded-[10px] bg-accent-cyan font-montserrat text-[13px] font-bold text-text-on-accent outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60 xl:h-9"
          >
            {saving ? 'Guardando…' : 'Guardar cargo'}
          </button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 xl:gap-3">
        <AlumnoSelect label="Alumno" alumnos={alumnos} value={alumnoId} onChange={setAlumnoId} required />

        {/* Período en su propia fila: un grid de 2 columnas lo trunca (ver PeriodoField) */}
        <PeriodoField label="Período" value={periodo} onChange={setPeriodo} required />
        <FormField
          label="Monto"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
        />

        <SelectField
          label="Disciplina"
          value={disciplinaId}
          onChange={(e) => setDisciplinaId(e.target.value)}
        >
          <option value="">Sin disciplina</option>
          {disciplinas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </SelectField>

        {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
      </form>
    </Drawer>
  )
}
