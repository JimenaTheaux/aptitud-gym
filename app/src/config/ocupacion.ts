// Franjas horarias reales de apertura de la sala de musculación (confirmado
// con la admin, 2026-08) — dos bloques con corte al mediodía. Fácil de
// ajustar: agregar/quitar bloques acá impacta directo las filas de la grilla
// del mapa de calor de ocupación (doc 04, "Resúmenes → Turnos").
export type FranjaOcupacion = { horaInicio: number; horaFin: number; label: string }

function construirFranjas(bloques: Array<[number, number]>): FranjaOcupacion[] {
  const franjas: FranjaOcupacion[] = []
  for (const [desde, hasta] of bloques) {
    for (let h = desde; h < hasta; h++) {
      franjas.push({ horaInicio: h, horaFin: h + 1, label: `${h}-${h + 1}` })
    }
  }
  return franjas
}

export const FRANJAS_OCUPACION: FranjaOcupacion[] = construirFranjas([
  [7, 10],
  [14, 22],
])

// Umbrales de ocupación (doc 08, "Mapa de calor de ocupación") — capacidad
// total de la sala asumida en 7. Ajustar solo estos 2 números si la admin
// confirma un número real distinto.
export type NivelOcupacion = 'libre' | 'cupos' | 'llena'

const UMBRAL_CUPOS = 4 // 0-3 = libre, 4-6 = quedan cupos
const UMBRAL_LLENA = 7 // 7+ = capacidad llena

export function nivelDeOcupacion(cantidad: number): NivelOcupacion {
  if (cantidad >= UMBRAL_LLENA) return 'llena'
  if (cantidad >= UMBRAL_CUPOS) return 'cupos'
  return 'libre'
}

export const OCUPACION_CONFIG: Record<NivelOcupacion, { bg: string; text: string; label: string }> = {
  libre: { bg: 'bg-accent-cyan', text: 'text-text-on-accent', label: 'Libre' },
  cupos: { bg: 'bg-estado-pendiente-bar', text: 'text-text-on-accent', label: 'Quedan cupos' },
  // Texto oscuro propio (no text-on-accent): mejor contraste sobre el rojo que
  // sobre cyan/naranja (doc 08).
  llena: { bg: 'bg-estado-deuda-bar', text: 'text-[#4A1010]', label: 'Capacidad llena' },
}
