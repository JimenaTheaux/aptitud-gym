import { supabase } from './supabase'
import { formatearFecha, formatearHora, formatearMonto, formatearPeriodo } from './formato'
import type { RegistroEliminado } from '../types/db'

export type RegistroEliminadoConDetalle = RegistroEliminado & {
  admin: { nombre: string } | null
}

// Tablas operativas con trigger de log habilitado (migración 13) — mismo
// orden que el dropdown de filtro de la pantalla.
export const TABLAS_CON_LOG: { value: string; label: string }[] = [
  { value: 'alumnos', label: 'Alumnos' },
  { value: 'asistencias', label: 'Asistencias' },
  { value: 'cargos', label: 'Cargos' },
  { value: 'pagos', label: 'Pagos' },
  { value: 'disciplinas', label: 'Disciplinas' },
  { value: 'horarios_disciplina', label: 'Horarios de disciplina' },
  { value: 'horarios_profesor', label: 'Horarios de profesor' },
  { value: 'profesores', label: 'Profesores' },
]

const TABLA_LABEL: Record<string, string> = Object.fromEntries(
  TABLAS_CON_LOG.map((t) => [t.value, t.label]),
)

export function tablaLabel(tabla: string): string {
  return TABLA_LABEL[tabla] ?? tabla
}

export async function listRegistrosEliminados(
  filtros: { tabla?: string; desde?: string; hasta?: string } = {},
): Promise<RegistroEliminadoConDetalle[]> {
  let query = supabase
    .from('registros_eliminados')
    .select('*, admin:perfiles(nombre)')
    .order('eliminado_at', { ascending: false })

  if (filtros.tabla) query = query.eq('tabla', filtros.tabla)
  if (filtros.desde) query = query.gte('eliminado_at', `${filtros.desde}T00:00:00`)
  if (filtros.hasta) query = query.lte('eliminado_at', `${filtros.hasta}T23:59:59`)

  const { data, error } = await query
  if (error) throw error
  return (data as RegistroEliminadoConDetalle[]) ?? []
}

function strCampo(datos: Record<string, unknown>, campo: string): string | null {
  const valor = datos[campo]
  return typeof valor === 'string' ? valor : null
}

function numCampo(datos: Record<string, unknown>, campo: string): number | null {
  const valor = datos[campo]
  return typeof valor === 'number' ? valor : null
}

// Resumen legible de "qué era" la fila borrada, para la columna principal
// del listado — el JSON completo queda para el Drawer de detalle (doc de
// referencia: prompt "Registros eliminados").
export function resumenRegistroEliminado(registro: RegistroEliminado): string {
  const { tabla, datos } = registro

  switch (tabla) {
    case 'alumnos': {
      const apellido = strCampo(datos, 'apellido')
      const nombre = strCampo(datos, 'nombre')
      const dni = strCampo(datos, 'dni')
      if (!apellido && !nombre) return 'Alumno'
      return `${apellido ?? ''}, ${nombre ?? ''}${dni ? ` (DNI ${dni})` : ''}`.trim()
    }
    case 'pagos': {
      const monto = numCampo(datos, 'monto')
      const periodo = strCampo(datos, 'periodo')
      if (monto == null) return 'Pago'
      return `${formatearMonto(monto)}${periodo ? ` — ${formatearPeriodo(periodo)}` : ''}`
    }
    case 'cargos': {
      const monto = numCampo(datos, 'monto')
      const periodo = strCampo(datos, 'periodo')
      if (monto == null) return 'Cargo'
      return `${formatearMonto(monto)}${periodo ? ` — ${formatearPeriodo(periodo)}` : ''}`
    }
    case 'asistencias': {
      const fecha = strCampo(datos, 'fecha')
      const hora = strCampo(datos, 'hora')
      if (!fecha) return 'Asistencia'
      return `${formatearFecha(fecha)}${hora ? ` ${formatearHora(hora)}` : ''}`
    }
    default: {
      const nombre = strCampo(datos, 'nombre')
      return nombre ?? tablaLabel(tabla)
    }
  }
}
