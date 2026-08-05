import { supabase } from './supabase'
import { rangoDelMes } from './formato'
import type { Asistencia, Disciplina } from '../types/db'

export type AsistenciaAlumnoResumen = {
  id: string
  fecha: string
  hora: string
  disciplina: { nombre: string } | null
}

export type AsistenciaConDetalle = Asistencia & {
  alumno: { apellido: string; nombre: string; dni: string } | null
  disciplina: { nombre: string } | null
  sucursal: { nombre: string } | null
}

export type AsistenciaInput = {
  alumno_id: string
  disciplina_id: string | null
  fecha: string
  hora: string
  sucursal_id: string
  profesor_id: string | null
}

export type AsistenciaUpdateInput = {
  alumno_id: string
  disciplina_id: string | null
  fecha: string
  hora: string
  sucursal_id: string
}

// Asistencias con detalle de alumno/disciplina/sucursal, opcionalmente acotadas
// a un rango de fechas (inclusive) y/o una disciplina — usado por el listado
// admin de Asistencias (filtros Desde/Hasta + Disciplina). Sin filtros, trae
// todo el historial (mismo comportamiento que antes de tener rango).
export async function listAsistenciasEnRango(
  filtros: { desde?: string; hasta?: string; disciplinaId?: string } = {},
): Promise<AsistenciaConDetalle[]> {
  let query = supabase
    .from('asistencias')
    .select('*, alumno:alumnos(apellido,nombre,dni), disciplina:disciplinas(nombre), sucursal:sucursales(nombre)')
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })

  if (filtros.desde) query = query.gte('fecha', filtros.desde)
  if (filtros.hasta) query = query.lte('fecha', filtros.hasta)
  if (filtros.disciplinaId) query = query.eq('disciplina_id', filtros.disciplinaId)

  const { data, error } = await query
  if (error) throw error
  return (data as AsistenciaConDetalle[]) ?? []
}

// Asistencias de un alumno dentro de un período 'yyyy-MM' — usado por el admin
// para revisar qué asistió antes de generar el cargo (doc 03 — "Sin cargo generado").
export async function listAsistenciasByAlumnoPeriodo(
  alumnoId: string,
  periodo: string,
): Promise<AsistenciaAlumnoResumen[]> {
  const { inicio, fin } = rangoDelMes(periodo)
  const { data, error } = await supabase
    .from('asistencias')
    .select('id, fecha, hora, disciplina:disciplinas(nombre)')
    .eq('alumno_id', alumnoId)
    .gte('fecha', inicio)
    .lte('fecha', fin)
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })

  if (error) throw error
  return (data as unknown as AsistenciaAlumnoResumen[]) ?? []
}

export async function createAsistencia(input: AsistenciaInput): Promise<Asistencia> {
  const { data, error } = await supabase
    .from('asistencias')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Asistencia
}

export async function updateAsistencia(id: string, input: AsistenciaUpdateInput): Promise<Asistencia> {
  const { data, error } = await supabase
    .from('asistencias')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Asistencia
}

export async function deleteAsistencia(id: string): Promise<void> {
  const { error } = await supabase.from('asistencias').delete().eq('id', id)
  if (error) throw error
}

export function horaActual() {
  return new Date().toTimeString().slice(0, 5)
}

function fechaActual() {
  return new Date().toISOString().slice(0, 10)
}

// Disciplinas de horario_libre (ej. musculación): se registra la hora real, sin
// franjas — el llamador la congela (horaActual()) al mostrar la confirmación,
// para que la hora que se le muestra al alumno sea la misma que se guarda.
// Disciplinas de horario fijo: se usa la hora de inicio de la franja elegida.
export async function marcarAsistencia(params: {
  alumnoId: string
  disciplina: Disciplina
  sucursalId: string
  profesorId: string | null
  hora?: string
}): Promise<Asistencia> {
  const hora = params.hora ?? horaActual()

  return createAsistencia({
    alumno_id: params.alumnoId,
    disciplina_id: params.disciplina.id,
    fecha: fechaActual(),
    hora,
    sucursal_id: params.sucursalId,
    profesor_id: params.profesorId,
  })
}
