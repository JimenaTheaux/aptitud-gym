import { useEffect, useState, type FormEvent } from 'react'
import { AlumnoSelect } from '../../components/ui/AlumnoSelect'
import { ESTADO_BAR_CLASS } from '../../components/ui/BadgeEstado'
import { DateField } from '../../components/ui/DateField'
import { Drawer } from '../../components/ui/Drawer'
import { FormField } from '../../components/ui/FormField'
import { PeriodoField } from '../../components/ui/PeriodoField'
import { SelectField } from '../../components/ui/SelectField'
import { EstadoCuentaCard } from '../Checkin/EstadoCuentaCard'
import { useAuth } from '../../contexts/AuthContext'
import { useSucursal } from '../../contexts/SucursalContext'
import { listCargosByAlumno } from '../../lib/cargos'
import { createPago, updatePago } from '../../lib/pagos'
import type { EstadoCuenta } from '../../lib/estadoCuenta'
import type { Alumno, Cargo, Disciplina, FormaPago, Pago, Profesor, TipoPago } from '../../types/db'

const FORM_ID = 'pago-form'

function periodoActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

const TIPOS_PAGO: { value: TipoPago; label: string }[] = [
  { value: 'cuota', label: 'Cuota' },
  { value: 'media_cuota', label: 'Media cuota' },
  { value: 'inicio_caja', label: 'Inicio de caja' },
]

const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'combinado', label: 'Combinado' },
]

function chipClass(active: boolean) {
  return `rounded-full border px-4 py-1.5 font-montserrat text-[12px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-cyan ${
    active
      ? 'border-accent-cyan bg-bg-input text-[#8FDBFF]'
      : 'border-border-subtle text-text-secondary hover:text-text-primary'
  }`
}

