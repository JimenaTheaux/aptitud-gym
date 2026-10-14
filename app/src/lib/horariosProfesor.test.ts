import { beforeEach, describe, expect, it, vi } from 'vitest'

// Cliente de Supabase falso: registra las llamadas a rpc() y a los INSERT
// del log, sin red ni env vars.
const rpc = vi.fn()
const insert = vi.fn()
const update = vi.fn()
const refreshSession = vi.fn()
vi.mock('./supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    auth: { refreshSession: () => refreshSession() },
    from: () => ({
      insert: (...args: unknown[]) => insert(...args),
      update: (valores: unknown) => {
        update(valores)
        return { eq: () => ({ select: () => ({ single: async () => ({ data: valores, error: null }) }) }) }
      },
    }),
  },
}))

const {
  calcularHorasTurno,
  cerrarTurnoManual,
  registrarEntradaProfesor,
  registrarSalidaProfesor,
  SinTurnoAbiertoError,
  TurnoAbiertoError,
} = await import('./horariosProfesor')

const ERROR_JWT = { data: null, error: { message: 'JWT issued at future', code: 'PGRST301' } }
const OK = { data: { id: 't1' }, error: null }

beforeEach(() => {
  rpc.mockReset()
  insert.mockReset()
  update.mockReset()
  refreshSession.mockReset()
  insert.mockResolvedValue({ error: null })
  refreshSession.mockResolvedValue({ error: null })
  vi.stubGlobal('navigator', { userAgent: 'TabletSucursal/1.0' })
})

describe('reintento ante error JWT (entrada/salida)', () => {
  it('salida: JWT → refresh → reintenta una vez y funciona', async () => {
    rpc.mockResolvedValueOnce(ERROR_JWT).mockResolvedValueOnce(OK)
    await expect(registrarSalidaProfesor('prof-1', 'suc-1')).resolves.toEqual({ id: 't1' })
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledTimes(2)
    // el primer fallo queda en el log, marcado como reintentado
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert.mock.calls[0][0].detalle).toContain('se reintenta')
  })

  it('entrada: si el reintento vuelve a fallar, NO hay un tercer intento', async () => {
    rpc.mockResolvedValue(ERROR_JWT)
    await expect(registrarEntradaProfesor('prof-1', 'suc-1')).rejects.toBeTruthy()
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(insert).toHaveBeenCalledTimes(2) // fallo inicial + fallo final
  })

  it('detecta JWT por mensaje aunque no venga el código PGRST301', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'JWT expired' } }).mockResolvedValueOnce(OK)
    await registrarEntradaProfesor('prof-1', 'suc-1')
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('si refreshSession falla, no reintenta', async () => {
    refreshSession.mockResolvedValue({ error: { message: 'refresh failed' } })
    rpc.mockResolvedValue(ERROR_JWT)
    await expect(registrarSalidaProfesor('prof-1', 'suc-1')).rejects.toBeTruthy()
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('un error que no es JWT no se reintenta', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'TURNO_ABIERTO: el profesor ya tiene…' } })
    await expect(registrarEntradaProfesor('prof-1', 'suc-1')).rejects.toBeInstanceOf(TurnoAbiertoError)
    expect(refreshSession).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})

describe('cerrarTurnoManual', () => {
  it('guarda la hora de salida ingresada, no 23:59', async () => {
    await cerrarTurnoManual('t1', '20:56')
    expect(update).toHaveBeenCalledWith({ hora_salida: '20:56' })
  })
})

describe('calcularHorasTurno', () => {
  it('turno normal', () => {
    expect(calcularHorasTurno('18:00', '21:30')).toBe(3.5)
  })

  it('entrada 23:30, salida 00:30 = 1 h (cruce de medianoche)', () => {
    expect(calcularHorasTurno('23:30:00', '00:30:00')).toBe(1)
  })

  it('entrada 20:00, salida 01:15 = 5,25 h', () => {
    expect(calcularHorasTurno('20:00', '01:15')).toBe(5.25)
  })

  it('turno abierto o de 0 minutos → null', () => {
    expect(calcularHorasTurno('20:00', null)).toBeNull()
    expect(calcularHorasTurno('20:00', '20:00')).toBeNull()
  })
})

describe('RPCs de entrada/salida (migración 17)', () => {
  it('la entrada no manda fecha ni hora — las calcula el server', async () => {
    rpc.mockResolvedValue({ data: { id: 't1' }, error: null })
    await registrarEntradaProfesor('prof-1', 'suc-1', '3hs')
    expect(rpc).toHaveBeenCalledWith('fn_registrar_entrada_profesor', {
      p_profesor_id: 'prof-1',
      p_sucursal_id: 'suc-1',
      p_modulo: '3hs',
    })
  })

  it('la salida cierra por profesor, no por id ni fecha', async () => {
    rpc.mockResolvedValue({ data: { id: 't1' }, error: null })
    await registrarSalidaProfesor('prof-1', 'suc-1')
    expect(rpc).toHaveBeenCalledWith('fn_registrar_salida_profesor', { p_profesor_id: 'prof-1' })
  })

  it('SIN_TURNO_ABIERTO → SinTurnoAbiertoError', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'SIN_TURNO_ABIERTO: el profesor no tiene…' } })
    await expect(registrarSalidaProfesor('prof-1', 'suc-1')).rejects.toBeInstanceOf(SinTurnoAbiertoError)
  })
})

describe('log de errores (migración 18)', () => {
  it('un error nuevo manda cliente_ts y user_agent (creado_por lo pone el server)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T00:30:00Z'))
    rpc.mockResolvedValue({ data: null, error: { message: 'JWT issued at future' } })

    await expect(registrarSalidaProfesor('prof-1', 'suc-1')).rejects.toBeTruthy()

    expect(insert).toHaveBeenCalledWith({
      operacion: 'salida',
      profesor_id: 'prof-1',
      sucursal_id: 'suc-1',
      detalle: 'JWT issued at future',
      cliente_ts: '2026-10-14T00:30:00.000Z',
      user_agent: 'TabletSucursal/1.0',
    })
    vi.useRealTimers()
  })
})
