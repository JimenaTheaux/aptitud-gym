-- ============================================================
-- APTITUD CENTRO — Migración 17: turnos noche (entrada/salida de
-- profesores calculadas en hora argentina, en el servidor)
--
-- Motivación (reporte "turno noche"): la fecha de la entrada y la búsqueda
-- del turno abierto dependían de "hoy" calculado en el cliente en UTC — desde
-- las 21:00 ART el turno abierto antes de esa hora desaparecía de la tarjeta,
-- el profesor no podía registrar la salida y quedaba un turno huérfano (o un
-- duplicado de 0-1 min fechado al día siguiente).
--
-- Hace 3 cosas:
-- 1. fn_registrar_entrada_profesor: fecha y hora con
--    now() AT TIME ZONE 'America/Argentina/Buenos_Aires', sin recibirlas del
--    cliente — deja de depender del reloj y de la zona del dispositivo.
--    Rechaza la entrada si el profesor tiene CUALQUIER turno abierto (no solo
--    de hoy), mismo criterio que las tarjetas, que pasan a mostrar los turnos
--    abiertos sin filtro de fecha.
-- 2. fn_registrar_salida_profesor(p_profesor_id): cierra el turno abierto más
--    reciente del profesor, sin filtrar por fecha (un turno noche que cruza la
--    medianoche se cierra igual). Hora calculada en servidor.
-- 3. Vista turnos_abiertos_prolongados: "prolongado" = abierto hace más de
--    14 h (antes: fecha < current_date en UTC, que entre 21:00 y 24:00 ART
--    marcaba como huérfano un turno abierto ese mismo día).
--
-- NO cambia el índice único idx_horarios_profesor_turno_abierto_dia
-- (profesor_id, fecha) — pasa a "un abierto por profesor" en la Fase B,
-- cuando la admin termine de cerrar los turnos huérfanos actuales.
--
-- PRECONDICIÓN DE DEPLOY: cerrar los turnos huérfanos actuales (Sistema →
-- Turnos abiertos prolongados) ANTES de desplegar el frontend nuevo. Si no,
-- las tarjetas los muestran "En turno" y un "Registrar salida" los cierra con
-- la hora de hoy.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Entrada — fecha/hora en servidor (ART)
-- ----------------------------------------------------------------
create or replace function public.fn_registrar_entrada_profesor(
  p_profesor_id uuid,
  p_sucursal_id uuid,
  p_modulo text default null
)
returns horarios_profesor
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ahora timestamp := now() at time zone 'America/Argentina/Buenos_Aires';
  v_turno horarios_profesor;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;

  -- Chequeo temprano: cualquier turno abierto del profesor, de cualquier
  -- fecha (un turno noche abierto ayer a las 23:30 sigue siendo "el turno
  -- en curso" a las 00:30). La garantía ante inserts concurrentes sigue
  -- siendo el unique index (por fecha hasta la Fase B), capturado abajo.
  if exists (
    select 1 from horarios_profesor
    where profesor_id = p_profesor_id
      and hora_salida is null
  ) then
    raise exception 'TURNO_ABIERTO: el profesor ya tiene un turno abierto.';
  end if;

  begin
    insert into horarios_profesor (profesor_id, sucursal_id, fecha, hora_entrada, hora_salida, modulo)
    values (
      p_profesor_id,
      p_sucursal_id,
      v_ahora::date,
      date_trunc('minute', v_ahora)::time,
      null,
      p_modulo
    )
    returning * into v_turno;
  exception when unique_violation then
    raise exception 'TURNO_ABIERTO: el profesor ya tiene un turno abierto.';
  end;

  return v_turno;
end;
$$;

-- Firma vieja (migración 16), que recibía fecha/hora del cliente. Se
-- conserva SOLO como compatibilidad mientras quede alguna PWA con el bundle
-- anterior en cache: ignora p_fecha/p_hora_entrada y delega en la nueva, así
-- incluso esos clientes registran con hora del servidor. Borrar en la Fase B:
--   drop function public.fn_registrar_entrada_profesor(uuid, uuid, date, time, text);
create or replace function public.fn_registrar_entrada_profesor(
  p_profesor_id uuid,
  p_sucursal_id uuid,
  p_fecha date,
  p_hora_entrada time,
  p_modulo text default null
)
returns horarios_profesor
language sql
security definer
set search_path = public
as $$
  select public.fn_registrar_entrada_profesor(p_profesor_id, p_sucursal_id, p_modulo);
$$;

-- ----------------------------------------------------------------
-- 2. Salida — cierra el turno abierto más reciente del profesor
-- ----------------------------------------------------------------
create or replace function public.fn_registrar_salida_profesor(
  p_profesor_id uuid
)
returns horarios_profesor
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ahora timestamp := now() at time zone 'America/Argentina/Buenos_Aires';
  v_turno horarios_profesor;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;

  -- Sin filtro de fecha: el turno en curso puede ser de ayer (cruce de
  -- medianoche). FOR UPDATE bloquea la fila para que dos salidas
  -- simultáneas (dos dispositivos) no cierren el mismo turno dos veces.
  select * into v_turno
  from horarios_profesor
  where profesor_id = p_profesor_id
    and hora_salida is null
  order by fecha desc, hora_entrada desc nulls last
  limit 1
  for update;

  if not found then
    raise exception 'SIN_TURNO_ABIERTO: el profesor no tiene un turno abierto para cerrar.';
  end if;

  update horarios_profesor
  set hora_salida = date_trunc('minute', v_ahora)::time
  where id = v_turno.id
  returning * into v_turno;

  return v_turno;
end;
$$;

-- ----------------------------------------------------------------
-- 3. Vista: turnos abiertos hace más de 14 h (huérfanos)
-- ----------------------------------------------------------------
-- Mismas columnas y orden que la migración 16 (create or replace view no
-- permite cambiarlas, y TurnoAbiertoProlongado en el front las espera así).
-- (fecha + hora_entrada) es un timestamp "de pared" ART; AT TIME ZONE lo
-- convierte al instante real para compararlo con now().
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
  ((now() at time zone 'America/Argentina/Buenos_Aires')::date - h.fecha) as dias_abierto
from horarios_profesor h
join profesores p on p.id = h.profesor_id
join sucursales s on s.id = h.sucursal_id
where h.hora_salida is null
  and ((h.fecha + coalesce(h.hora_entrada, time '00:00')) at time zone 'America/Argentina/Buenos_Aires')
      < now() - interval '14 hours'
  and public.mi_rol() = 'admin'
order by h.fecha asc;

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- Desde el SQL Editor auth.uid() es null — simular un usuario autenticado
-- dentro de una transacción con rollback. Reemplazar <...> por ids reales;
-- usar un profesor SIN turnos abiertos.
--
-- begin;
--   select set_config('request.jwt.claims',
--     '{"sub":"<un_perfil_id>","role":"authenticated"}', true);
--
--   -- 17a. Entrada: fecha/hora = ahora en ART
--   select fecha, hora_entrada,
--          (now() at time zone 'America/Argentina/Buenos_Aires') as ahora_art
--   from fn_registrar_entrada_profesor('<un_profesor_id>', '<una_sucursal_id>');
--
--   -- 17b. Segunda entrada → error TURNO_ABIERTO
--   -- select fn_registrar_entrada_profesor('<un_profesor_id>', '<una_sucursal_id>');
--
--   -- 17c. Salida cierra esa misma fila (mismo id que 17a)
--   select id, fecha, hora_entrada, hora_salida
--   from fn_registrar_salida_profesor('<un_profesor_id>');
--
--   -- 17d. Segunda salida → error SIN_TURNO_ABIERTO
--   -- select fn_registrar_salida_profesor('<un_profesor_id>');
--
--   -- 17e. Cruce de medianoche: turno de ayer 23:30 abierto → la salida lo cierra
--   insert into horarios_profesor (profesor_id, sucursal_id, fecha, hora_entrada)
--   values ('<un_profesor_id>', '<una_sucursal_id>',
--           (now() at time zone 'America/Argentina/Buenos_Aires')::date - 1, '23:30');
--   select fecha, hora_entrada, hora_salida from fn_registrar_salida_profesor('<un_profesor_id>');
--
--   -- 17f. Firma vieja (compatibilidad) ignora fecha/hora del cliente
--   select fecha, hora_entrada
--   from fn_registrar_entrada_profesor('<un_profesor_id>', '<una_sucursal_id>', '2000-01-01', '03:00');
--   -- esperado: fecha/hora de ahora en ART, no 2000-01-01 03:00
-- rollback;
--
-- -- 17g. Vista: solo turnos abiertos hace más de 14 h
-- select * from turnos_abiertos_prolongados;
