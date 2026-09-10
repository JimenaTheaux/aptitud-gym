-- ============================================================
-- APTITUD CENTRO — Migración 16: atomicidad y observabilidad de
-- horarios_profesor (entrada/salida de profesores)
--
-- Motivación (diagnóstico previo, doc de referencia: "Entrada/salida
-- profesores"): dos dispositivos con el login `profesor` compartido podían
-- registrar entrada para el mismo profesor casi al mismo tiempo y generar
-- dos filas con hora_salida null — nada en la base lo impedía, solo el
-- estado en memoria del cliente (turnosHoy). Esta migración cierra esa
-- carrera a nivel de base y agrega visibilidad de fallas.
--
-- Hace 4 cosas:
-- 1. Unique index parcial: un profesor no puede tener dos filas abiertas
--    (hora_salida is null) el mismo día. Es la garantía real ante inserts
--    concurrentes — un índice único rechaza al segundo INSERT sin importar
--    el timing, a diferencia de cualquier chequeo hecho en el cliente.
-- 2. Tabla `errores_sistema`: log de fallas de INSERT/UPDATE sobre
--    horarios_profesor, escrito desde el cliente (app/src/lib/horariosProfesor.ts)
--    en el catch de cada operación — no desde un trigger, porque un trigger
--    que loguea y vuelve a lanzar la excepción original perdería el log al
--    hacer rollback de la transacción completa (mismo motivo por el que
--    fn_registrar_entrada_profesor tampoco loguea acá adentro).
-- 3. RPC `fn_registrar_entrada_profesor`: valida "¿ya tiene turno abierto
--    hoy?" y hace el INSERT en un solo viaje al server. El chequeo previo
--    da un mensaje claro en el caso común; la garantía real ante la carrera
--    es el unique_violation del punto 1, capturado acá y traducido al mismo
--    mensaje. Recibe fecha/hora ya calculadas por el cliente (no
--    current_date/current_time) para no cambiar el comportamiento actual:
--    horariosProfesor.ts calcula "hoy"/"ahora" con el reloj local del
--    dispositivo (fechaHoy/horaAhora), y el server de Supabase corre en
--    UTC — usar current_date/current_time acá habría corrido los horarios
--    registrados varias horas.
-- 4. Vista `turnos_abiertos_prolongados`: turnos con hora_salida null de
--    días anteriores a hoy — el resabio típico de una fila huérfana (ya sea
--    por el bug de carrera que esto corrige, o porque alguien se olvidó de
--    marcar salida). Filtra admin-only adentro de la propia vista
--    (public.mi_rol() = 'admin'), mismo criterio que registros_eliminados.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Unique index parcial — un turno abierto por profesor y por día
-- ----------------------------------------------------------------
-- Antes de crearlo, esperado 0 filas (si hay duplicados reales de un bug
-- previo, hay que cerrarlos a mano primero o el CREATE INDEX falla):
--   select profesor_id, fecha, count(*) from horarios_profesor
--     where hora_salida is null group by 1, 2 having count(*) > 1;

create unique index if not exists idx_horarios_profesor_turno_abierto_dia
  on horarios_profesor (profesor_id, fecha)
  where hora_salida is null;

-- ----------------------------------------------------------------
-- 2. errores_sistema — log de fallas de INSERT/UPDATE en horarios_profesor
-- ----------------------------------------------------------------
create table if not exists errores_sistema (
  id uuid primary key default gen_random_uuid(),
  -- qué se intentaba hacer: 'entrada' | 'salida' | 'edicion'
  operacion text not null,
  profesor_id uuid references profesores(id) on delete set null,
  sucursal_id uuid references sucursales(id) on delete set null,
  detalle text not null,
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_errores_sistema_created_at on errores_sistema(created_at desc);
create index if not exists idx_errores_sistema_operacion on errores_sistema(operacion);

alter table errores_sistema enable row level security;

-- Cualquier login autenticado puede loguear un error propio (mismo criterio
-- que horarios_profesor: login `profesor` compartido, sin restricción por
-- usuario) — pero solo admin puede leer el log, igual que registros_eliminados.
create policy "errores_sistema: insert autenticados" on errores_sistema
  for insert with check (auth.role() = 'authenticated');

create policy "errores_sistema: solo admin lee" on errores_sistema
  for select using (public.mi_rol() = 'admin');

-- ----------------------------------------------------------------
-- 3. RPC atómico: registrar_entrada_profesor
-- ----------------------------------------------------------------
create or replace function public.fn_registrar_entrada_profesor(
  p_profesor_id uuid,
  p_sucursal_id uuid,
  p_fecha date,
  p_hora_entrada time,
  p_modulo text default null
)
returns horarios_profesor
language plpgsql
security definer
as $$
declare
  v_turno horarios_profesor;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;

  -- Chequeo temprano: da un mensaje claro en el caso normal (sin carrera).
  -- No es la garantía de atomicidad — dos ejecuciones concurrentes pueden
  -- pasar este IF antes de que cualquiera haga el INSERT. La garantía real
  -- es el unique index del punto 1, capturado como unique_violation abajo.
  if exists (
    select 1 from horarios_profesor
    where profesor_id = p_profesor_id
      and fecha = p_fecha
      and hora_salida is null
  ) then
    raise exception 'TURNO_ABIERTO: el profesor ya tiene un turno abierto hoy.';
  end if;

  begin
    insert into horarios_profesor (profesor_id, sucursal_id, fecha, hora_entrada, hora_salida, modulo)
    values (p_profesor_id, p_sucursal_id, p_fecha, p_hora_entrada, null, p_modulo)
    returning * into v_turno;
  exception when unique_violation then
    raise exception 'TURNO_ABIERTO: el profesor ya tiene un turno abierto hoy.';
  end;

  return v_turno;
end;
$$;

-- ----------------------------------------------------------------
-- 4. Vista: turnos abiertos de días anteriores (huérfanos)
-- ----------------------------------------------------------------
create or replace view turnos_abiertos_prolongados as
select
  h.id,
  h.profesor_id,
  p.nombre as profesor_nombre,
  h.sucursal_id,
  s.nombre as sucursal_nombre,
  h.fecha,
  h.hora_entrada,
  h.modulo,
  (current_date - h.fecha) as dias_abierto
from horarios_profesor h
join profesores p on p.id = h.profesor_id
join sucursales s on s.id = h.sucursal_id
where h.hora_salida is null
  and h.fecha < current_date
  and public.mi_rol() = 'admin'
order by h.fecha asc;

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- -- 4a. Constraint único aplicado:
-- select indexname from pg_indexes
--   where tablename = 'horarios_profesor' and indexname = 'idx_horarios_profesor_turno_abierto_dia';
--
-- -- 4b. Constraint único probado (proxy secuencial — el índice rechaza el
-- --     segundo insert sin importar el orden/timing, así que esto ya prueba
-- --     lo mismo que probarlo con dos conexiones en paralelo):
-- --     reemplazar <un_profesor_id> y <una_sucursal_id> por ids reales.
-- begin;
--   insert into horarios_profesor (profesor_id, sucursal_id, fecha, hora_entrada)
--     values ('<un_profesor_id>', '<una_sucursal_id>', current_date, '09:00');
--   insert into horarios_profesor (profesor_id, sucursal_id, fecha, hora_entrada)
--     values ('<un_profesor_id>', '<una_sucursal_id>', current_date, '09:00');
--   -- esperado: el segundo INSERT falla con
--   -- "duplicate key value violates unique constraint idx_horarios_profesor_turno_abierto_dia"
-- rollback; -- deshace ambos inserts de prueba
--
-- -- 4c. Prueba de concurrencia real (opcional, más fiel al bug original):
-- --     abrir dos sesiones psql/SQL editor en paralelo y correr en cada una,
-- --     casi al mismo tiempo:
-- --     select fn_registrar_entrada_profesor('<un_profesor_id>', '<una_sucursal_id>', current_date, '09:00');
-- --     esperado: una de las dos sesiones devuelve el turno insertado, la otra
-- --     el error "TURNO_ABIERTO: el profesor ya tiene un turno abierto hoy."
--
-- -- 4d. RPC rechaza segunda entrada (secuencial, misma sesión):
-- select fn_registrar_entrada_profesor('<un_profesor_id>', '<una_sucursal_id>', current_date, '09:15');
-- select fn_registrar_entrada_profesor('<un_profesor_id>', '<una_sucursal_id>', current_date, '09:16');
-- -- esperado: la segunda llamada lanza el error TURNO_ABIERTO
-- -- (limpiar después: delete from horarios_profesor where profesor_id = '<un_profesor_id>' and fecha = current_date;)
--
-- -- 4e. Vista de huérfanos:
-- select * from turnos_abiertos_prolongados;
--
-- -- 4f. Log de errores accesible:
-- select operacion, profesor_id, detalle, created_at from errores_sistema order by created_at desc limit 10;
