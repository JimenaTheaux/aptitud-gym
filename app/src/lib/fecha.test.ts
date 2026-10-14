import { afterEach, describe, expect, it, vi } from 'vitest'
import { diaSemanaISO, fechaLocalISO, horaLocal, sumarDiasISO } from './fecha'
import { hoyISO } from './formato'

// resumenes.ts importa el cliente de Supabase, que exige las env vars — acá
// solo se prueban sus helpers de fecha.
vi.mock('./supabase', () => ({ supabase: {} }))
const { inicioSemanaActual, finSemanaActual } = await import('./resumenes')

// Cada caso es un instante UTC con su fecha/hora esperada en Argentina (UTC-3).
// Desde las 21:00 ART el día UTC ya es el siguiente: es justo la franja del bug.
const CASOS = [
  { nombre: '20:59 ART', utc: '2026-10-13T23:59:00Z', fecha: '2026-10-13', hora: '20:59' },
  { nombre: '21:01 ART', utc: '2026-10-14T00:01:00Z', fecha: '2026-10-13', hora: '21:01' },
  { nombre: '23:59 ART', utc: '2026-10-14T02:59:00Z', fecha: '2026-10-13', hora: '23:59' },
  { nombre: '00:30 ART', utc: '2026-10-14T03:30:00Z', fecha: '2026-10-14', hora: '00:30' },
  { nombre: '31/10 21:30 ART (fin de mes)', utc: '2026-11-01T00:30:00Z', fecha: '2026-10-31', hora: '21:30' },
  { nombre: '31/12 21:30 ART (fin de año)', utc: '2027-01-01T00:30:00Z', fecha: '2026-12-31', hora: '21:30' },
]

describe('fecha local (America/Argentina/Buenos_Aires)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  for (const caso of CASOS) {
    it(caso.nombre, () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(caso.utc))
      expect(fechaLocalISO()).toBe(caso.fecha)
      expect(horaLocal()).toBe(caso.hora)
      expect(hoyISO()).toBe(caso.fecha)
    })
  }

  it('medianoche se formatea 00, no 24 (hourCycle h23)', () => {
    expect(horaLocal(new Date('2026-10-14T03:00:00Z'))).toBe('00:00')
  })

  it('suma días cruzando mes y año', () => {
    expect(sumarDiasISO('2026-10-31', 1)).toBe('2026-11-01')
    expect(sumarDiasISO('2026-12-31', 2)).toBe('2027-01-02')
    expect(sumarDiasISO('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('día de la semana (0 = domingo)', () => {
    expect(diaSemanaISO('2026-10-31')).toBe(6)
    expect(diaSemanaISO('2026-11-01')).toBe(0)
  })

  it('semana actual el sábado 31/10 a las 21:30 ART', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T00:30:00Z'))
    expect(inicioSemanaActual()).toBe('2026-10-25')
    expect(finSemanaActual()).toBe('2026-10-31')
  })

  it('semana actual el jueves 31/12 a las 21:30 ART', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-01T00:30:00Z'))
    expect(inicioSemanaActual()).toBe('2026-12-27')
    expect(finSemanaActual()).toBe('2027-01-02')
  })
})
