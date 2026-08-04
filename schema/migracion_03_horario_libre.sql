-- ============================================================
-- APTITUD CENTRO — Migración 03: Disciplinas de horario libre
-- + hora_fin opcional en horarios_disciplina
-- ============================================================

-- Disciplinas con horario libre (ej. musculación): no tienen franjas
-- horarias fijas, el alumno marca y queda la hora de entrada tal cual.
alter table disciplinas add column horario_libre boolean not null default false;

-- Para disciplinas con horario fijo, la hora de fin pasa a ser opcional
-- (hay clases que solo definen el horario de comienzo).
alter table horarios_disciplina alter column hora_fin drop not null;

-- Nota: cuando disciplinas.horario_libre = true, esa disciplina no
-- debería tener filas en horarios_disciplina (se controla desde la UI,
-- no con constraint de DB, para no sobre-restringir).

-- ============================================================
-- Verificación
-- ============================================================
-- select nombre, horario_libre from disciplinas;
-- select disciplina_id, dia_semana, hora_inicio, hora_fin from horarios_disciplina;
