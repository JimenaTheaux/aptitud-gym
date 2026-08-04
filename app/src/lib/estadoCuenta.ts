import { supabase } from './supabase'
import { periodoActual } from './formato'
import type { Cargo, Pago } from '../types/db'

export type EstadoCuenta = 'al_dia' | 'pendiente' | 'deuda'

export type EstadoCuentaResultado = {
  // null = todavía no existe cargo para este alumno+período (doc 03,
  // "Sin cargo generado") — distinto de "al_dia", no confundir.
  estado: EstadoCuenta | null
  cargo: Cargo | null
  totalPagado: number
  ultimoPago: Pago | null
}

// Doc 03: un pago registrado por profesor pero no validado por admin no cuenta
// para el estado visible. Cuenta si está validado (validado_por no nulo) o si
// lo registró directamente un admin (impacta al instante, sin pasar por "pendiente").
// Fase 5 (alta de cargo/pago) siempre setea validado_por/validado_at en el mismo
// insert cuando quien registra es admin — adminIds queda como resguardo para
// pagos previos a esa regla.
//
// Migración 07: los pagos se suman por alumno_id+periodo, no por cargo_id — un
// pago adelantado (sin cargo_id) del mismo período ya cuenta acá. El llamador
// es responsable de pasar los pagos ya filtrados por alumno+período.
export function calcularEstadoCargo(
  cargo: Cargo,
  pagosDelPeriodo: Pago[],
  adminIds: Set<string>,
): { estado: EstadoCuenta; totalPagado: number; ultimoPago: Pago | null } {
  const pagosValidos = pagosDelPeriodo.filter(
    (p) => p.validado_por !== null || adminIds.has(p.registrado_por),
  )
  const totalPagado = pagosValidos.reduce((sum, p) => sum + Number(p.monto), 0)
  const ultimoPago = pagosValidos[0] ?? null

  // cargo.monto = 0 (clase de prueba/cortesía) → totalPagado (0) >= monto (0) → al_dia.
  let estado: EstadoCuenta
  if (totalPagado >= Number(cargo.monto)) estado = 'al_dia'
  else if (totalPagado > 0) estado = 'pendiente'
  else estado = 'deuda'

  return { estado, totalPagado, ultimoPago }
}

export async function getAdminIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()

  const { data, error } = await supabase.from('perfiles').select('id, rol').in('id', userIds)
  if (error) throw error

  return new Set(
    ((data as { id: string; rol: string }[] | null) ?? [])
      .filter((p) => p.rol === 'admin')
      .map((p) => p.id),
  )
}

// periodo: por defecto el período actual — es lo que interesa mostrar al
// marcar asistencia o al registrar un pago (doc 03, cálculo por alumno+período).
export async function getEstadoCuenta(
  alumnoId: string,
  periodo: string = periodoActual(),
): Promise<EstadoCuentaResultado> {
  const { data: cargoData, error: cargoError } = await supabase
    .from('cargos')
    .select('*')
    .eq('alumno_id', alumnoId)
    .eq('periodo', periodo)
    .maybeSingle()

  if (cargoError) throw cargoError
  const cargo = (cargoData as Cargo | null) ?? null

  if (!cargo) {
    return { estado: null, cargo: null, totalPagado: 0, ultimoPago: null }
  }

  const { data: pagosData, error: pagosError } = await supabase
    .from('pagos')
    .select('*')
    .eq('alumno_id', alumnoId)
    .eq('periodo', periodo)
    .order('created_at', { ascending: false })

  if (pagosError) throw pagosError
  const pagos = (pagosData as Pago[] | null) ?? []

  const adminIds = await getAdminIds([...new Set(pagos.map((p) => p.registrado_por))])
  const { estado, totalPagado, ultimoPago } = calcularEstadoCargo(cargo, pagos, adminIds)

  return { estado, cargo, totalPagado, ultimoPago }
}
