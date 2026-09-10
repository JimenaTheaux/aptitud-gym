import { supabase } from './supabase'
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

export async function listErroresSistema(
  filtros: { operacion?: string; desde?: string; hasta?: string } = {},
): Promise<ErrorSistemaConDetalle[]> {
  let query = supabase
    .from('errores_sistema')
    .select('*, profesor:profesores(nombre), sucursal:sucursales(nombre)')
    .order('created_at', { ascending: false })

  if (filtros.operacion) query = query.eq('operacion', filtros.operacion)
  if (filtros.desde) query = query.gte('created_at', `${filtros.desde}T00:00:00`)
  if (filtros.hasta) query = query.lte('created_at', `${filtros.hasta}T23:59:59`)

  const { data, error } = await query
  if (error) throw error
  return (data as ErrorSistemaConDetalle[]) ?? []
}
