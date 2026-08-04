-- ============================================================
-- APTITUD CENTRO — Migración 06: Profesor puede editar alumnos
-- Hasta ahora "alumnos: update admin" restringía el UPDATE a admin.
-- El profesor también necesita poder corregir datos del alumno
-- (celular, consideraciones, etc.) desde la vista de Alumnos.
-- ============================================================

drop policy if exists "alumnos: update admin" on alumnos;

create policy "alumnos: update admin/profesor" on alumnos
  for update using (public.mi_rol() in ('admin', 'profesor'));

-- ============================================================
-- Verificación
-- ============================================================
-- select policyname, cmd, roles from pg_policies where tablename = 'alumnos';
