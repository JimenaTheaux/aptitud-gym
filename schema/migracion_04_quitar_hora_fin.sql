-- ============================================================
-- APTITUD CENTRO — Migración 04: Quitar hora_fin de horarios_disciplina
-- Los horarios de disciplina quedan definidos solo por hora_inicio.
-- ============================================================

alter table horarios_disciplina drop column hora_fin;

-- ============================================================
-- Verificación
-- ============================================================
-- select disciplina_id, dia_semana, hora_inicio from horarios_disciplina;
