-- ============================================================
-- APTITUD CENTRO — Migración 15: UPDATE de cargos (admin) +
-- DELETE de pagos (admin)
-- Ejecutar completo en Supabase → SQL Editor
-- ============================================================

-- 1. "Editar cargos" (Historial y estado de cuenta) — un cargo ya generado
--    no se podía tocar desde la app, solo crear. El monto sigue siendo
--    snapshot al crearse (doc 06); esto es una corrección manual del admin,
--    no un recálculo automático de precio "vivo".
create policy "cargos: update admin" on cargos
  for update using (public.mi_rol() = 'admin');

-- 2. "Eliminar pagos" (Pendientes de validar / Historial y estado de
--    cuenta) — el trigger de auditoría (fn_log_eliminacion, migración 13)
--    ya está instalado en `pagos` (trg_log_eliminacion_pagos), así que el
--    borrado queda registrado en registros_eliminados sin cambios
--    adicionales. Solo faltaba esta policy.
create policy "pagos: delete admin" on pagos
  for delete using (public.mi_rol() = 'admin');

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- select policyname, cmd from pg_policies where tablename = 'cargos';
-- select policyname, cmd from pg_policies where tablename = 'pagos';
