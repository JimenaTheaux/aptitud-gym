import { supabase } from './supabase'
import type { Alumno, CantidadDias } from '../types/db'

export type NuevoAlumnoInput = {
  dni: string
  apellido: string
  nombre: string
  fecha_nacimiento: string | null
  celular: string | null
  cantidad_dias: CantidadDias | null
  consideraciones: string | null
  sucursal_alta_id: string | null
}

export class DniDuplicadoError extends Error {
  constructor() {
    super('Ya existe un alumno registrado con ese DNI.')
  }
}

export async function listAlumnos(): Promise<Alumno[]> {
  const { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .order('apellido')

  if (error) throw error
  return (data as Alumno[]) ?? []
}

export async function findAlumnoByDni(dni: string): Promise<Alumno | null> {
  const { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .eq('dni', dni.trim())
    .maybeSingle()

  if (error) throw error
  return (data as Alumno | null) ?? null
}

export async function searchAlumnosByDni(query: string): Promise<Alumno[]> {
  const texto = query.trim()
  if (!texto) return []

  const { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .ilike('dni', `${texto}%`)
    .order('dni')
    .limit(10)

  if (error) throw error
  return (data as Alumno[]) ?? []
}

export async function searchAlumnosByNombre(query: string): Promise<Alumno[]> {
  const texto = query.trim()
  if (!texto) return []

  const { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .or(`nombre.ilike.%${texto}%,apellido.ilike.%${texto}%`)
    .order('apellido')
    .limit(10)

  if (error) throw error
  return (data as Alumno[]) ?? []
}

export async function createAlumno(input: NuevoAlumnoInput): Promise<Alumno> {
  const { data, error } = await supabase
    .from('alumnos')
    .insert(input)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new DniDuplicadoError()
    throw error
  }
  return data as Alumno
}

export async function updateAlumno(id: string, input: NuevoAlumnoInput): Promise<Alumno> {
  const { data, error } = await supabase
    .from('alumnos')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new DniDuplicadoError()
    throw error
  }
  return data as Alumno
}

// Admin únicamente (RLS, migración 10). Borra en cascada asistencias, cargos,
// pagos y whatsapp_envios del alumno.
export async function deleteAlumno(id: string): Promise<void> {
  const { error } = await supabase.from('alumnos').delete().eq('id', id)
  if (error) throw error
}
