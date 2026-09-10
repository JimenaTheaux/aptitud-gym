import { supabase } from './supabase'
import type { HorarioProfesor, Modulo, TurnoAbiertoProlongado } from '../types/db'

// Lanzado por registrarEntradaProfesor cuando el RPC rechaza la entrada
// porque el profesor ya tiene un turno abierto hoy (migración 16) — permite
// al llamador distinguir este caso de un error genérico y mostrar un
// mensaje específico en vez de "no se pudo, probá de nuevo".
export class TurnoAbiertoError extends Error {}

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

// Best-effort: si el log mismo falla (ej. sin conexión — el mismo corte que
// hizo fallar la operación original) no debe tapar el error real ni romper
// el flujo, así que nunca propaga.
async function logErrorSistema(
  operacion: 'entrada' | 'salida' | 'edicion',
  detalle: string,
  profesorId: string | null,
  sucursalId: string | null,
): Promise<void> {
  try {
    await supabase.from('errores_sistema').insert({
      operacion,
      profesor_id: profesorId,
      sucursal_id: sucursalId,
      detalle,
    })
  } catch {
    // no-op
  }
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

// Vía RPC (migración 16), no INSERT directo: el server valida de forma
// atómica que el profesor no tenga ya un turno abierto hoy antes de
// insertar (ver fn_registrar_entrada_profesor) — un INSERT directo desde acá
// solo podía chequearlo contra el estado ya cargado en memoria del cliente,
// que es exactamente la carrera que causaba turnos duplicados.
export async function registrarEntradaProfesor(
  profesorId: string,
  sucursalId: string,
  modulo: Modulo | null = null,
): Promise<HorarioProfesor> {
  const { data, error } = await supabase.rpc('fn_registrar_entrada_profesor', {
    p_profesor_id: profesorId,
    p_sucursal_id: sucursalId,
    p_fecha: fechaHoy(),
    p_hora_entrada: horaAhora(),
    p_modulo: modulo,
  })

  if (error) {
    await logErrorSistema('entrada', error.message, profesorId, sucursalId)
    if (error.message.includes('TURNO_ABIERTO')) {
      throw new TurnoAbiertoError('El profesor ya tiene un turno abierto hoy.')
    }
    throw error
  }
  return data as HorarioProfesor
}

export async function registrarSalidaProfesor(
  horarioId: string,
  profesorId: string | null = null,
  sucursalId: string | null = null,
): Promise<HorarioProfesor> {
  const { data, error } = await supabase
    .from('horarios_profesor')
    .update({ hora_salida: horaAhora() })
    .eq('id', horarioId)
    .select()
    .single()

  if (error) {
    await logErrorSistema('salida', error.message, profesorId, sucursalId)
    throw error
  }
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

  if (error) {
    await logErrorSistema('edicion', error.message, null, input.sucursal_id)
    throw error
  }
  return data as HorarioProfesor
}

export async function deleteHorarioProfesor(id: string): Promise<void> {
  const { error } = await supabase.from('horarios_profesor').delete().eq('id', id)
  if (error) throw error
}

// Turnos con hora_salida null de días anteriores a hoy (migración 16, vista
// turnos_abiertos_prolongados) — huérfanos para revisar/cerrar desde el
// submenú admin "Sistema".
export async function listTurnosAbiertosProlongados(): Promise<TurnoAbiertoProlongado[]> {
  const { data, error } = await supabase
    .from('turnos_abiertos_prolongados')
    .select('*')
    .order('fecha', { ascending: true })

  if (error) throw error
  return (data as TurnoAbiertoProlongado[]) ?? []
}

// Cierre manual de un turno huérfano desde la pantalla de admin — se fija a
// las 23:59 de la fecha del turno (no "ahora", que podría ser días después)
// como valor razonable por default; si hace falta un horario distinto, se
// puede afinar después desde "Editar" en la tabla de Asistencia Profesores.
export async function cerrarTurnoManual(id: string): Promise<HorarioProfesor> {
  const { data, error } = await supabase
    .from('horarios_profesor')
    .update({ hora_salida: '23:59' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as HorarioProfesor
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
