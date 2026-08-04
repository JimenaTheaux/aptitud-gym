-- ============================================================
-- APTITUD CENTRO — Migración 08: forzar NOT NULL en pagos.periodo
-- ============================================================
-- El SELECT de verificación de la migración 07 encontró 1 fila
-- vieja sin período (dato de prueba, sin datos reales en juego).
-- Se borra esa fila y se fuerza el NOT NULL de una vez.

delete from pagos where periodo is null;

alter table pagos alter column periodo set not null;

-- ============================================================
-- Verificación
-- ============================================================
-- select count(*) from pagos where periodo is null; -- debe dar 0
