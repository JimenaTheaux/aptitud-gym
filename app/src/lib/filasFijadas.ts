import { supabase } from './supabase'
import type { FilaFijada } from '../types/db'

// Genérico: cualquier listado del sistema lo reusa pasando su propio
// identificador de `tabla` ('alumnos', 'deudores', 'historial_pagos', etc.).
// RLS de `filas_fijadas` restringe todo a admin_id = auth.uid() (migración 09).

export async function listPinned(tabla: string, adminId: string): Promise<FilaFijada[]> {
  const { data, error } = await supabase
    .from('filas_fijadas')
    .select('*')
    .eq('tabla', tabla)
    .eq('admin_id', adminId)
    .order('created_at')

  if (error) throw error
  return (data as FilaFijada[]) ?? []
}

export async function pinRow(tabla: string, registroId: string, adminId: string): Promise<FilaFijada> {
  const { data, error } = await supabase
    .from('filas_fijadas')
    .insert({ tabla, registro_id: registroId, admin_id: adminId })
    .select()
    .single()

  if (error) throw error
  return data as FilaFijada
}

export async function unpinRow(tabla: string, registroId: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('filas_fijadas')
    .delete()
    .eq('tabla', tabla)
    .eq('registro_id', registroId)
    .eq('admin_id', adminId)

  if (error) throw error
}
