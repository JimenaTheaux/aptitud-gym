-- ============================================================
-- APTITUD CENTRO — Migración 09: pagos.sucursal_id
-- (ya ejecutada en Supabase — este archivo es el registro histórico)
-- ============================================================

-- 1. pagos no tenía sucursal propia. Se agrega como dato del registro
--    (mismo criterio que asistencias.sucursal_id / alumnos.sucursal_alta_id),
--    contexto de sesión/dispositivo en el momento de registrar el pago.
alter table pagos add column sucursal_id uuid references sucursales(id);

-- 2. Backfill best-effort para pagos ya cargados: se usa la sucursal de
--    alta del alumno como aproximación, a falta de otro dato histórico.
--    Queda nullable — puede no coincidir con la sucursal real donde se
--    pagó, y alumnos sin sucursal_alta_id quedan en null.
update pagos p
set sucursal_id = a.sucursal_alta_id
from alumnos a
where p.alumno_id = a.id
  and p.sucursal_id is null;

-- No hace falta tocar RLS: "pagos: lectura autenticados" (migración 02)
-- ya no filtra por sucursal.

-- ============================================================
-- Verificación
-- ============================================================
-- select count(*) from pagos where sucursal_id is null; -- backfill incompleto, esperado si hay alumnos sin sucursal_alta_id
