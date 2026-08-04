import { supabase } from './supabase'
import type { Profesor } from '../types/db'

export type ProfesorInput = {
  nombre: string
  activo: boolean
}

export async function listProfesores(): Promise<Profesor[]> {
  const { data, error } = await supabase.from('profesores').select('*').order('nombre')

  if (error) throw error
  return (data as Profesor[]) ?? []
}

export async function createProfesor(input: ProfesorInput): Promise<Profesor> {
  const { data, error } = await supabase.from('profesores').insert(input).select().single()

  if (error) throw error
  return data as Profesor
}

export async function updateProfesor(id: string, input: ProfesorInput): Promise<Profesor> {
  const { data, error } = await supabase
    .from('profesores')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Profesor
}
