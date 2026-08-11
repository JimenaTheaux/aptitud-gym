-- ============================================================
-- APTITUD CENTRO — Migración 14: UPDATE de pagos (admin)
-- Ya ejecutada manualmente en Supabase antes de crear este archivo;
-- se agrega acá para dejar registro en el historial de migraciones.
-- ============================================================

-- Antes solo se podía tocar `pagos` vía fn_validar_pago (RPC) — no había
-- forma de editar el resto de los campos de un pago ya cargado. Habilita
-- "Editar pago" en Pendientes de validar / Historial y estado de cuenta.
create policy "pagos: update admin" on pagos
  for update using (public.mi_rol() = 'admin');

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- select policyname, cmd from pg_policies where tablename = 'pagos';
