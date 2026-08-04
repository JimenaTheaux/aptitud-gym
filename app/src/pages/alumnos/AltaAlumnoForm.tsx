import { useEffect, useId, useState, type FormEvent } from 'react'
import { DateField } from '../../components/ui/DateField'
import { Drawer } from '../../components/ui/Drawer'
import { FormField } from '../../components/ui/FormField'
import { SelectField } from '../../components/ui/SelectField'
import { useSucursal } from '../../contexts/SucursalContext'
import { createAlumno, updateAlumno, DniDuplicadoError } from '../../lib/alumnos'
import type { Alumno, CantidadDias } from '../../types/db'

const DNI_REGEX = /^\d{6,10}$/
const FORM_ID = 'alta-alumno-form'
const CELULAR_PREFIJO = '+549 '

const CANTIDAD_DIAS_OPTIONS: { value: CantidadDias; label: string }[] = [
  { value: '2', label: '2 días' },
  { value: '3', label: '3 días' },
  { value: '5', label: '5 días' },
  { value: 'pase_libre', label: 'Pase libre' },
]

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function celularEfectivo(valor: string) {
  const limpio = valor.trim()
  return limpio === CELULAR_PREFIJO.trim() ? '' : limpio
}

export function AltaAlumnoForm({
  open,
  mode,
  initialDni,
  alumno,
  onCreated,
  onClose,
}: {
  open: boolean
  mode: 'admin' | 'kiosco'
  initialDni?: string
  alumno?: Alumno | null
  onCreated: (alumno: Alumno) => void
  onClose: () => void
}) {
  const editando = Boolean(alumno)
  const { sucursales, sucursalId: sucursalActual } = useSucursal()
  const sucursalLabelId = useId()

  const [dni, setDni] = useState('')
  const [apellido, setApellido] = useState('')
  const [nombre, setNombre] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [celular, setCelular] = useState(CELULAR_PREFIJO)
  const [cantidadDias, setCantidadDias] = useState<CantidadDias | ''>('')
  const [consideraciones, setConsideraciones] = useState('')
  const [sucursalAltaId, setSucursalAltaId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDni(alumno?.dni ?? initialDni ?? '')
    setApellido(alumno?.apellido ?? '')
    setNombre(alumno?.nombre ?? '')
    setFechaNacimiento(alumno?.fecha_nacimiento ?? '')
    setCelular(alumno?.celular || CELULAR_PREFIJO)
    setCantidadDias(alumno?.cantidad_dias ?? '')
    setConsideraciones(alumno?.consideraciones ?? '')
    setSucursalAltaId(alumno?.sucursal_alta_id ?? '')
    setErrors({})
  }, [open, initialDni, alumno])

  function validar() {
    const next: Record<string, string> = {}
    if (!DNI_REGEX.test(dni.trim())) {
      next.dni = 'Ingresá un DNI válido (solo números).'
    }
    if (!apellido.trim()) next.apellido = 'Campo obligatorio.'
    if (!nombre.trim()) next.nombre = 'Campo obligatorio.'
    if (fechaNacimiento && fechaNacimiento > hoyISO()) {
      next.fechaNacimiento = 'La fecha no puede ser futura.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!validar()) return

    setSaving(true)
    try {
      const input = {
        dni: dni.trim(),
        apellido: apellido.trim(),
        nombre: nombre.trim(),
        fecha_nacimiento: fechaNacimiento || null,
        celular: celularEfectivo(celular) || null,
        cantidad_dias: cantidadDias || null,
        consideraciones: consideraciones.trim() || null,
        sucursal_alta_id: mode === 'kiosco' ? sucursalActual : sucursalAltaId || null,
      }
      const resultado = editando ? await updateAlumno(alumno!.id, input) : await createAlumno(input)
      onCreated(resultado)
    } catch (err) {
      if (err instanceof DniDuplicadoError) {
        setErrors({ dni: err.message })
      } else {
        setErrors({ general: 'No se pudo guardar el alumno. Probá de nuevo.' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editando ? 'Editar alumno' : mode === 'admin' ? 'Nuevo alumno' : 'Alta de alumno'}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-[10px] border border-border-subtle font-montserrat text-[13px] font-bold text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={FORM_ID}
            disabled={saving}
            className="h-11 flex-1 rounded-[10px] bg-accent-cyan font-montserrat text-[13px] font-bold text-text-on-accent outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-60"
          >
            {saving ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar alumno'}
          </button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 xl:gap-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="DNI"
            inputMode="numeric"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            error={errors.dni}
            placeholder="30123456"
            required
          />
          <DateField
            label="Fecha de nacimiento"
            max={hoyISO()}
            value={fechaNacimiento}
            onChange={setFechaNacimiento}
            error={errors.fechaNacimiento}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            error={errors.apellido}
            required
          />
          <FormField
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={errors.nombre}
            required
          />
        </div>

        {mode === 'admin' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormField
                label="Celular"
                type="tel"
                inputMode="tel"
                placeholder="+549 11 2345 6789"
                value={celular}
                onFocus={() => {
                  if (!celular) setCelular(CELULAR_PREFIJO)
                }}
                onChange={(e) => setCelular(e.target.value)}
              />
              <p className="mt-1 font-inter text-[10px] leading-snug text-text-muted">
                Formato WhatsApp: +549 + código de área + número, sin 0 ni 15.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span
                id={sucursalLabelId}
                className="font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary"
              >
                Sucursal de alta
              </span>
              <div
                role="group"
                aria-labelledby={sucursalLabelId}
                className="flex flex-wrap gap-2"
              >
                {[...sucursales].reverse().map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSucursalAltaId(s.id)}
                    aria-pressed={sucursalAltaId === s.id}
                    className={`min-h-[44px] lg:min-h-[40px] rounded-[10px] border px-3 py-2 font-montserrat text-[12px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-cyan ${
                      sucursalAltaId === s.id
                        ? 'border-accent-cyan bg-bg-input text-[#8FDBFF]'
                        : 'border-border-subtle text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {s.nombre}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSucursalAltaId('')}
                  aria-pressed={sucursalAltaId === ''}
                  className={`min-h-[44px] lg:min-h-[40px] rounded-[10px] border px-3 py-2 font-montserrat text-[12px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-cyan ${
                    sucursalAltaId === ''
                      ? 'border-accent-cyan bg-bg-input text-[#8FDBFF]'
                      : 'border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Sin especificar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <FormField
              label="Celular"
              type="tel"
              inputMode="tel"
              placeholder="+549 11 2345 6789"
              value={celular}
              onFocus={() => {
                if (!celular) setCelular(CELULAR_PREFIJO)
              }}
              onChange={(e) => setCelular(e.target.value)}
            />
            <p className="font-inter text-[11px] text-text-secondary">
              Sucursal de alta: {sucursales.find((s) => s.id === sucursalActual)?.nombre ?? '—'} (automático)
            </p>
          </>
        )}

        <SelectField
          label="Cantidad de días"
          value={cantidadDias}
          onChange={(e) => setCantidadDias(e.target.value as CantidadDias | '')}
        >
          <option value="">Sin especificar</option>
          {CANTIDAD_DIAS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="consideraciones"
            className="font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary"
          >
            Consideraciones
          </label>
          <textarea
            id="consideraciones"
            value={consideraciones}
            onChange={(e) => setConsideraciones(e.target.value)}
            rows={2}
            className="w-full rounded-[10px] border border-border-subtle bg-bg-input px-3 py-2 font-inter text-base text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan xl:text-[13px]"
            placeholder="Lesiones, alergias, notas del profesor…"
          />
        </div>

        {errors.general && (
          <p className="font-inter text-[13px] text-estado-error-text">{errors.general}</p>
        )}
      </form>
    </Drawer>
  )
}
