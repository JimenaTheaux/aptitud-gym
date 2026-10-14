// Fecha/hora "de hoy" de la app, siempre en hora argentina — fuente única para
// cualquier registro que guarde fecha u hora del momento (turnos, asistencias,
// pagos) y para los "hoy" de filtros y validaciones.
//
// No usar new Date().toISOString().slice(0, 10) para "hoy": devuelve la fecha
// UTC, y Argentina es UTC-3, así que desde las 21:00 ya da la fecha de mañana
// (bug del turno noche). Tampoco depender de la zona horaria configurada en el
// dispositivo: la zona va fija acá.

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires'

const FORMATO_FECHA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const FORMATO_HORA = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_HORARIA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function partes(formato: Intl.DateTimeFormat, fecha: Date): Record<string, string> {
  return Object.fromEntries(formato.formatToParts(fecha).map((p) => [p.type, p.value]))
}

// 'yyyy-MM-dd' en hora argentina.
export function fechaLocalISO(fecha: Date = new Date()): string {
  const p = partes(FORMATO_FECHA, fecha)
  return `${p.year}-${p.month}-${p.day}`
}

// 'HH:mm' (24hs) en hora argentina.
export function horaLocal(fecha: Date = new Date()): string {
  const p = partes(FORMATO_HORA, fecha)
  return `${p.hour}:${p.minute}`
}

// Aritmética sobre fechas 'yyyy-MM-dd' sin hora ni zona: se arma el día a las
// 00:00 UTC y se opera con getters UTC, así ningún corrimiento de zona puede
// cambiar el día.
function aFechaUTC(fechaISO: string): Date {
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia))
}

// 0 = domingo … 6 = sábado (mismo criterio que Date.getDay).
export function diaSemanaISO(fechaISO: string): number {
  return aFechaUTC(fechaISO).getUTCDay()
}

export function sumarDiasISO(fechaISO: string, dias: number): string {
  const d = aFechaUTC(fechaISO)
  d.setUTCDate(d.getUTCDate() + dias)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
