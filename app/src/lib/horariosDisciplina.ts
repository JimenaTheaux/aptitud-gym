import { supabase } from './supabase'
import type { HorarioDisciplina } from '../types/db'

export type HorarioDisciplinaInput = {
  disciplina_id: string
  hora_inicio: string
}

export async function listHorariosByDisciplina(disciplinaId: string): Promise<HorarioDisciplina[]> {
  const { data, error } = await supabase
    .from('horarios_disciplina')
    .select('*')
    .eq('disciplina_id', disciplinaId)
    .order('hora_inicio')

  if (error) throw error
  return (data as HorarioDisciplina[]) ?? []
}

export async function createHorario(input: HorarioDisciplinaInput): Promise<HorarioDisciplina> {
  const { data, error } = await supabase
    .from('horarios_disciplina')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as HorarioDisciplina
}

export async function deleteHorario(id: string): Promise<void> {
  const { error } = await supabase.from('horarios_disciplina').delete().eq('id', id)
  if (error) throw error
}
