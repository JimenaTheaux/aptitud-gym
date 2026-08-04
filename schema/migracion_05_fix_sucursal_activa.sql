-- ============================================================
-- APTITUD CENTRO — Migración 05: Corrige sucursales.activa
-- El flag había quedado invertido: la sucursal realmente operativa
-- en Fase 1 tenía activa=false y la otra (sin uso todavía) activa=true.
-- ============================================================

update sucursales set activa = not activa;

-- ============================================================
-- Verificación
-- ============================================================
-- select id, nombre, activa from sucursales order by nombre;
-- Confirmar a mano que la sucursal operativa en Fase 1 quedó con activa=true.
