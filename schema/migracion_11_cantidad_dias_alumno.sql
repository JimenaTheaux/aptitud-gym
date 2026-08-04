-- ============================================================
-- APTITUD CENTRO — Migración 11: cantidad de días del alumno
-- Ya ejecutada manualmente en Supabase antes de crear este archivo;
-- se agrega acá para dejar registro en el historial de migraciones.
-- ============================================================

-- Referencia opcional de cuántos días por semana asiste el alumno (2 / 3 / 5
-- / pase libre). No dispara ninguna lógica automática de precio — es solo un
-- dato de referencia visible al generar cargos (ver doc 04).
alter table alumnos
  add column cantidad_dias text
  check (cantidad_dias in ('2', '3', '5', 'pase_libre'));

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- select column_name, data_type from information_schema.columns
--   where table_name = 'alumnos' and column_name = 'cantidad_dias';
