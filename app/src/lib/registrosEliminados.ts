import { supabase } from './supabase'
import { formatearCantidadDias, formatearFecha, formatearHora, formatearMonto, formatearPeriodo } from './formato'
import type { RegistroEliminado } from '../types/db'

export type RegistroEliminadoConDetalle = RegistroEliminado & {
  admin: { nombre: string } | null
}

// Tablas operativas con trigger de log habilitado (migración 13) — mismo
// orden que el dropdown de filtro de la pantalla.
export const TABLAS_CON_LOG: { value: string; label: string }[] = [
  { value: 'alumnos', label: 'Alumnos' },
  { value: 'asistencias', label: 'Asistencias' },
  { value: 'cargos', label: 'Cargos' },
  { value: 'pagos', label: 'Pagos' },
  { value: 'disciplinas', label: 'Disciplinas' },
  { value: 'horarios_disciplina', label: 'Horarios de disciplina' },
  { value: 'horarios_profesor', label: 'Horarios de profesor' },
  { value: 'profesores', label: 'Profesores' },
]

const TABLA_LABEL: Record<string, string> = Object.fromEntries(
  TABLAS_CON_LOG.map((t) => [t.value, t.label]),
)

export function tablaLabel(tabla: string): string {
  return TABLA_LABEL[tabla] ?? tabla
}

export async function listRegistrosEliminados(
  filtros: { tabla?: string; desde?: string; hasta?: string } = {},
): Promise<RegistroEliminadoConDetalle[]> {
  let query = supabase
    .from('registros_eliminados')
    .select('*, admin:perfiles(nombre)')
    .order('eliminado_at', { ascending: false })

  if (filtros.tabla) query = query.eq('tabla', filtros.tabla)
  if (filtros.desde) query = query.gte('eliminado_at', `${filtros.desde}T00:00:00`)
  if (filtros.hasta) query = query.lte('eliminado_at', `${filtros.hasta}T23:59:59`)

  const { data, error } = await query
  if (error) throw error
  return (data as RegistroEliminadoConDetalle[]) ?? []
}

function strCampo(datos: Record<string, unknown>, campo: string): string | null {
  const valor = datos[campo]
  return typeof valor === 'string' ? valor : null
}

function numCampo(datos: Record<string, unknown>, campo: string): number | null {
  const valor = datos[campo]
  return typeof valor === 'number' ? valor : null
}

// Resumen legible de "qué era" la fila borrada, para la columna principal
// del listado — el JSON completo queda para el Drawer de detalle (doc de
// referencia: prompt "Registros eliminados").
export function resumenRegistroEliminado(registro: RegistroEliminado): string {
  const { tabla, datos } = registro

  switch (tabla) {
    case 'alumnos': {
      const apellido = strCampo(datos, 'apellido')
      const nombre = strCampo(datos, 'nombre')
      const dni = strCampo(datos, 'dni')
      if (!apellido && !nombre) return 'Alumno'
      return `${apellido ?? ''}, ${nombre ?? ''}${dni ? ` (DNI ${dni})` : ''}`.trim()
    }
    case 'pagos': {
      const monto = numCampo(datos, 'monto')
      const periodo = strCampo(datos, 'periodo')
      if (monto == null) return 'Pago'
      return `${formatearMonto(monto)}${periodo ? ` — ${formatearPeriodo(periodo)}` : ''}`
    }
    case 'cargos': {
      const monto = numCampo(datos, 'monto')
      const periodo = strCampo(datos, 'periodo')
      if (monto == null) return 'Cargo'
      return `${formatearMonto(monto)}${periodo ? ` — ${formatearPeriodo(periodo)}` : ''}`
    }
    case 'asistencias': {
      const fecha = strCampo(datos, 'fecha')
      const hora = strCampo(datos, 'hora')
      if (!fecha) return 'Asistencia'
      return `${formatearFecha(fecha)}${hora ? ` ${formatearHora(hora)}` : ''}`
    }
    default: {
      const nombre = strCampo(datos, 'nombre')
      return nombre ?? tablaLabel(tabla)
    }
  }
}

