// Formato único de fecha/hora para toda la app — dd-MM-yyyy y 24hs (HH:mm).
// Ningún componente formatea fecha/hora "a mano": todo pasa por estas 2 funciones,
// para que un cambio futuro de formato se haga en un solo lugar.
//
// No afecta el almacenamiento: Postgres sigue recibiendo/devolviendo
// date/time/timestamptz en su formato estándar (yyyy-mm-dd, HH:mm:ss). Esto es
// solo presentación. Los <input type="date"/"time"> nativos también quedan
// afuera: su atributo `value` debe seguir siendo yyyy-mm-dd / HH:mm por spec de HTML,
// más allá de cómo el navegador lo muestre visualmente.

export function formatearFecha(fecha: string | Date): string {
  const date = typeof fecha === 'string' ? new Date(fecha.length <= 10 ? `${fecha}T00:00:00` : fecha) : fecha

  const partes = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date)

  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''

  return `${parte('day')}-${parte('month')}-${parte('year')}`
}

export function formatearHora(hora: string): string {
  const match = hora.match(/^(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : hora
}

export function formatearMonto(monto: number): string {
  return `$${Number(monto).toLocaleString('es-AR')}`
}

const MESES_ABREV = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]

// Nombres de mes en español, para selectores de período que no pueden depender
// de <input type="month"> nativo: ese control siempre se muestra en el idioma
// del navegador/SO del usuario, sin importar el `lang` de la página — por eso
// PeriodoField arma el selector "a mano" con estos nombres.
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// cargos.periodo se guarda como 'yyyy-MM' (ej. '2026-08'). En toda la UI se
// lee como 'AGO-26' — más legible de un vistazo que el formato de storage.
export function formatearPeriodo(periodo: string): string {
  const match = periodo.match(/^(\d{4})-(\d{2})$/)
  if (!match) return periodo

  const anio = match[1].slice(2)
  const mes = MESES_ABREV[Number(match[2]) - 1]
  if (!mes) return periodo

  return `${mes}-${anio}`
}

export function periodoActual(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

const CANTIDAD_DIAS_LABEL: Record<string, string> = {
  '2': '2 días',
  '3': '3 días',
  '5': '5 días',
  pase_libre: 'Pase libre',
}

export function formatearCantidadDias(valor: string | null): string | null {
  if (!valor) return null
  return CANTIDAD_DIAS_LABEL[valor] ?? valor
}

// Rango de fechas (inclusive) que cubre un período 'yyyy-MM' — usado para
// filtrar asistencias.fecha por mes calendario.
export function rangoDelMes(periodo: string): { inicio: string; fin: string } {
  const [anio, mes] = periodo.split('-').map(Number)
  const inicio = `${periodo}-01`
  const ultimoDia = new Date(anio, mes, 0).getDate()
  const fin = `${periodo}-${String(ultimoDia).padStart(2, '0')}`
  return { inicio, fin }
}
