import { supabase } from './supabase'
import { sumarDiasISO } from './fecha'
import type { ErrorSistema } from '../types/db'

export type ErrorSistemaConDetalle = ErrorSistema & {
  profesor: { nombre: string } | null
  sucursal: { nombre: string } | null
}

export const OPERACIONES_ERROR: { value: string; label: string }[] = [
  { value: 'entrada', label: 'Registrar entrada' },
  { value: 'salida', label: 'Registrar salida' },
  { value: 'edicion', label: 'Editar horario' },
]

const OPERACION_LABEL: Record<string, string> = Object.fromEntries(
  OPERACIONES_ERROR.map((o) => [o.value, o.label]),
)

export function operacionLabel(operacion: string): string {
  return OPERACION_LABEL[operacion] ?? operacion
}

// Límites de created_at (timestamptz) para un filtro de días 'yyyy-MM-dd' en
// hora argentina. Sin el offset -03:00 Postgres interpreta el texto en UTC y
// "hasta 13/10" dejaba afuera los errores de 21:00 a 23:59 ART. El fin es
// exclusivo (00:00 del día siguiente) para no perder fracciones de segundo.
export function limitesFiltroCreatedAt(
  desde?: string,
  hasta?: string,
): { desde?: string; hastaExclusivo?: string } {
  return {
    desde: desde ? `${desde}T00:00:00-03:00` : undefined,
    hastaExclusivo: hasta ? `${sumarDiasISO(hasta, 1)}T00:00:00-03:00` : undefined,
  }
}

export async function listErroresSistema(
  filtros: { operacion?: string; desde?: string; hasta?: string } = {},
): Promise<ErrorSistemaConDetalle[]> {
  let query = supabase
    .from('errores_sistema')
    .select('*, profesor:profesores(nombre), sucursal:sucursales(nombre)')
    .order('created_at', { ascending: false })

  const limites = limitesFiltroCreatedAt(filtros.desde, filtros.hasta)
  if (filtros.operacion) query = query.eq('operacion', filtros.operacion)
  if (limites.desde) query = query.gte('created_at', limites.desde)
  if (limites.hastaExclusivo) query = query.lt('created_at', limites.hastaExclusivo)

  const { data, error } = await query
  if (error) throw error
  return (data as ErrorSistemaConDetalle[]) ?? []
}
