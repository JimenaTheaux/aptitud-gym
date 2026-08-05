import { supabase } from './supabase'
import { FRANJAS_OCUPACION, type FranjaOcupacion } from '../config/ocupacion'
import { DIAS_SEMANA_ABREV, formatearFecha } from './formato'
import type { Asistencia } from '../types/db'

export type ColumnaOcupacion = { key: string; label: string }
export type FilaOcupacion = { franja: FranjaOcupacion; celdas: Record<string, number> }

export type OcupacionGrid = {
  // 'fecha': columnas = días puntuales del rango (rango corto).
  // 'dia_semana': columnas = Lun..Dom, celda = promedio redondeado de esa
  // combinación franja+día en el rango (rango largo, ej. mes/quincena).
  criterio: 'fecha' | 'dia_semana'
  columnas: ColumnaOcupacion[]
  filas: FilaOcupacion[]
}

// Asistencias de la disciplina de horario libre elegida, en el rango de
// fechas del mapa de calor. No trae detalle de alumno: acá solo importa el
// conteo por franja horaria.
export async function listAsistenciasParaOcupacion(
  desde: string,
  hasta: string,
  disciplinaId: string,
): Promise<Array<Pick<Asistencia, 'fecha' | 'hora'>>> {
  const { data, error } = await supabase
    .from('asistencias')
    .select('fecha, hora')
    .eq('disciplina_id', disciplinaId)
    .gte('fecha', desde)
    .lte('fecha', hasta)

  if (error) throw error
  return data ?? []
}

function horaABucket(hora: string): number {
  return Number(hora.slice(0, 2))
}

function franjaIndexDeHora(hora: number): number {
  return FRANJAS_OCUPACION.findIndex((f) => hora >= f.horaInicio && hora < f.horaFin)
}

// lunes = 0 ... domingo = 6, mismo criterio que rangoDeEstaSemana/DateField.
function fechaADiaSemana(fechaISO: string): number {
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  return (new Date(anio, mes - 1, dia).getDay() + 6) % 7
}

function listaDeFechas(desde: string, hasta: string): string[] {
  const [ai, mi, di] = desde.split('-').map(Number)
  const [af, mf, df] = hasta.split('-').map(Number)
  const cursor = new Date(ai, mi - 1, di)
  const fin = new Date(af, mf - 1, df)
  const fechas: string[] = []
  while (cursor <= fin) {
    fechas.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    )
    cursor.setDate(cursor.getDate() + 1)
  }
  return fechas
}

// Rangos de hasta 7 días (ej. "3 días", "Esta semana") muestran columnas por
// fecha puntual. Rangos más largos (ej. "Este mes", "Quincena") agrupan por
// franja + día de la semana, mostrando el PROMEDIO redondeado de esa
// combinación en el período — criterio confirmado con la admin para mostrar
// la ocupación típica de ese día/horario en vez de un pico aislado.
const DIAS_LIMITE_POR_FECHA = 7

export function construirGrillaOcupacion(
  asistencias: Array<Pick<Asistencia, 'fecha' | 'hora'>>,
  desde: string,
  hasta: string,
): OcupacionGrid {
  const fechas = listaDeFechas(desde, hasta)

  if (fechas.length <= DIAS_LIMITE_POR_FECHA) {
    const columnas: ColumnaOcupacion[] = fechas.map((f) => ({ key: f, label: formatearFecha(f) }))
    const filas: FilaOcupacion[] = FRANJAS_OCUPACION.map((franja) => {
      const celdas: Record<string, number> = {}
      for (const f of fechas) celdas[f] = 0
      return { franja, celdas }
    })

    for (const a of asistencias) {
      const franjaIndex = franjaIndexDeHora(horaABucket(a.hora))
      if (franjaIndex === -1) continue
      const fila = filas[franjaIndex]
      if (a.fecha in fila.celdas) fila.celdas[a.fecha] += 1
    }

    return { criterio: 'fecha', columnas, filas }
  }

  // Conteo real por fecha+franja, sin inventar ni descartar días sin datos —
  // se completan como 0 al promediar más abajo.
  const conteos = new Map<string, number>() // `${fecha}|${franjaIndex}` -> cantidad
  for (const a of asistencias) {
    const franjaIndex = franjaIndexDeHora(horaABucket(a.hora))
    if (franjaIndex === -1) continue
    const key = `${a.fecha}|${franjaIndex}`
    conteos.set(key, (conteos.get(key) ?? 0) + 1)
  }

  const fechasPorDiaSemana: string[][] = Array.from({ length: 7 }, () => [])
  for (const f of fechas) fechasPorDiaSemana[fechaADiaSemana(f)].push(f)

  const columnas: ColumnaOcupacion[] = DIAS_SEMANA_ABREV.map((label, i) => ({ key: String(i), label }))

  const filas: FilaOcupacion[] = FRANJAS_OCUPACION.map((franja, franjaIndex) => {
    const celdas: Record<string, number> = {}
    for (let dia = 0; dia < 7; dia++) {
      const fechasDelDia = fechasPorDiaSemana[dia]
      if (fechasDelDia.length === 0) {
        celdas[String(dia)] = 0
        continue
      }
      const total = fechasDelDia.reduce((acc, f) => acc + (conteos.get(`${f}|${franjaIndex}`) ?? 0), 0)
      celdas[String(dia)] = Math.round(total / fechasDelDia.length)
    }
    return { franja, celdas }
  })

  return { criterio: 'dia_semana', columnas, filas }
}
