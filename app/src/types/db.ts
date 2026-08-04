// Tipos derivados a mano de schema/migracion_01_schema_inicial.sql + migracion_02_multisucursal.sql
// + migracion_03_horario_libre.sql + migracion_04_quitar_hora_fin.sql + migracion_05_fix_sucursal_activa.sql
// + migracion_06_alumnos_update_profesor.sql + migracion_07_pagos_por_periodo.sql
// + migracion_08_pagos_periodo_not_null.sql + migracion_09_pagos_sucursal.sql
// + migracion_06_reset_y_pagos_v2.sql + migracion_07_sucursal_horarios_profesor.sql
// + migracion_10_alumnos_delete_y_configuracion_whatsapp.sql
// + migracion_09_filas_fijadas.sql
// Reglas: UUID -> string, NUMERIC/INTEGER -> number, DATE/TIME/TIMESTAMPTZ -> string, enums -> union types
// No usar `supabase gen types` (ver skills/database-first/SKILL.md)

export type RolUsuario = 'admin' | 'profesor' | 'kiosco'
export type FormaPago = 'efectivo' | 'transferencia' | 'combinado'
export type TipoPago = 'cuota' | 'media_cuota' | 'inicio_caja'

export type Sucursal = {
  id: string
  nombre: string
  activa: boolean
  created_at: string
}

export type Perfil = {
  id: string
  nombre: string
  rol: RolUsuario
  sucursal_id: string | null
  created_at: string
}

export type Alumno = {
  id: string
  dni: string
  apellido: string
  nombre: string
  fecha_nacimiento: string | null
  celular: string | null
  consideraciones: string | null
  sucursal_alta_id: string | null
  estado_manual: string | null
  created_at: string
}

export type Disciplina = {
  id: string
  nombre: string
  activa: boolean
  sucursal_id: string
  horario_libre: boolean
  created_at: string
}

export type HorarioDisciplina = {
  id: string
  disciplina_id: string
  hora_inicio: string
}

export type Asistencia = {
  id: string
  alumno_id: string
  disciplina_id: string | null
  fecha: string
  hora: string
  sucursal_id: string
  profesor_id: string | null
  created_at: string
}

export type Cargo = {
  id: string
  alumno_id: string
  periodo: string
  monto: number
  disciplina_id: string | null
  created_by: string | null
  created_at: string
}

export type Pago = {
  id: string
  alumno_id: string
  cargo_id: string | null
  periodo: string
  sucursal_id: string
  // Fecha propia del pago (autocompletada con hoy, editable) — distinta de created_at.
  fecha_pago: string
  // Persona real que recibió el pago (roster `profesores`, no el login de sesión).
  profesor_id: string | null
  disciplina_id: string | null
  tipo_pago: TipoPago
  // Texto libre, distinto de tipo_pago.
  detalle: string | null
  monto: number
  forma_pago: FormaPago
  // Solo se completan si forma_pago = 'combinado' — deben sumar `monto`.
  monto_efectivo: number | null
  monto_transferencia: number | null
  parcial: boolean
  registrado_por: string
  validado_por: string | null
  validado_at: string | null
  created_at: string
}

export type Profesor = {
  id: string
  nombre: string
  activo: boolean
  created_at: string
}

export type HorarioProfesor = {
  id: string
  // references `profesores`, no `perfiles` (migración 06 reset + pagos v2)
  profesor_id: string
  // obligatorio, elegido en pantalla (migración 07) — dato del registro, no
  // restricción de acceso (ver doc 02)
  sucursal_id: string
  fecha: string
  hora_entrada: string | null
  hora_salida: string | null
}

export type NotaInterna = {
  id: string
  admin_id: string
  texto: string
  created_at: string
}

export type WhatsappEnvio = {
  id: string
  alumno_id: string
  plantilla_usada: string
  enviado_por: string
  created_at: string
}

// Fila única (id = 1) con las plantillas de mensaje configurables desde
// Configuración > WhatsApp (migración 10).
export type ConfiguracionWhatsapp = {
  id: number
  mensaje_deudores: string
  mensaje_bienvenida: string
  updated_by: string | null
  updated_at: string
}

// Genérica, para "fijar fila" en cualquier listado (migración 09). `tabla`
// identifica el listado ('alumnos', 'deudores', 'historial_pagos', etc.) y
// `registro_id` es el id de la fila fijada dentro de esa tabla. Límite de 5
// por (admin_id, tabla) se controla en el front, no en DB.
export type FilaFijada = {
  id: string
  admin_id: string
  tabla: string
  registro_id: string
  created_at: string
}
