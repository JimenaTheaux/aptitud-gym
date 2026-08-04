-- ============================================================
-- APTITUD CENTRO — Migración 07: horarios_profesor.sucursal_id
-- (ya ejecutada en Supabase — este archivo es el registro histórico,
-- redactado al construir la pantalla "Asistencia Profesores")
--
-- Hace 3 cosas:
-- 1. `sucursal_id` obligatorio en horarios_profesor — dato del registro,
--    mismo criterio que asistencias.sucursal_id / pagos.sucursal_id
--    (migración 09): contexto de sesión/dispositivo en el momento de
--    marcar entrada/salida, no restricción de acceso (ver doc 02).
--    Tabla vacía tras el reset de migración 06 — el NOT NULL no
--    necesita backfill.
-- 2. Fix de RLS (UPDATE/DELETE): la policy de UPDATE quedó admin-only
--    en la migración 06 ("horarios_profesor: update admin"), pero
--    "Registrar salida" lo hace el login `profesor` (compartido) con
--    un UPDATE sobre la fila que él mismo insertó — con la policy tal
--    cual, un profesor puede marcar entrada pero nunca su propia
--    salida. Se amplía para igualar el criterio ya usado en
--    INSERT/SELECT (auth.role() = 'authenticated', login compartido,
--    sin restricción por profesor_id ya que ahora referencia el
--    roster, no el login). También faltaba una policy de DELETE (la
--    pantalla de admin necesita poder borrar registros).
-- 3. Fix de RLS (INSERT/SELECT): verificado en Supabase que las policies
--    "insert autenticados"/"lectura autenticados" de la migración 06
--    nunca llegaron a aplicarse sobre esta tabla — seguían activas las
--    viejas de la migración 01 ("insert propio"/"propio o admin", con
--    profesor_id = auth.uid()). Con profesor_id apuntando ahora al
--    roster (no al login), ese WITH CHECK nunca matchea y el INSERT de
--    "Registrar entrada" queda bloqueado siempre. Se repite acá el DROP
--    + CREATE para que este archivo sea el registro fiel de lo que
--    quedó aplicado.
-- ============================================================

-- 1. sucursal_id
alter table horarios_profesor
  add column sucursal_id uuid references sucursales(id);

update horarios_profesor set sucursal_id = (select id from sucursales where activa limit 1)
  where sucursal_id is null; -- no-op esperado: tabla vacía tras migración 06

alter table horarios_profesor
  alter column sucursal_id set not null;

create index idx_horarios_profesor_sucursal on horarios_profesor(sucursal_id);

-- 2. RLS — permitir que el login profesor registre su propia salida (UPDATE),
--    y agregar policy de DELETE (solo admin, usada desde la tabla resumen).
drop policy if exists "horarios_profesor: update admin" on horarios_profesor;

create policy "horarios_profesor: update autenticados" on horarios_profesor
  for update using (auth.role() = 'authenticated');

create policy "horarios_profesor: delete admin" on horarios_profesor
  for delete using (public.mi_rol() = 'admin');

-- 3. RLS — reponer INSERT/SELECT de la migración 06, que en la práctica
--    nunca quedaron aplicados sobre esta tabla (ver punto 3 más arriba).
drop policy if exists "horarios_profesor: insert propio" on horarios_profesor;
drop policy if exists "horarios_profesor: propio o admin" on horarios_profesor;

create policy "horarios_profesor: lectura autenticados" on horarios_profesor
  for select using (auth.role() = 'authenticated');

create policy "horarios_profesor: insert autenticados" on horarios_profesor
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- select count(*) from horarios_profesor where sucursal_id is null; -- esperado: 0
-- select policyname, cmd from pg_policies where tablename = 'horarios_profesor';
-- -- esperado 4 filas: lectura autenticados (SELECT), insert autenticados (INSERT),
-- -- update autenticados (UPDATE), delete admin (DELETE)
