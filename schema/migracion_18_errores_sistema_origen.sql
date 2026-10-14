-- ============================================================
-- APTITUD CENTRO — Migración 18: origen de cada error en errores_sistema
--
-- Motivación (reporte "turno noche", error "JWT issued at future"): el log
-- no permitía saber desde qué login/equipo se produjo un error ni si el
-- reloj del dispositivo estaba desfasado — creado_por nunca se completaba
-- (el cliente no lo enviaba y la columna no tenía default).
--
-- Hace 3 cosas:
-- 1. creado_por default auth.uid() — lo completa el server con el login
--    que hizo el INSERT, sin depender de que el cliente lo mande.
-- 2. cliente_ts timestamptz — reloj del dispositivo al momento del error.
--    created_at - cliente_ts = desfase del reloj del dispositivo.
-- 3. user_agent text — identifica navegador/equipo (ej. la tablet de una
--    sucursal), ya que el login `profesor` es compartido.
--
-- Columnas nullable: los errores ya registrados quedan en null, y un
-- cliente con el bundle anterior en cache sigue pudiendo insertar.
--
-- ORDEN DE DEPLOY: correr esta migración ANTES de desplegar el frontend —
-- el cliente nuevo envía cliente_ts/user_agent, y si las columnas no
-- existen el INSERT del log falla (en silencio: el log es best-effort).
-- ============================================================

alter table errores_sistema
  alter column creado_por set default auth.uid();

alter table errores_sistema
  add column if not exists cliente_ts timestamptz,
  add column if not exists user_agent text;

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- -- 18a. Default y columnas nuevas:
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_name = 'errores_sistema'
--   and column_name in ('creado_por', 'cliente_ts', 'user_agent');
-- -- esperado: creado_por con default auth.uid(); cliente_ts timestamptz; user_agent text
--
-- -- 18b. Después de provocar un error desde la app (ej. registrar salida
-- --      de un profesor sin turno abierto desde una pestaña con estado viejo):
-- select operacion, detalle, creado_por, cliente_ts, user_agent,
--        created_at - cliente_ts as desfase_reloj
-- from errores_sistema order by created_at desc limit 5;
-- -- esperado: creado_por, cliente_ts y user_agent completos