function formatearFechaHora(iso: string): string {
  const hora = new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${formatearFecha(iso)} · ${hora}`
}

const TIPO_PAGO_LABEL: Record<string, string> = {
  cuota: 'Cuota',
  media_cuota: 'Media cuota',
  inicio_caja: 'Inicio de caja',
}

const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  combinado: 'Combinado',
}

// Nombre simple de una tabla "estable" (sin log de borrado, ver migración 13:
// sucursales/perfiles no tienen trigger) — alcanza con la fila viva.
async function nombreSimple(tabla: 'sucursales' | 'perfiles', id: string | null): Promise<string | null> {
  if (!id) return null
  const { data } = await supabase.from(tabla).select('nombre').eq('id', id).maybeSingle()
  return data?.nombre ?? null
}

// Nombre de una entidad referenciada que sí tiene log de borrado (alumnos,
// disciplinas, profesores, cargos). Si la fila ya no existe en su tabla
// (ej. se borró en cascada junto con el registro actual) cae al último log
// de esa misma fila, para no perder el dato — se marca "(eliminado)".
async function nombreRelacionado(tabla: string, id: string | null): Promise<string | null> {
  if (!id) return null

  const { data } = await supabase.from(tabla).select('*').eq('id', id).maybeSingle()
  if (data) {
    return resumenRegistroEliminado({
      id: '',
      tabla,
      registro_id: id,
      datos: data as Record<string, unknown>,
      eliminado_por: null,
      eliminado_at: '',
    })
  }

  const { data: log } = await supabase
    .from('registros_eliminados')
    .select('*')
    .eq('tabla', tabla)
    .eq('registro_id', id)
    .order('eliminado_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!log) return null
  return `${resumenRegistroEliminado(log as RegistroEliminado)} (eliminado)`
}

export type CampoDetalle = { label: string; valor: string }

const SIN_DATO = '—'

// Traduce el snapshot jsonb crudo de un registro eliminado a una lista de
// campos legibles para el cliente (Drawer de detalle): resuelve los *_id a
// nombres y formatea fechas/montos con las mismas reglas que el resto de la
// app, en vez de mostrar el JSON tal cual viene de la base.
export async function detalleLegible(registro: RegistroEliminado): Promise<CampoDetalle[]> {
  const { tabla, datos } = registro

  switch (tabla) {
    case 'alumnos': {
      const [sucursal] = await Promise.all([
        nombreSimple('sucursales', strCampo(datos, 'sucursal_alta_id')),
      ])
      return [
        { label: 'Apellido y nombre', valor: `${strCampo(datos, 'apellido') ?? ''}, ${strCampo(datos, 'nombre') ?? ''}` },
        { label: 'DNI', valor: strCampo(datos, 'dni') ?? SIN_DATO },
        {
          label: 'Fecha de nacimiento',
          valor: strCampo(datos, 'fecha_nacimiento') ? formatearFecha(strCampo(datos, 'fecha_nacimiento')!) : SIN_DATO,
        },
        { label: 'Celular', valor: strCampo(datos, 'celular') ?? SIN_DATO },
        { label: 'Días por semana', valor: formatearCantidadDias(strCampo(datos, 'cantidad_dias')) ?? SIN_DATO },
        { label: 'Consideraciones', valor: strCampo(datos, 'consideraciones') ?? SIN_DATO },
        { label: 'Sucursal de alta', valor: sucursal ?? SIN_DATO },
        { label: 'Estado manual', valor: strCampo(datos, 'estado_manual') ?? SIN_DATO },
        { label: 'Creado', valor: strCampo(datos, 'created_at') ? formatearFechaHora(strCampo(datos, 'created_at')!) : SIN_DATO },
      ]
    }

    case 'asistencias': {
      const [alumno, disciplina, sucursal, profesor] = await Promise.all([
        nombreRelacionado('alumnos', strCampo(datos, 'alumno_id')),
        nombreRelacionado('disciplinas', strCampo(datos, 'disciplina_id')),
        nombreSimple('sucursales', strCampo(datos, 'sucursal_id')),
        nombreRelacionado('profesores', strCampo(datos, 'profesor_id')),
      ])
      return [
        { label: 'Alumno', valor: alumno ?? SIN_DATO },
        { label: 'Fecha', valor: strCampo(datos, 'fecha') ? formatearFecha(strCampo(datos, 'fecha')!) : SIN_DATO },
        { label: 'Hora', valor: strCampo(datos, 'hora') ? formatearHora(strCampo(datos, 'hora')!) : SIN_DATO },
        { label: 'Disciplina', valor: disciplina ?? SIN_DATO },
        { label: 'Sucursal', valor: sucursal ?? SIN_DATO },
        { label: 'Profesor', valor: profesor ?? SIN_DATO },
        { label: 'Registrado', valor: strCampo(datos, 'created_at') ? formatearFechaHora(strCampo(datos, 'created_at')!) : SIN_DATO },
      ]
    }

    case 'cargos': {
      const [alumno, disciplina, creadoPor] = await Promise.all([
        nombreRelacionado('alumnos', strCampo(datos, 'alumno_id')),
        nombreRelacionado('disciplinas', strCampo(datos, 'disciplina_id')),
        nombreSimple('perfiles', strCampo(datos, 'created_by')),
      ])
      return [
        { label: 'Alumno', valor: alumno ?? SIN_DATO },
        { label: 'Período', valor: strCampo(datos, 'periodo') ? formatearPeriodo(strCampo(datos, 'periodo')!) : SIN_DATO },
        { label: 'Monto', valor: numCampo(datos, 'monto') != null ? formatearMonto(numCampo(datos, 'monto')!) : SIN_DATO },
        { label: 'Disciplina', valor: disciplina ?? SIN_DATO },
        { label: 'Creado por', valor: creadoPor ?? SIN_DATO },
        { label: 'Creado', valor: strCampo(datos, 'created_at') ? formatearFechaHora(strCampo(datos, 'created_at')!) : SIN_DATO },
      ]
    }

    case 'pagos': {
      const [alumno, cargo, sucursal, profesor, disciplina, registradoPor, validadoPor] = await Promise.all([
        nombreRelacionado('alumnos', strCampo(datos, 'alumno_id')),
        nombreRelacionado('cargos', strCampo(datos, 'cargo_id')),
        nombreSimple('sucursales', strCampo(datos, 'sucursal_id')),
        nombreRelacionado('profesores', strCampo(datos, 'profesor_id')),
        nombreRelacionado('disciplinas', strCampo(datos, 'disciplina_id')),
        nombreSimple('perfiles', strCampo(datos, 'registrado_por')),
        nombreSimple('perfiles', strCampo(datos, 'validado_por')),
      ])
      const tipoPago = strCampo(datos, 'tipo_pago')
      const formaPago = strCampo(datos, 'forma_pago')
      const validadoAt = strCampo(datos, 'validado_at')
      const montoEfectivo = numCampo(datos, 'monto_efectivo')
      const montoTransferencia = numCampo(datos, 'monto_transferencia')
      return [
        { label: 'Alumno', valor: alumno ?? SIN_DATO },
        { label: 'Cargo asociado', valor: cargo ?? SIN_DATO },
        { label: 'Período', valor: strCampo(datos, 'periodo') ? formatearPeriodo(strCampo(datos, 'periodo')!) : SIN_DATO },
        { label: 'Sucursal', valor: sucursal ?? SIN_DATO },
        { label: 'Fecha de pago', valor: strCampo(datos, 'fecha_pago') ? formatearFecha(strCampo(datos, 'fecha_pago')!) : SIN_DATO },
        { label: 'Profesor', valor: profesor ?? SIN_DATO },
        { label: 'Disciplina', valor: disciplina ?? SIN_DATO },
        { label: 'Tipo de pago', valor: (tipoPago && TIPO_PAGO_LABEL[tipoPago]) ?? SIN_DATO },
        { label: 'Detalle', valor: strCampo(datos, 'detalle') ?? SIN_DATO },
        { label: 'Monto', valor: numCampo(datos, 'monto') != null ? formatearMonto(numCampo(datos, 'monto')!) : SIN_DATO },
        { label: 'Forma de pago', valor: (formaPago && FORMA_PAGO_LABEL[formaPago]) ?? SIN_DATO },
        { label: 'Monto efectivo', valor: montoEfectivo != null ? formatearMonto(montoEfectivo) : SIN_DATO },
        { label: 'Monto transferencia', valor: montoTransferencia != null ? formatearMonto(montoTransferencia) : SIN_DATO },
        { label: 'Pago parcial', valor: datos.parcial ? 'Sí' : 'No' },
        { label: 'Registrado por', valor: registradoPor ?? SIN_DATO },
        { label: 'Validado por', valor: validadoPor ?? SIN_DATO },
        { label: 'Validado', valor: validadoAt ? formatearFechaHora(validadoAt) : SIN_DATO },
        { label: 'Creado', valor: strCampo(datos, 'created_at') ? formatearFechaHora(strCampo(datos, 'created_at')!) : SIN_DATO },
      ]
    }

    case 'disciplinas': {
      const [sucursal] = await Promise.all([nombreSimple('sucursales', strCampo(datos, 'sucursal_id'))])
      return [
        { label: 'Nombre', valor: strCampo(datos, 'nombre') ?? SIN_DATO },
        { label: 'Activa', valor: datos.activa ? 'Sí' : 'No' },
        { label: 'Sucursal', valor: sucursal ?? SIN_DATO },
        { label: 'Horario libre', valor: datos.horario_libre ? 'Sí' : 'No' },
        { label: 'Creada', valor: strCampo(datos, 'created_at') ? formatearFechaHora(strCampo(datos, 'created_at')!) : SIN_DATO },
      ]
    }

    case 'horarios_disciplina': {
      const [disciplina] = await Promise.all([nombreRelacionado('disciplinas', strCampo(datos, 'disciplina_id'))])
      return [
        { label: 'Disciplina', valor: disciplina ?? SIN_DATO },
        { label: 'Hora de inicio', valor: strCampo(datos, 'hora_inicio') ? formatearHora(strCampo(datos, 'hora_inicio')!) : SIN_DATO },
      ]
    }

    case 'horarios_profesor': {
      const [profesor, sucursal] = await Promise.all([
        nombreRelacionado('profesores', strCampo(datos, 'profesor_id')),
        nombreSimple('sucursales', strCampo(datos, 'sucursal_id')),
      ])
      return [
        { label: 'Profesor', valor: profesor ?? SIN_DATO },
        { label: 'Sucursal', valor: sucursal ?? SIN_DATO },
        { label: 'Fecha', valor: strCampo(datos, 'fecha') ? formatearFecha(strCampo(datos, 'fecha')!) : SIN_DATO },
        { label: 'Hora de entrada', valor: strCampo(datos, 'hora_entrada') ? formatearHora(strCampo(datos, 'hora_entrada')!) : SIN_DATO },
        { label: 'Hora de salida', valor: strCampo(datos, 'hora_salida') ? formatearHora(strCampo(datos, 'hora_salida')!) : SIN_DATO },
        { label: 'Módulo', valor: strCampo(datos, 'modulo') ?? SIN_DATO },
      ]
    }

    case 'profesores': {
      return [
        { label: 'Nombre', valor: strCampo(datos, 'nombre') ?? SIN_DATO },
        { label: 'Activo', valor: datos.activo ? 'Sí' : 'No' },
        { label: 'Creado', valor: strCampo(datos, 'created_at') ? formatearFechaHora(strCampo(datos, 'created_at')!) : SIN_DATO },
      ]
    }

    default:
      return Object.entries(datos).map(([campo, valor]) => ({
        label: campo,
        valor: valor == null ? SIN_DATO : String(valor),
      }))
  }
}
