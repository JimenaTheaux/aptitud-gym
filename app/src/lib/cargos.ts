import { supabase } from './supabase'
import type { Cargo } from '../types/db'

export type NuevoCargoInput = {
  alumno_id: string
  periodo: string
  monto: number
  disciplina_id: string | null
  created_by: string | null
}

export async function listCargosByAlumno(alumnoId: string): Promise<Cargo[]> {
  const { data, error } = await supabase
    .from('cargos')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('periodo', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Cargo[]) ?? []
}

// El monto queda congelado en el momento de creación (snapshot, doc 06) —
// nunca se referencia un precio "vivo".
export async function createCargo(input: NuevoCargoInput): Promise<Cargo> {
  const { data, error } = await supabase.from('cargos').insert(input).select().single()
  if (error) throw error
  return data as Cargo
}

export type EditarCargoInput = {
  alumno_id: string
  periodo: string
  monto: number
  disciplina_id: string | null
}

// Corrección manual de un cargo ya generado (migración 15 — policy de
// UPDATE admin). No es un recálculo de precio "vivo": sigue siendo el admin
// quien decide el nuevo monto/período, igual que al crearlo.
export async function updateCargo(cargoId: string, input: EditarCargoInput): Promise<Cargo> {
  const { data, error } = await supabase.from('cargos').update(input).eq('id', cargoId).select().single()
  if (error) throw error
  return data as Cargo
}
