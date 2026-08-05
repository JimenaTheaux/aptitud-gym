import { supabase } from './supabase'
import type { HorarioProfesor, Modulo } from '../types/db'

export type HorarioProfesorConNombre = HorarioProfesor & {
  profesor: { nombre: string } | null
  sucursal: { nombre: string } | null
}

export type ResumenProfesor = {
  profesorId: string
  profesorNombre: string
  horas: number
  modulos2hs: number
  modulos3hs: number
  sinModulo: number
}

export type HorarioProfesorUpdateInput = {
  fecha: string
  hora_entrada: string | null
  hora_salida: string | null
  sucursal_id: string
  modulo: Modulo | null
}

function fechaHoy(): string {
  return new Date().toISOString().slice(0, 10)
}

function horaAhora(): string {
  return new Date().toTimeString().slice(0, 5)
}

export async function listHorariosProfesorEnRango(
  inicio: string,
  fin: string,
  sucursalId?: string | null,
): Promise<HorarioProfesorConNombre[]> {
  let query = supabase
    .from('horarios_profesor')
    .select('*, profesor:profesores(nombre), sucursal:sucursales(nombre)')
    .gte('fecha', inicio)
    .lte('fecha', fin)
    .order('fecha')

  if (sucursalId) {
    query = query.eq('sucursal_id', sucursalId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as HorarioProfesorConNombre[]) ?? []
}

// Turnos de hoy (todas las sucursales) — usado por las mini cards para saber
// quién tiene turno abierto ahora mismo, sin importar dónde lo abrió.
export async function listHorariosProfesorHoy(): Promise<HorarioProfesorConNombre[]> {
  const hoy = fechaHoy()
  return listHorariosProfesorEnRango(hoy, hoy)
}

export async function registrarEntradaProfesor(
  profesorId: string,
  sucursalId: string,
  modulo: Modulo | null = null,
): Promise<HorarioProfesor> {
  const { data, error } = await supabase
    .from('horarios_profesor')
    .insert({
      profesor_id: profesorId,
      sucursal_id: sucursalId,
      fecha: fechaHoy(),
      hora_entrada: horaAhora(),
      hora_salida: null,
      modulo,
    })
    .select()
    .single()

  if (error) throw error
  return data as HorarioProfesor
}

export async function registrarSalidaProfesor(horarioId: string): Promise<HorarioProfesor> {
  const { data, error } = await supabase
    .from('horarios_profesor')
    .update({ hora_salida: horaAhora() })
    .eq('id', horarioId)
    .select()
    .single()

  if (error) throw error
  return data as HorarioProfesor
}

export async function updateHorarioProfesor(
  id: string,
  input: HorarioProfesorUpdateInput,
): Promise<HorarioProfesor> {
  const { data, error } = await supabase
    .from('horarios_profesor')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as HorarioProfesor
}

export async function deleteHorarioProfesor(id: string): Promise<void> {
  const { error } = await supabase.from('horarios_profesor').delete().eq('id', id)
  if (error) throw error
}

function horasEntre(entrada: string, salida: string): number {
  const [hE, mE] = entrada.split(':').map(Number)
  const [hS, mS] = salida.split(':').map(Number)
  return (hS * 60 + mS - (hE * 60 + mE)) / 60
}

// Horas de un turno puntual — "—" (null) si sigue abierto (doc 04, tabla resumen).
export function calcularHorasTurno(entrada: string | null, salida: string | null): number | null {
  if (!entrada || !salida) return null
  const horas = horasEntre(entrada, salida)
  return horas > 0 ? horas : null
}

export function formatearHoras(horas: number): string {
  return `${horas.toLocaleString('es-AR', { maximumFractionDigits: 1 })} hs`
}

// Resumen por profesor de un rango de horarios (doc 04, sección 3 — admin):
// horas total trabajadas (solo turnos con salida — no se estima) y contadores
// de turnos por tipo de módulo marcado al registrar la entrada. Los contadores
// son cantidad de turnos, no suma de horas — no confundir con el total.
export function resumenPorProfesor(horarios: HorarioProfesorConNombre[]): ResumenProfesor[] {
  const mapa = new Map<
    string,
    { profesorNombre: string; horas: number; modulos2hs: number; modulos3hs: number; sinModulo: number }
  >()

  for (const h of horarios) {
    const actual = mapa.get(h.profesor_id) ?? {
      profesorNombre: h.profesor?.nombre ?? '—',
      horas: 0,
      modulos2hs: 0,
      modulos3hs: 0,
      sinModulo: 0,
    }
    const horas = calcularHorasTurno(h.hora_entrada, h.hora_salida)
    if (horas !== null) actual.horas += horas
    if (h.modulo === '2hs') actual.modulos2hs += 1
    else if (h.modulo === '3hs') actual.modulos3hs += 1
    else actual.sinModulo += 1
    mapa.set(h.profesor_id, actual)
  }

  return [...mapa.entries()]
    .map(([profesorId, v]) => ({
      profesorId,
      profesorNombre: v.profesorNombre,
      horas: v.horas,
      modulos2hs: v.modulos2hs,
      modulos3hs: v.modulos3hs,
      sinModulo: v.sinModulo,
    }))
    .sort((a, b) => b.horas - a.horas)
}
