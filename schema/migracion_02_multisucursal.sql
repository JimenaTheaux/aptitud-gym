-- ============================================================
-- APTITUD CENTRO — Migración 02: Multi-sucursal sin restricción por rol
-- Corrige el modelo: ningún usuario queda atado a una sola sucursal.
-- La sucursal es un dato del REGISTRO (asistencia/alumno), no del login.
--
-- IMPORTANTE: correr PARTE 1 y PARTE 2 por separado (2 ejecuciones
-- distintas en el SQL Editor). Postgres no permite usar un valor
-- de enum nuevo en la misma transacción donde se lo agrega.
-- ============================================================

-- ============================================================
-- PARTE 1 — ejecutar y esperar a que termine antes de seguir
-- ============================================================

-- Nuevo rol: kiosco (login "Alumnos" para check-in)
alter type rol_usuario add value 'kiosco';

-- perfiles.sucursal_id deja de ser obligatorio ni restrictivo:
-- se mantiene solo como "sucursal preferida" informativa (opcional).
alter table perfiles alter column sucursal_id drop not null;

-- alumnos.sucursal_id pasa a ser "sucursal de alta" (informativo):
-- un alumno puede asistir a las 2 sucursales, esto solo registra
-- dónde se autoregistró la primera vez.
alter table alumnos rename column sucursal_id to sucursal_alta_id;
alter table alumnos alter column sucursal_alta_id drop not null;

-- ============================================================
-- PARTE 2 — ejecutar después de que PARTE 1 haya terminado
-- ============================================================

-- Ya no hace falta esta función para RLS (se deja por si sirve
-- para default de UI, pero no se usa más en políticas)
-- (no se borra, no molesta)

-- --- Recrear policies sin restricción por sucursal ---

-- alumnos
drop policy if exists "alumnos: por sucursal" on alumnos;
drop policy if exists "alumnos: insert por sucursal" on alumnos;
create policy "alumnos: lectura autenticados" on alumnos
  for select using (auth.role() = 'authenticated');
create policy "alumnos: insert autenticados" on alumnos
  for insert with check (auth.role() = 'authenticated');
-- "alumnos: update admin" ya existe sin cambios

-- disciplinas
drop policy if exists "disciplinas: lectura por sucursal" on disciplinas;
create policy "disciplinas: lectura autenticados" on disciplinas
  for select using (auth.role() = 'authenticated');
-- "disciplinas: admin escribe" ya existe sin cambios

-- horarios_disciplina
drop policy if exists "horarios_disciplina: lectura" on horarios_disciplina;
create policy "horarios_disciplina: lectura autenticados" on horarios_disciplina
  for select using (auth.role() = 'authenticated');
-- "horarios_disciplina: admin escribe" ya existe sin cambios

-- asistencias
drop policy if exists "asistencias: por sucursal" on asistencias;
drop policy if exists "asistencias: insert por sucursal" on asistencias;
create policy "asistencias: lectura autenticados" on asistencias
  for select using (auth.role() = 'authenticated');
create policy "asistencias: insert autenticados" on asistencias
  for insert with check (auth.role() = 'authenticated');
-- "asistencias: update admin" ya existe sin cambios

-- cargos
drop policy if exists "cargos: lectura" on cargos;
drop policy if exists "cargos: insert" on cargos;
create policy "cargos: lectura autenticados" on cargos
  for select using (auth.role() = 'authenticated');
create policy "cargos: insert autenticados" on cargos
  for insert with check (auth.role() = 'authenticated');

-- pagos
drop policy if exists "pagos: lectura por sucursal" on pagos;
drop policy if exists "pagos: insert profesor/admin" on pagos;
create policy "pagos: lectura autenticados" on pagos
  for select using (auth.role() = 'authenticated');
create policy "pagos: insert propio" on pagos
  for insert with check (registrado_por = auth.uid());
-- validación sigue siendo SOLO vía fn_validar_pago (sin cambios)

-- whatsapp_envios
drop policy if exists "whatsapp_envios: lectura" on whatsapp_envios;
create policy "whatsapp_envios: lectura autenticados" on whatsapp_envios
  for select using (auth.role() = 'authenticated');
-- "whatsapp_envios: insert" (propio) ya existe sin cambios

-- ============================================================
-- Verificación post-migración
-- ============================================================
-- select unnest(enum_range(null::rol_usuario));           -- debe incluir 'kiosco'
-- select sucursal_id from perfiles limit 1;                -- puede ser null ahora
-- select sucursal_alta_id from alumnos limit 1;            -- puede ser null ahora
