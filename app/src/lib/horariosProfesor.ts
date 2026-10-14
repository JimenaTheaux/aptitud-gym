import { supabase } from './supabase'
import type { HorarioProfesor, Modulo, TurnoAbiertoProlongado } from '../types/db'

// Lanzado por registrarEntradaProfesor cuando el RPC rechaza la entrada
// porque el profesor ya tiene un turno abierto, de cualquier fecha
// (migración 17) — permite al llamador distinguir este caso de un error
// genérico y mostrar un mensaje específico en vez de "no se pudo, probá de nuevo".
export class TurnoAbiertoError extends Error {}

// Lanzado por registrarSalidaProfesor cuando el RPC no encuentra un turno
// abierto para cerrar (migración 17) — típicamente otro dispositivo ya
// registró la salida y el estado en pantalla quedó viejo.
export class SinTurnoAbiertoError extends Error {}

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

// Best-effort: si el log mismo falla (ej. sin conexión — el mismo corte que
// hizo fallar la operación original) no debe tapar el error real ni romper
// el flujo, así que nunca propaga.
//
// creado_por lo completa el server (default auth.uid(), migración 18).
// cliente_ts es el reloj del dispositivo: comparado con created_at (reloj del
// server) da el desfase — clave para errores tipo "JWT issued at future".
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
      cliente_ts: new Date().toISOString(),
      user_agent: navigator.userAgent,
    })
  } catch {
    // no-op
  }
}

type ErrorRpc = { message: string; code?: string }

// Token rechazado por PostgREST: vencido, o "JWT issued at future" cuando el
// reloj del server que valida va apenas detrás del que lo emitió.
function esErrorJwt(error: ErrorRpc): boolean {
  return error.code === 'PGRST301' || error.message.includes('JWT')
}

// Solo para entrada/salida de profesores: si el RPC falla por el token, se
// refresca la sesión y se reintenta UNA vez. Es seguro reintentar: un request
// rechazado por JWT no llegó a ejecutarse, y aun si lo hubiera hecho, el RPC
// rechaza una segunda entrada (TURNO_ABIERTO) o una segunda salida
// (SIN_TURNO_ABIERTO). El primer fallo se loguea igual — sin eso el log
// perdería la frecuencia real de errores JWT (y el desfase vía cliente_ts).
async function rpcConReintentoJwt(
  funcion: string,
  params: Record<string, unknown>,
  operacion: 'entrada' | 'salida',
  profesorId: string,
  sucursalId: string | null,
): Promise<{ data: unknown; error: ErrorRpc | null }> {
  const primera = await supabase.rpc(funcion, params)
  if (!primera.error || !esErrorJwt(primera.error)) return primera

  await logErrorSistema(
    operacion,
    `${primera.error.message} (se reintenta tras refrescar la sesión)`,
    profesorId,
    sucursalId,
  )
  const { error: errorRefresh } = await supabase.auth.refreshSession()
  if (errorRefresh) return primera

  return supabase.rpc(funcion, params)
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

// Turnos abiertos (todas las sucursales, cualquier fecha) — usado por las
// mini cards para saber quién tiene turno abierto ahora mismo, sin importar
// dónde lo abrió. Sin filtro de fecha (migración 17): un turno noche abierto
// antes de medianoche sigue en curso después.
export async function listTurnosAbiertos(): Promise<HorarioProfesorConNombre[]> {
  const { data, error } = await supabase
    .from('horarios_profesor')
    .select('*, profesor:profesores(nombre), sucursal:sucursales(nombre)')
    .is('hora_salida', null)
    .order('fecha')

  if (error) throw error
  return (data as HorarioProfesorConNombre[]) ?? []
}

// Vía RPC (migraciones 16/17), no INSERT directo: el server valida de forma
// atómica que el profesor no tenga ya un turno abierto antes de insertar, y
// calcula fecha/hora en hora argentina — el cliente no manda ni fecha ni hora,
// así no dependen del reloj ni de la zona del dispositivo.
export async function registrarEntradaProfesor(
  profesorId: string,
  sucursalId: string,
  modulo: Modulo | null = null,
): Promise<HorarioProfesor> {
  const { data, error } = await rpcConReintentoJwt(
    'fn_registrar_entrada_profesor',
    { p_profesor_id: profesorId, p_sucursal_id: sucursalId, p_modulo: modulo },
    'entrada',
    profesorId,
    sucursalId,
  )

  if (error) {
    await logErrorSistema('entrada', error.message, profesorId, sucursalId)
    if (error.message.includes('TURNO_ABIERTO')) {
      throw new TurnoAbiertoError('El profesor ya tiene un turno abierto.')
    }
    throw error
  }
  return data as HorarioProfesor
}

// Vía RPC (migración 17): el server cierra el turno abierto más reciente del
// profesor, sin filtrar por fecha, con la hora del servidor en hora argentina.
export async function registrarSalidaProfesor(
  profesorId: string,
  sucursalId: string | null = null,
): Promise<HorarioProfesor> {
  const { data, error } = await rpcConReintentoJwt(
    'fn_registrar_salida_profesor',
    { p_profesor_id: profesorId },
    'salida',
    profesorId,
    sucursalId,
  )

  if (error) {
    await logErrorSistema('salida', error.message, profesorId, sucursalId)
    if (error.message.includes('SIN_TURNO_ABIERTO')) {
      throw new SinTurnoAbiertoError('El profesor no tiene un turno abierto.')
    }
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

// Turnos con hora_salida null abiertos hace más de 14 h (migración 17, vista
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

// Cierre manual de un turno huérfano desde la pantalla de admin, con la hora
// de salida real que ingresa la admin ('HH:mm') — no un valor fijo, que
// inflaba o achicaba las horas del turno. Si es menor que la entrada, el
// turno cruzó la medianoche (calcularHorasTurno suma 24 h).
export async function cerrarTurnoManual(id: string, horaSalida: string): Promise<HorarioProfesor> {
  const { data, error } = await supabase
    .from('horarios_profesor')
    .update({ hora_salida: horaSalida })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as HorarioProfesor
}

// Si la salida es menor que la entrada, el turno cruzó la medianoche
// (ej. 23:30 → 00:30): se suman 24 h.
function horasEntre(entrada: string, salida: string): number {
  const [hE, mE] = entrada.split(':').map(Number)
  const [hS, mS] = salida.split(':').map(Number)
  let minutos = hS * 60 + mS - (hE * 60 + mE)
  if (minutos < 0) minutos += 24 * 60
  return minutos / 60
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
