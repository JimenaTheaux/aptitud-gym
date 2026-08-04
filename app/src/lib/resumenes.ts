import { supabase } from './supabase'
import { periodoActual, rangoDelMes } from './formato'
import type { Asistencia } from '../types/db'

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export type FranjaOcupacion = {
  diaSemana: string
  hora: string
  cantidad: number
}

export type MovimientoAlumnos = {
  altas: number
  asistenciasTotales: number
  alumnosUnicos: number
}

export type ResumenMensualData = MovimientoAlumnos & {
  periodo: string
}

// Semana calendario actual (domingo a sábado), usada para "horarios de mayor
// ocupación por semana" y el movimiento de corto plazo del resumen de profesor.
export function inicioSemanaActual(): string {
  const hoy = new Date()
  hoy.setDate(hoy.getDate() - hoy.getDay())
  return hoy.toISOString().slice(0, 10)
}

export function finSemanaActual(): string {
  const hoy = new Date()
  hoy.setDate(hoy.getDate() + (6 - hoy.getDay()))
  return hoy.toISOString().slice(0, 10)
}

async function listAsistenciasEnRango(inicio: string, fin: string): Promise<Asistencia[]> {
  const { data, error } = await supabase
    .from('asistencias')
    .select('*')
    .gte('fecha', inicio)
    .lte('fecha', fin)

  if (error) throw error
  return (data as Asistencia[]) ?? []
}

// Agrupa las asistencias de la semana actual por día + franja horaria (hora
// entera) para detectar los horarios de mayor ocupación (doc 04, sección 3).
export async function ocupacionSemanal(): Promise<FranjaOcupacion[]> {
  const asistencias = await listAsistenciasEnRango(inicioSemanaActual(), finSemanaActual())

  const conteos = new Map<string, FranjaOcupacion>()
  for (const a of asistencias) {
    const diaSemana = DIAS_SEMANA[new Date(`${a.fecha}T00:00:00`).getDay()]
    const hora = `${a.hora.slice(0, 2)}:00`
    const key = `${diaSemana}-${hora}`
    const actual = conteos.get(key) ?? { diaSemana, hora, cantidad: 0 }
    actual.cantidad += 1
    conteos.set(key, actual)
  }

  return [...conteos.values()].sort((a, b) => b.cantidad - a.cantidad)
}

// Movimiento de alumnos en un rango: asistencias totales, alumnos únicos que
// asistieron y altas nuevas (alumnos creados) dentro del período.
export async function movimientoAlumnos(inicio: string, fin: string): Promise<MovimientoAlumnos> {
  const asistencias = await listAsistenciasEnRango(inicio, fin)
  const alumnosUnicos = new Set(asistencias.map((a) => a.alumno_id)).size

  const { count, error } = await supabase
    .from('alumnos')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${inicio}T00:00:00`)
    .lte('created_at', `${fin}T23:59:59`)

  if (error) throw error

  return { altas: count ?? 0, asistenciasTotales: asistencias.length, alumnosUnicos }
}

export async function resumenMensual(periodo: string = periodoActual()): Promise<ResumenMensualData> {
  const { inicio, fin } = rangoDelMes(periodo)
  const movimiento = await movimientoAlumnos(inicio, fin)
  return { periodo, ...movimiento }
}
