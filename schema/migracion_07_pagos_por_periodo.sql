-- ============================================================
-- APTITUD CENTRO — Migración 07: pagos con período propio
-- + un solo cargo por alumno/período
-- (ya ejecutada en Supabase — este archivo es el registro histórico)
-- ============================================================

-- 1. Los pagos ahora llevan su propio período — ya no dependen
--    exclusivamente de tener un cargo_id asociado para saber a
--    qué mes corresponden. Esto permite que un pago impacte el
--    estado de cuenta ANTES de que exista el cargo (pago adelantado).
alter table pagos add column periodo text;

-- 2. Backfill: para pagos ya cargados que sí tienen cargo_id,
--    completar el período desde el cargo asociado.
update pagos p
set periodo = c.periodo
from cargos c
where p.cargo_id = c.id
  and p.periodo is null;

-- 3. Revisar manualmente si quedó algún pago sin período
--    (pagos adelantados viejos sin cargo_id). Completar a mano
--    antes de correr el paso 4.
-- select id, alumno_id, monto, created_at from pagos where periodo is null;

-- 4. NOT NULL — se corre en migracion_08, una vez confirmado que
--    no quedan pagos sin período (ver migracion_08_pagos_periodo_not_null.sql).

-- 5. Un solo cargo por alumno/período (evita duplicados)
alter table cargos add constraint uq_cargos_alumno_periodo unique (alumno_id, periodo);

-- ============================================================
-- Verificación
-- ============================================================
-- select count(*) from pagos where periodo is null; -- debe dar 0 antes del paso 4
