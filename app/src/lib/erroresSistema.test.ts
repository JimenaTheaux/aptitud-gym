import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))
const { limitesFiltroCreatedAt } = await import('./erroresSistema')

describe('filtro desde/hasta de errores del sistema (hora argentina)', () => {
  it('"hasta 13/10" incluye 21:00–23:59 ART y corta a las 00:00 ART del 14', () => {
    const { hastaExclusivo } = limitesFiltroCreatedAt(undefined, '2026-10-13')
    const fin = new Date(hastaExclusivo!).getTime()

    // 13/10 21:00 ART = 14/10 00:00 UTC; 23:59 ART = 14/10 02:59 UTC
    expect(new Date('2026-10-14T00:00:00Z').getTime()).toBeLessThan(fin)
    expect(new Date('2026-10-14T02:59:59Z').getTime()).toBeLessThan(fin)
    // 14/10 00:00 ART = 14/10 03:00 UTC → afuera
    expect(new Date('2026-10-14T03:00:00Z').getTime()).toBe(fin)
  })

  it('"desde 13/10" arranca a las 00:00 ART (03:00 UTC)', () => {
    const { desde } = limitesFiltroCreatedAt('2026-10-13')
    expect(new Date(desde!).toISOString()).toBe('2026-10-13T03:00:00.000Z')
  })

  it('fin de mes: "hasta 31/10" corta el 01/11 00:00 ART', () => {
    expect(limitesFiltroCreatedAt(undefined, '2026-10-31').hastaExclusivo).toBe('2026-11-01T00:00:00-03:00')
  })

  it('sin filtros, sin límites', () => {
    expect(limitesFiltroCreatedAt()).toEqual({ desde: undefined, hastaExclusivo: undefined })
  })
})
