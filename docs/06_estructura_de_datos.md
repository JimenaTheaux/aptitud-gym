# 06 — Estructura de datos (Fase 1)

Database-first: este schema se aplica y verifica ANTES de escribir un componente de UI.

## Entidades principales (borrador — ajustar con database-first al detalle)

```sql
sucursales
  id, nombre, activa (bool)  -- solo 1 fila activa en Fase 1, la 2da ya existe pero sin uso

perfiles  -- vinculado a Supabase Auth
  id (auth.uid()), nombre, rol (enum: admin|profesor), sucursal_id

alumnos
  id, dni (unique), apellido, nombre, fecha_nacimiento, celular,
  consideraciones (text libre), sucursal_alta_id (nullable, informativo —
  confirmado en el form de autoregistro, NO restringe a qué sucursal puede ir),
  estado_manual (nullable), created_at

  -- estado activo/inactivo: campo preparado, lógica de días pendiente de definir (ver doc 03)

disciplinas
  id, nombre, activa, sucursal_id, horario_libre (bool, default false)
  -- horario_libre = true (ej. musculación): sin franjas fijas,
  -- el alumno marca y queda la hora de entrada tal cual (ver doc 04)

horarios_disciplina
  id, disciplina_id, hora_inicio, hora_fin (nullable)
  -- Sin día de la semana (migración 08) — el horario no está atado a un día
  -- específico, solo define a qué hora empieza (y opcionalmente termina).
  -- No aplica a disciplinas con horario_libre = true (no tienen filas acá)

asistencias
  id, alumno_id, disciplina_id, fecha, hora, sucursal_id,
  profesor_id (quién marcó)

filas_fijadas  -- genérica, para la función "fijar fila" (migración 09)
  id, admin_id, tabla (text, identifica el listado: 'alumnos', 'deudores', etc.),
  registro_id (uuid de la fila fijada), created_at
  -- UNIQUE (admin_id, tabla, registro_id) — evita duplicados
  -- Límite de 5 por tabla se controla en el front, no en DB

profesores  -- roster de personas, separado del login compartido (migración 06)
  id, nombre, activo, created_at
  -- se usa para: elegir "quién recibió el pago" y para horarios_profesor.
  -- Distinto de `perfiles`: hoy hay 1 solo login profesor compartido,
  -- pero puede haber varios profesores reales en el roster.

cargos
  id, alumno_id, periodo, monto, disciplina_id, created_by (admin/profesor)
  -- snapshot: el monto queda congelado al momento de creación
  -- UNIQUE (alumno_id, periodo): un solo cargo por alumno por período (migración 04)
  -- monto puede ser $0 (clase de prueba/cortesía) — cuenta como "al día" directo

pagos  -- rediseñado en migración 06
  id, alumno_id, cargo_id (nullable — puede ser adelantado sin cargo aún),
  periodo (text 'YYYY-MM', propio del pago — no depende de cargo_id),
  sucursal_id (obligatorio — se elige en el form, ya no depende del contexto de sesión),
  fecha_pago (date, autocompletada con hoy, editable — distinta de created_at),
  profesor_id (references profesores — persona real que recibió el pago),
  disciplina_id (a qué disciplina corresponde),
  tipo_pago (enum: cuota | media_cuota | inicio_caja),
  detalle (text libre, distinto del tipo_pago),
  monto, forma_pago (enum: efectivo | transferencia | combinado),
  monto_efectivo, monto_transferencia (nullable, solo si forma_pago = combinado,
    deben sumar `monto`),
  parcial (bool), registrado_por (perfiles.id — login que cargó el registro, auditoría),
  validado_por (admin_id, nullable), validado_at (nullable), created_at

horarios_profesor
  id, profesor_id (references profesores, no perfiles — migración 06),
  sucursal_id (obligatorio, elegido en pantalla — migración 07),
  fecha, hora_entrada, hora_salida

notas_internas
  id, admin_id, texto, created_at

whatsapp_envios (log)
  id, alumno_id, plantilla_usada, enviado_por, created_at
```

## Modelo multi-sucursal (ver migración 02)
Ningún perfil (`admin`/`profesor`) queda restringido a una sucursal — RLS ya no filtra por `sucursal_id` del usuario. La sucursal es un dato del registro (`asistencias.sucursal_id`, `alumnos.sucursal_alta_id`), etiquetado por el contexto de sesión/dispositivo, no por el login. Rol `kiosco` agregado para el login "Alumnos" de check-in.

## Reglas de diseño heredadas (database-first, Tropa Gym)
- **Snapshots explícitos:** `cargos.monto` y `pagos.monto` nunca referencian un precio "vivo" — se congelan al momento de la transacción.
- **RPCs para toda operación multi-tabla:** validar un pago (escribe `pagos.validado_por` + recalcula estado de cuenta) siempre pasa por una función `SECURITY DEFINER`, nunca por updates sueltos desde el cliente.
- **RLS por tabla**, política de `perfiles` sin subquery recursiva.
- **Ningún cálculo de deuda es automático sin acción explícita** — igual que "generar cargos del período" en Tropa Gym: preview antes de confirmar.

## Tipos TS
Derivados a mano del schema en `src/types/db.ts`, mismas reglas que Tropa Gym (UUID→string, NUMERIC→number, enums→union types). No usar `supabase gen types`.

## Migraciones
Numeradas secuencialmente en `docs/migracion_NN_*.sql`, nunca se edita una ya aplicada.
