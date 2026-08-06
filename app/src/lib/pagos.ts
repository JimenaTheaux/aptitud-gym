import { supabase } from './supabase'
import { calcularEstadoCargo, getAdminIds, type EstadoCuenta } from './estadoCuenta'
import { periodoActual, rangoDelMes } from './formato'
import type { Alumno, Cargo, FormaPago, Pago, TipoPago } from '../types/db'

export type PagoConDetalle = Pago & {
  cargo: { periodo: string; monto: number } | null
  validador: { nombre: string } | null
}

export type PagoAdminDetalle = Pago & {
  alumno: { apellido: string; nombre: string; dni: string } | null
  sucursal: { nombre: string } | null
  profesor: { nombre: string } | null
}

export type PagoPendienteConDetalle = Pago & {
  alumno: { apellido: string; nombre: string; dni: string } | null
  cargo: { periodo: string; monto: number } | null
}

export type NuevoPagoInput = {
  alumno_id: string
  cargo_id: string | null
  // Propio del pago — independiente de cargo_id (migración 07). Permite
  // pagos adelantados que se reconcilian solos cuando el cargo se genera.
  periodo: string
  // Sucursal elegida en el form — obligatoria (migración 06 reset + pagos v2).
  sucursal_id: string
  // Fecha del pago, autocompletada con hoy y editable — distinta de created_at.
  fecha_pago: string
  // Persona real del roster `profesores` que recibió el pago.
  profesor_id: string | null
  disciplina_id: string | null
  tipo_pago: TipoPago
  detalle: string | null
  monto: number
  forma_pago: FormaPago
  monto_efectivo: number | null
  monto_transferencia: number | null
  parcial: boolean
  registrado_por: string
  // true cuando lo registra un admin: queda validado en el mismo insert
  // (doc 03 — "Admin registra pago directo -> impacta al instante").
  directo: boolean
}

export type EditarPagoInput = {
  alumno_id: string
  cargo_id: string | null
  periodo: string
  sucursal_id: string
  fecha_pago: string
  profesor_id: string | null
  disciplina_id: string | null
  tipo_pago: TipoPago
  detalle: string | null
  monto: number
  forma_pago: FormaPago
  monto_efectivo: number | null
  monto_transferencia: number | null
  parcial: boolean
}

export type Deudor = {
  alumno: Alumno
  cargo: Cargo
  estado: EstadoCuenta
  totalPagado: number
}

export async function listPagosByAlumno(alumnoId: string): Promise<PagoConDetalle[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select('*, cargo:cargos(periodo,monto), validador:perfiles!pagos_validado_por_fkey(nombre)')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as PagoConDetalle[]) ?? []
}

// Historial completo de pagos (admin) — filtrado por la sucursal elegida en
// el selector de admin (doc 02); null = "todas", sin filtrar.
export async function listPagosConDetalle(sucursalId: string | null): Promise<PagoAdminDetalle[]> {
  let query = supabase
    .from('pagos')
    .select(
      '*, alumno:alumnos(apellido,nombre,dni), sucursal:sucursales(nombre), profesor:profesores(nombre)',
    )
    .order('created_at', { ascending: false })

  if (sucursalId) {
    query = query.eq('sucursal_id', sucursalId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as PagoAdminDetalle[]) ?? []
}

export async function listPagosPendientes(): Promise<PagoPendienteConDetalle[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select('*, alumno:alumnos(apellido,nombre,dni), cargo:cargos(periodo,monto)')
    .is('validado_por', null)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data as PagoPendienteConDetalle[]) ?? []
}

export async function createPago(input: NuevoPagoInput): Promise<Pago> {
  const { directo, ...rest } = input
  const payload = directo
    ? { ...rest, validado_por: rest.registrado_por, validado_at: new Date().toISOString() }
    : rest

  const { data, error } = await supabase.from('pagos').insert(payload).select().single()
  if (error) throw error
  return data as Pago
}

