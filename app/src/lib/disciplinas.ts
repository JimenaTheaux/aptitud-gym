import { supabase } from './supabase'
import type { Disciplina } from '../types/db'

export type DisciplinaInput = {
  nombre: string
  activa: boolean
  sucursal_id: string
  horario_libre: boolean
}

export async function listDisciplinas(): Promise<Disciplina[]> {
  const { data, error } = await supabase
    .from('disciplinas')
    .select('*')
    .order('nombre')

  if (error) throw error
  return (data as Disciplina[]) ?? []
}

export async function createDisciplina(input: DisciplinaInput): Promise<Disciplina> {
  const { data, error } = await supabase
    .from('disciplinas')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Disciplina
}

export async function updateDisciplina(id: string, input: DisciplinaInput): Promise<Disciplina> {
  const { data, error } = await supabase
    .from('disciplinas')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Disciplina
}
