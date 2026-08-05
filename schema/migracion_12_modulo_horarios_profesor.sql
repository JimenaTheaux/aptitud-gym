-- ============================================================
-- APTITUD CENTRO — Migración 12: módulo (2hs/3hs) en horarios_profesor
-- Ya ejecutada manualmente en Supabase antes de crear este archivo;
-- se agrega acá para dejar registro en el historial de migraciones.
-- ============================================================

-- Ciertos profesores, en algunos turnos, marcan si hicieron un módulo de 2 o
-- 3 horas antes de registrar la entrada. Es opcional y se vuelve a elegir en
-- cada turno — no queda fijo por profesor ni se autocompleta del turno
-- anterior (ver doc 04, sección 3).
alter table horarios_profesor
  add column modulo text
  check (modulo in ('2hs', '3hs'));

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- select column_name, data_type from information_schema.columns
--   where table_name = 'horarios_profesor' and column_name = 'modulo';