export function PagoFormDrawer({
  open,
  alumnos,
  disciplinas,
  profesores,
  alumnoPreseleccionado,
  pago,
  onClose,
  onCreated,
  onUpdated,
}: {
  open: boolean
  alumnos: Alumno[]
  disciplinas: Disciplina[]
  profesores: Profesor[]
  alumnoPreseleccionado?: string | null
  // Pago a editar — si viene seteado, el drawer abre en modo edición
  // precargado con sus datos en vez de armar un pago nuevo.
  pago?: Pago | null
  onClose: () => void
  onCreated?: (pago: Pago) => void
  onUpdated?: (pago: Pago) => void
}) {
  const { perfil, rol } = useAuth()
  const { sucursales, sucursalId: sucursalContexto } = useSucursal()
  const editando = Boolean(pago)

  // 1. Sucursal
  const [sucursalId, setSucursalId] = useState('')
  // 2. Fecha del pago
  const [fechaPago, setFechaPago] = useState('')
  // 3. Profe
  const [profesorId, setProfesorId] = useState('')
  // 4. Detalle (tipo de pago)
  const [tipoPago, setTipoPago] = useState<TipoPago>('cuota')
  // 5. Alumno
  const [alumnoId, setAlumnoId] = useState('')
  const [estadoAlumno, setEstadoAlumno] = useState<EstadoCuenta | null>(null)
  const [cargos, setCargos] = useState<Cargo[]>([])
  // 6. Disciplina
  const [disciplinaId, setDisciplinaId] = useState('')
  // 7. Período
  const [periodo, setPeriodo] = useState(periodoActual())
  // 8. Detalle libre
  const [detalle, setDetalle] = useState('')
  // 9. Monto
  const [monto, setMonto] = useState('')
  // 10. Forma de pago
  const [formaPago, setFormaPago] = useState<FormaPago>('efectivo')
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [montoTransferencia, setMontoTransferencia] = useState('')

  const [parcial, setParcial] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const sucursalesActivas = sucursales.filter((s) => s.activa)

  useEffect(() => {
    if (!open) return
    if (pago) {
      setSucursalId(pago.sucursal_id)
      setFechaPago(pago.fecha_pago)
      setProfesorId(pago.profesor_id ?? '')
      setTipoPago(pago.tipo_pago)
      setAlumnoId(pago.alumno_id)
      setEstadoAlumno(null)
      setCargos([])
      setDisciplinaId(pago.disciplina_id ?? '')
      setPeriodo(pago.periodo)
      setDetalle(pago.detalle ?? '')
      setMonto(String(pago.monto))
      setFormaPago(pago.forma_pago)
      setMontoEfectivo(pago.monto_efectivo != null ? String(pago.monto_efectivo) : '')
      setMontoTransferencia(pago.monto_transferencia != null ? String(pago.monto_transferencia) : '')
      setParcial(pago.parcial)
      setError(null)
      return
    }
    setSucursalId(sucursalContexto ?? sucursalesActivas[0]?.id ?? '')
    setFechaPago(new Date().toISOString().slice(0, 10))
    setProfesorId('')
    setTipoPago('cuota')
    setAlumnoId(alumnoPreseleccionado ?? '')
    setEstadoAlumno(null)
    setCargos([])
    setDisciplinaId('')
    setPeriodo(periodoActual())
    setDetalle('')
    setMonto('')
    setFormaPago('efectivo')
    setMontoEfectivo('')
    setMontoTransferencia('')
    setParcial(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, alumnoPreseleccionado, pago])

  // Cargo asociado al período se resuelve solo (mismo criterio que antes,
  // sin exponer un selector propio — no forma parte de los 10 campos del form).
  useEffect(() => {
    if (!alumnoId) {
      setCargos([])
      return
    }
    let active = true
    listCargosByAlumno(alumnoId).then((data) => {
      if (!active) return
      setCargos(data)
    })
    return () => {
      active = false
    }
  }, [alumnoId])

  const cargoId = cargos.find((c) => c.periodo === periodo)?.id ?? null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!sucursalId) {
      setError('Seleccioná la sucursal.')
      return
    }
    if (!fechaPago) {
      setError('Indicá la fecha del pago.')
      return
    }
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

    let montoEfectivoNumero: number | null = null
    let montoTransferenciaNumero: number | null = null
    if (formaPago === 'combinado') {
      montoEfectivoNumero = Number(montoEfectivo)
      montoTransferenciaNumero = Number(montoTransferencia)
      if (
        !montoEfectivo ||
        !montoTransferencia ||
        Number.isNaN(montoEfectivoNumero) ||
        Number.isNaN(montoTransferenciaNumero) ||
        montoEfectivoNumero < 0 ||
        montoTransferenciaNumero < 0
      ) {
        setError('Ingresá los montos en efectivo y transferencia.')
        return
      }
      const suma = Math.round((montoEfectivoNumero + montoTransferenciaNumero) * 100) / 100
      if (suma !== Math.round(montoNumero * 100) / 100) {
        setError('Efectivo + transferencia debe sumar el monto total.')
        return
      }
    }

    if (!perfil) {
      setError('No se pudo identificar al usuario logueado.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editando && pago) {
        const actualizado = await updatePago(pago.id, {
          alumno_id: alumnoId,
          cargo_id: cargoId,
          periodo,
          sucursal_id: sucursalId,
          fecha_pago: fechaPago,
          profesor_id: profesorId || null,
          disciplina_id: disciplinaId || null,
          tipo_pago: tipoPago,
          detalle: detalle.trim() || null,
          monto: montoNumero,
          forma_pago: formaPago,
          monto_efectivo: montoEfectivoNumero,
          monto_transferencia: montoTransferenciaNumero,
          parcial,
        })
        onUpdated?.(actualizado)
      } else {
        const nuevo = await createPago({
          alumno_id: alumnoId,
          cargo_id: cargoId,
          periodo,
          sucursal_id: sucursalId,
          fecha_pago: fechaPago,
          profesor_id: profesorId || null,
          disciplina_id: disciplinaId || null,
          tipo_pago: tipoPago,
          detalle: detalle.trim() || null,
          monto: montoNumero,
          forma_pago: formaPago,
          monto_efectivo: montoEfectivoNumero,
          monto_transferencia: montoTransferenciaNumero,
          parcial,
          registrado_por: perfil.id,
          directo: rol === 'admin',
        })
        onCreated?.(nuevo)
      }
    } catch {
      setError(editando ? 'No se pudo guardar la edición. Probá de nuevo.' : 'No se pudo registrar el pago. Probá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editando ? 'Editar pago' : 'Registrar pago'}
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
            {saving ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar pago'}
          </button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 xl:gap-3">
        {/* 1. Sucursal */}
        <div className="flex flex-col gap-1.5">
          <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary">
            Sucursal
            <span aria-hidden="true" className="ml-0.5 text-estado-error-text">
              *
            </span>
          </span>
          <div role="group" aria-label="Sucursal" className="flex flex-wrap gap-2">
            {sucursalesActivas.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSucursalId(s.id)}
                aria-pressed={sucursalId === s.id}
                className={chipClass(sucursalId === s.id)}
              >
                {s.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Fecha del pago · 3. Profe */}
        <div className="grid grid-cols-2 gap-3">
          <DateField label="Fecha del pago" value={fechaPago} onChange={setFechaPago} required />
          <SelectField
            label="Profe"
            value={profesorId}
            onChange={(e) => setProfesorId(e.target.value)}
          >
            <option value="">Sin especificar</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </SelectField>
        </div>

        {/* 4. Detalle (tipo de pago) */}
        <SelectField
          label="Detalle"
          value={tipoPago}
          onChange={(e) => setTipoPago(e.target.value as TipoPago)}
          required
        >
          {TIPOS_PAGO.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectField>

        {/* 5. Alumno */}
        <AlumnoSelect label="Alumno" alumnos={alumnos} value={alumnoId} onChange={setAlumnoId} required />

        {alumnoId && (
          <div
            className={`rounded-b-[10px] rounded-t-none border border-t-4 border-border-subtle bg-bg-input p-3 ${
              estadoAlumno ? ESTADO_BAR_CLASS[estadoAlumno] : ''
            }`}
          >
            <p className="mb-2 font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary">
              Estado de cuenta actual
            </p>
            <EstadoCuentaCard alumnoId={alumnoId} onEstadoChange={setEstadoAlumno} />
          </div>
        )}

        {/* 6. Disciplina */}
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

        {/* 7. Período — selector propio (mes + año) en su propia fila: no entra
            en un grid de 2 columnas sin truncarse (ver PeriodoField). */}
        <PeriodoField label="Período" value={periodo} onChange={setPeriodo} required />

        {/* 8. Detalle libre */}
        <FormField
          label="Detalle libre"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder="Observaciones opcionales…"
        />

        {/* 9. Monto · 10. Forma de pago */}
        <div className="grid grid-cols-2 gap-3">
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
            label="Forma de pago"
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value as FormaPago)}
            required
          >
            {FORMAS_PAGO.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </SelectField>
        </div>

        {formaPago === 'combinado' && (
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Monto efectivo"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={montoEfectivo}
              onChange={(e) => setMontoEfectivo(e.target.value)}
              required
            />
            <FormField
              label="Monto transferencia"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={montoTransferencia}
              onChange={(e) => setMontoTransferencia(e.target.value)}
              required
            />
          </div>
        )}

        <label className="flex items-center gap-2 font-inter text-[13px] text-text-primary">
          <input
            type="checkbox"
            checked={parcial}
            onChange={(e) => setParcial(e.target.checked)}
            className="h-4 w-4 rounded accent-accent-cyan outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
          />
          Es un pago parcial
        </label>

        <p className="font-inter text-[11px] text-text-secondary">
          {editando
            ? 'Editar no valida el pago — si corresponde, validalo después con el botón "Validar".'
            : rol === 'admin'
              ? 'Registrado por admin: queda validado al instante.'
              : 'Este pago queda pendiente de validación por un admin.'}
        </p>

        {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
      </form>
    </Drawer>
  )
}