// Edición de datos de un pago ya cargado (migración 14 — policy de UPDATE
// admin). Nunca toca validado_por/validado_at: eso sigue siendo exclusivo de
// fn_validar_pago, la validación sigue siendo una acción aparte.
export async function updatePago(pagoId: string, input: EditarPagoInput): Promise<Pago> {
  const { data, error } = await supabase.from('pagos').update(input).eq('id', pagoId).select().single()
  if (error) throw error
  return data as Pago
}

// Único punto de escritura permitido para validado_por/validado_at — nunca un
// update directo desde el cliente (RLS ya lo bloquea, ver migración 01/02).
export async function validarPago(pagoId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_validar_pago', { p_pago_id: pagoId })
  if (error) throw error
}

// Alumnos con asistencia registrada en el período dado — base compartida por
// listDeudores y listSinCargoGenerado.
async function alumnoIdsConAsistencia(periodo: string): Promise<string[]> {
  const { inicio, fin } = rangoDelMes(periodo)
  const { data, error } = await supabase
    .from('asistencias')
    .select('alumno_id')
    .gte('fecha', inicio)
    .lte('fecha', fin)

  if (error) throw error
  return [...new Set((data ?? []).map((a) => a.alumno_id as string))]
}

// Alumnos con cargo del período actual cuyo estado de cuenta (pagos por
// alumno+período, sin importar cargo_id) todavía no está al día.
export async function listDeudores(): Promise<Deudor[]> {
  const periodo = periodoActual()
  const alumnoIds = await alumnoIdsConAsistencia(periodo)
  if (alumnoIds.length === 0) return []

  const { data: cargosData, error: cargosError } = await supabase
    .from('cargos')
    .select('*')
    .eq('periodo', periodo)
    .in('alumno_id', alumnoIds)

  if (cargosError) throw cargosError
  const cargos = (cargosData as Cargo[]) ?? []
  if (cargos.length === 0) return []

  const alumnosConCargoIds = cargos.map((c) => c.alumno_id)

  const { data: alumnosData, error: alumnosError } = await supabase
    .from('alumnos')
    .select('*')
    .in('id', alumnosConCargoIds)

  if (alumnosError) throw alumnosError
  const alumnos = (alumnosData as Alumno[]) ?? []

  const { data: pagosData, error: pagosError } = await supabase
    .from('pagos')
    .select('*')
    .eq('periodo', periodo)
    .in('alumno_id', alumnosConCargoIds)

  if (pagosError) throw pagosError
  const pagos = (pagosData as Pago[]) ?? []

  const adminIds = await getAdminIds([...new Set(pagos.map((p) => p.registrado_por))])

  const deudores: Deudor[] = []
  for (const alumno of alumnos) {
    const cargo = cargos.find((c) => c.alumno_id === alumno.id)
    if (!cargo) continue

    const pagosDelPeriodo = pagos.filter((p) => p.alumno_id === alumno.id)
    const { estado, totalPagado } = calcularEstadoCargo(cargo, pagosDelPeriodo, adminIds)
    if (estado !== 'al_dia') {
      deudores.push({ alumno, cargo, estado, totalPagado })
    }
  }

  return deudores
}

// Alumnos con al menos una asistencia en el período actual que todavía no
// tienen cargo generado para ese período (doc 03 — "Sin cargo generado").
export async function listSinCargoGenerado(): Promise<Alumno[]> {
  const periodo = periodoActual()
  const alumnoIds = await alumnoIdsConAsistencia(periodo)
  if (alumnoIds.length === 0) return []

  const { data: cargosData, error: cargosError } = await supabase
    .from('cargos')
    .select('alumno_id')
    .eq('periodo', periodo)
    .in('alumno_id', alumnoIds)

  if (cargosError) throw cargosError
  const conCargo = new Set((cargosData ?? []).map((c) => c.alumno_id as string))
  const sinCargoIds = alumnoIds.filter((id) => !conCargo.has(id))
  if (sinCargoIds.length === 0) return []

  const { data: alumnosData, error: alumnosError } = await supabase
    .from('alumnos')
    .select('*')
    .in('id', sinCargoIds)

  if (alumnosError) throw alumnosError
  return (alumnosData as Alumno[]) ?? []
}
